const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Standard-time UTC offsets (hours). Actual offset may shift by about 1 hour
// depending on the time of year due to daylight saving time at either end.
const ORIGINS = {
  'us-eastern': { label: 'US Eastern (New York, Miami)', offset: -5 },
  'us-central': { label: 'US Central (Chicago, Dallas)', offset: -6 },
  'us-mountain': { label: 'US Mountain (Denver, Phoenix)', offset: -7 },
  'us-pacific': { label: 'US Pacific (Los Angeles, Seattle)', offset: -8 },
  'us-alaska': { label: 'US Alaska', offset: -9 },
  'us-hawaii': { label: 'US Hawaii', offset: -10 },
};

const DESTINATIONS = {
  paris: { name: 'Paris', offset: 1 }, london: { name: 'London', offset: 0 }, rome: { name: 'Rome', offset: 1 },
  barcelona: { name: 'Barcelona', offset: 1 }, amsterdam: { name: 'Amsterdam', offset: 1 }, lisbon: { name: 'Lisbon', offset: 0 },
  dublin: { name: 'Dublin', offset: 0 }, athens: { name: 'Athens', offset: 2 }, reykjavik: { name: 'Reykjavik', offset: 0 },
  madrid: { name: 'Madrid', offset: 1 }, venice: { name: 'Venice', offset: 1 }, prague: { name: 'Prague', offset: 1 },
  vienna: { name: 'Vienna', offset: 1 }, berlin: { name: 'Berlin', offset: 1 }, santorini: { name: 'Santorini', offset: 2 },
  zurich: { name: 'Zurich', offset: 1 }, munich: { name: 'Munich', offset: 1 }, milan: { name: 'Milan', offset: 1 },
  copenhagen: { name: 'Copenhagen', offset: 1 }, stockholm: { name: 'Stockholm', offset: 1 }, budapest: { name: 'Budapest', offset: 1 },
  istanbul: { name: 'Istanbul', offset: 3 }, edinburgh: { name: 'Edinburgh', offset: 0 }, nice: { name: 'Nice', offset: 1 },
  tokyo: { name: 'Tokyo', offset: 9 }, bangkok: { name: 'Bangkok', offset: 7 }, bali: { name: 'Bali', offset: 8 },
  singapore: { name: 'Singapore', offset: 8 }, seoul: { name: 'Seoul', offset: 9 }, 'hong-kong': { name: 'Hong Kong', offset: 8 },
  sydney: { name: 'Sydney', offset: 10 }, auckland: { name: 'Auckland', offset: 12 }, 'ho-chi-minh-city': { name: 'Ho Chi Minh City', offset: 7 },
  manila: { name: 'Manila', offset: 8 }, phuket: { name: 'Phuket', offset: 7 }, 'kuala-lumpur': { name: 'Kuala Lumpur', offset: 8 },
  beijing: { name: 'Beijing', offset: 8 }, delhi: { name: 'Delhi', offset: 5.5 }, maldives: { name: 'Maldives', offset: 5 },
  taipei: { name: 'Taipei', offset: 8 }, colombo: { name: 'Colombo', offset: 5.5 }, 'siem-reap': { name: 'Siem Reap', offset: 7 },
  fiji: { name: 'Fiji', offset: 12 }, 'bora-bora': { name: 'Bora Bora', offset: -10 },
  cancun: { name: 'Cancún', offset: -5 }, 'punta-cana': { name: 'Punta Cana', offset: -4 }, 'san-juan': { name: 'San Juan', offset: -4 },
  nassau: { name: 'Nassau', offset: -5 }, 'montego-bay': { name: 'Montego Bay', offset: -5 }, 'cabo-san-lucas': { name: 'Cabo San Lucas', offset: -7 },
  aruba: { name: 'Aruba', offset: -4 }, 'turks-and-caicos': { name: 'Turks and Caicos', offset: -5 }, 'st-lucia': { name: 'St. Lucia', offset: -4 },
  'san-jose-costa-rica': { name: 'San José', offset: -6 },
  vancouver: { name: 'Vancouver', offset: -8 }, toronto: { name: 'Toronto', offset: -5 }, montreal: { name: 'Montreal', offset: -5 },
  'quebec-city': { name: 'Quebec City', offset: -5 }, calgary: { name: 'Calgary', offset: -7 },
  dubai: { name: 'Dubai', offset: 4 }, marrakech: { name: 'Marrakech', offset: 1 }, 'cape-town': { name: 'Cape Town', offset: 2 },
  'rio-de-janeiro': { name: 'Rio de Janeiro', offset: -3 }, 'buenos-aires': { name: 'Buenos Aires', offset: -3 }, bogota: { name: 'Bogotá', offset: -5 },
  lima: { name: 'Lima', offset: -5 }, cusco: { name: 'Cusco', offset: -5 }, santiago: { name: 'Santiago', offset: -4 }, cartagena: { name: 'Cartagena', offset: -5 },
  'panama-city': { name: 'Panama City', offset: -5 }, 'belize-city': { name: 'Belize City', offset: -6 }, 'grand-cayman': { name: 'Grand Cayman', offset: -5 },
  antigua: { name: 'Antigua', offset: -4 }, curacao: { name: 'Curaçao', offset: -4 },
  doha: { name: 'Doha', offset: 3 }, 'tel-aviv': { name: 'Tel Aviv', offset: 2 }, 'abu-dhabi': { name: 'Abu Dhabi', offset: 4 },
  zanzibar: { name: 'Zanzibar', offset: 3 }, nairobi: { name: 'Nairobi', offset: 3 }, casablanca: { name: 'Casablanca', offset: 1 },
};

function normalizeDiff(diff) {
  // Wrap into -12..+12 range — e.g. +14 is really -10 the "short way around".
  let d = diff;
  while (d > 12) d -= 24;
  while (d < -12) d += 24;
  return d;
}

function computeResult({ origin, destination }) {
  const originData = ORIGINS[origin];
  const destData = DESTINATIONS[destination];
  if (!originData) throw new Error('Unknown origin');
  if (!destData) throw new Error('Unknown destination');

  const rawDiff = destData.offset - originData.offset;
  const diff = normalizeDiff(rawDiff);
  const hoursCrossed = Math.abs(diff);
  const direction = diff > 0 ? 'eastward' : diff < 0 ? 'westward' : 'none';

  const recoveryDays = direction === 'eastward'
    ? Math.ceil(hoursCrossed)
    : Math.ceil(hoursCrossed * 0.67);

  let headline;
  if (hoursCrossed < 3) {
    headline = `Only a ${hoursCrossed}-hour difference — most travelers barely notice jet lag on this route.`;
  } else {
    headline = `You're flying ${direction} across ${hoursCrossed} time zones — expect roughly ${recoveryDays} day${recoveryDays === 1 ? '' : 's'} to fully adjust.`;
  }

  return {
    origin, originLabel: originData.label, originOffset: originData.offset,
    destination, destinationName: destData.name, destinationOffset: destData.offset,
    hoursCrossed, direction, recoveryDays, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/jet-lag-calculator/calculate
// @access Public
exports.calculateJetLag = (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) return res.status(400).json({ success: false, error: 'origin and destination are required' });
    const result = computeResult({ origin, destination });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a day-by-day PDF, send confirmation email
// @route POST /api/tools/jet-lag-calculator/pdf
// @access Public
exports.generateJetLagPdf = async (req, res) => {
  try {
    const { email, firstName, origin, destination } = req.body;
    if (!email || !origin || !destination) {
      return res.status(400).json({ success: false, error: 'email, origin, and destination are required' });
    }

    const result = computeResult({ origin, destination });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['jet-lag-calculator', firstName || null, 'jet-lag-calculator',
        JSON.stringify({ origin, destination }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`Jet Lag Recovery Plan — ${result.originLabel} to ${result.destinationName}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="jet-lag-calculator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `Flying ${result.direction} generally takes longer to adjust to than flying the other direction, since it's easier for your body clock to delay (stay up later) than to advance (fall asleep earlier). Crossing ${result.hoursCrossed} time zones ${result.direction} puts you at roughly ${result.recoveryDays} day${result.recoveryDays === 1 ? '' : 's'} to feel fully adjusted.`);

    pdfService.highlightBox(doc, `${result.originLabel} → ${result.destinationName}: ${result.hoursCrossed}h ${result.direction}, ~${result.recoveryDays} day${result.recoveryDays === 1 ? '' : 's'} to adjust`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, result.direction === 'eastward' ? [
      'Start shifting your sleep and meal times 1-2 hours earlier each day for 2-3 days before departure.',
      'Get bright light exposure in the morning and avoid screens/bright light in the evening in the days before you leave.',
      'Book a flight that arrives in the morning or early afternoon at your destination if possible.',
    ] : [
      'Start shifting your sleep and meal times 1-2 hours later each day for 2-3 days before departure, if your schedule allows.',
      'Get bright light exposure in the evening in the days before you leave.',
      'Westward jet lag is generally easier — most people adjust within a few days without much preparation.',
    ]);

    pdfService.heading(doc, 'On the flight and on arrival');
    pdfService.bulletList(doc, [
      'Set your watch to destination time as soon as you board, and try to eat and sleep on that schedule during the flight.',
      'Stay hydrated and limit alcohol and caffeine, both of which make jet lag worse.',
      `Once you land, get outside and into daylight during ${result.direction === 'eastward' ? 'the morning' : 'the afternoon/evening'} to help reset your body clock faster.`,
      'Avoid long naps on your first day — a short 20-30 minute nap is fine, but longer naps delay adjustment.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🕐 Your jet lag recovery plan: ${result.originLabel} → ${result.destinationName}`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your jet lag estimate:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond jet lag prep? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send jet-lag-calculator confirmation email:', err.message));

  } catch (error) {
    console.error('generateJetLagPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.ORIGINS = ORIGINS;
exports.DESTINATIONS = DESTINATIONS;
