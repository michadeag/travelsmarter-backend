const pool = require('../config/database');

let amadeusToken = null;
let tokenExpiry = 0;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < tokenExpiry) return amadeusToken;

  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  if (!key || !secret) throw new Error('Amadeus credentials not configured');

  const res = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Amadeus auth failed: ' + JSON.stringify(data));

  amadeusToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return amadeusToken;
}

// Get cheapest available price for a route in a given month
async function getCheapestPrice(origin, destination, travelMonth) {
  const token = await getAmadeusToken();

  // Search on the 15th of the travel month as a representative date
  const departureDate = `${travelMonth}-15`;
  const returnDate = `${travelMonth}-22`;

  const url = `https://api.amadeus.com/v2/shopping/flight-offers?` +
    `originLocationCode=${origin}&destinationLocationCode=${destination}` +
    `&departureDate=${departureDate}&returnDate=${returnDate}` +
    `&adults=1&max=5&currencyCode=USD&nonStop=false`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amadeus API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (!data.data || data.data.length === 0) return null;

  // Find cheapest offer
  const prices = data.data.map(o => parseFloat(o.price.grandTotal));
  return Math.min(...prices);
}

// Ensure flight_alerts table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS flight_alerts (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      origin VARCHAR(3) NOT NULL,
      origin_name VARCHAR(100),
      destination VARCHAR(3) NOT NULL,
      destination_name VARCHAR(100),
      travel_month VARCHAR(7) NOT NULL,
      target_price DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      current_price DECIMAL(10,2),
      last_checked_at TIMESTAMP,
      notified BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
ensureTable().catch(console.error);

// Run the daily price check for all active alerts
async function runDailyPriceCheck() {
  console.log('[FlightAlerts] Starting daily price check...');
  const sgMail = require('@sendgrid/mail');
  if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const alerts = await pool.query(`
    SELECT fa.*, u.email, u.first_name
    FROM flight_alerts fa
    JOIN users u ON fa.user_id = u.id
    WHERE fa.active = true AND u.is_active = true
    ORDER BY fa.created_at ASC
  `);

  let checked = 0, notified = 0, errors = 0;
  const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';

  for (const alert of alerts.rows) {
    try {
      const price = await getCheapestPrice(alert.origin, alert.destination, alert.travel_month);

      await pool.query(
        `UPDATE flight_alerts SET current_price = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [price, alert.id]
      );
      checked++;

      if (price !== null && price <= alert.target_price && !alert.notified) {
        const monthLabel = new Date(alert.travel_month + '-01')
          .toLocaleString('en-US', { month: 'long', year: 'numeric' });

        const savings = Math.round(alert.target_price - price);

        await sgMail.send({
          to: alert.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@travelsmarterapp.com',
          subject: `✈️ Price Alert: ${alert.origin} → ${alert.destination} dropped to $${Math.round(price)}`,
          html: `
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <tr><td align="center" style="padding:40px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:600px;">
                  <tr><td style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
                    <div style="font-size:2.5em;">✈️</div>
                    <h1 style="color:white;margin:12px 0 4px;font-size:1.6em;">Price Alert Triggered!</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:0;">${alert.origin} → ${alert.destination} • ${monthLabel}</p>
                  </td></tr>
                  <tr><td style="padding:32px;color:#1f2937;line-height:1.6;">
                    <p>Hi ${alert.first_name || 'Traveler'},</p>
                    <p>Good news — the price you were watching just dropped below your target.</p>
                    <div style="background:#f0fdf4;border:2px solid #10b981;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                      <div style="color:#6b7280;font-size:14px;margin-bottom:4px;">Current Price</div>
                      <div style="font-size:3em;font-weight:800;color:#10b981;">$${Math.round(price)}</div>
                      <div style="color:#6b7280;font-size:14px;margin-top:4px;">Your target was $${Math.round(alert.target_price)} — you're saving ~$${savings}</div>
                    </div>
                    <p style="text-align:center;"><strong>${alert.origin_name || alert.origin} → ${alert.destination_name || alert.destination}</strong><br>
                    Travel month: ${monthLabel}</p>
                    <p style="color:#6b7280;font-size:14px;">Prices can change within hours. Book now to lock in this rate.</p>
                    <div style="text-align:center;margin-top:24px;">
                      <a href="https://www.google.com/flights#search;f=${alert.origin};t=${alert.destination}"
                         style="background:#667eea;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;">
                        🔍 Search Flights Now →
                      </a>
                    </div>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
                    <p style="font-size:12px;color:#9ca3af;">
                      You set this alert on TravelSmarter. <a href="${appUrl}" style="color:#667eea;">Manage your alerts →</a>
                    </p>
                  </td></tr>
                </table>
              </td></tr>
            </table>`
        });

        await pool.query(
          `UPDATE flight_alerts SET notified = true WHERE id = $1`,
          [alert.id]
        );
        notified++;
      }

      // Rate limit — Amadeus free tier allows ~10 req/s
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`[FlightAlerts] Error checking alert ${alert.id}:`, err.message);
      errors++;
    }
  }

  console.log(`[FlightAlerts] Done: ${checked} checked, ${notified} notified, ${errors} errors`);
  return { checked, notified, errors };
}

module.exports = { getCheapestPrice, runDailyPriceCheck, ensureTable };
