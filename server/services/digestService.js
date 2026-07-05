const pool = require('../config/database');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';

function wrapEmail(body, unsubToken) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <tr><td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:600px;">
          <tr><td style="padding:40px;color:#1f2937;line-height:1.6;">
            ${body}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
            <p style="font-size:12px;color:#9ca3af;">
              You received this as a TravelSmarter member.<br>
              <a href="${appUrl}/account.html" style="color:#667eea;text-decoration:none;">Manage preferences</a> |
              <a href="${appUrl}/unsubscribe.html?token=${unsubToken}" style="color:#667eea;text-decoration:none;">Unsubscribe</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `;
}

async function getEligibleUsers() {
  const r = await pool.query(`
    SELECT id, email, first_name, unsubscribe_token
    FROM users
    WHERE subscription_tier IN ('smart_traveler', 'elite')
      AND (email_marketing_opt_out IS NULL OR email_marketing_opt_out = false)
      AND email IS NOT NULL
  `);
  return r.rows;
}

/**
 * Send an alert email when a new partner deal is added.
 * Called automatically after POST /api/partner-deals.
 */
async function sendDealAlert(deal) {
  try {
    const users = await getEligibleUsers();
    console.log(`📧 Sending deal alert for "${deal.title}" to ${users.length} users`);

    let sent = 0;
    for (const user of users) {
      try {
        const body = `
          <div style="background:linear-gradient(135deg,#1a2744 0%,#2d3f6b 100%);border-radius:10px;padding:30px;text-align:center;margin-bottom:28px;">
            <div style="font-size:40px;margin-bottom:8px;">🤝</div>
            <h1 style="color:white;font-size:22px;margin:0;">New Partner Deal</h1>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Exclusive for TravelSmarter members</p>
          </div>
          <p>Hi ${user.first_name || 'Traveler'},</p>
          <p>We just added a new exclusive deal to your Partner Deals section:</p>
          <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:10px;padding:24px;margin:20px 0;">
            ${deal.discount_badge ? `<div style="display:inline-block;background:#ff6b4a;color:white;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;margin-bottom:12px;">${deal.discount_badge}</div><br>` : ''}
            <h2 style="color:#1a2744;margin:0 0 8px;font-size:20px;">${deal.title}</h2>
            <p style="color:#6b7280;margin:0 0 20px;line-height:1.6;">${deal.description}</p>
            <a href="${appUrl}/partner-deals.html" style="display:inline-block;background:#1a2744;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View This Deal →</a>
          </div>
          <p style="color:#9ca3af;font-size:13px;">Exclusive for Smart Traveler &amp; Elite members.</p>
        `;

        await emailService.sendEmail({
          to: user.email,
          subject: `🤝 New Deal: ${deal.title}${deal.discount_badge ? ` — ${deal.discount_badge}` : ''}`,
          html: wrapEmail(body, user.unsubscribe_token)
        });
        sent++;
      } catch (err) {
        console.error(`❌ Deal alert failed for ${user.email}:`, err.message);
      }
    }

    console.log(`✅ Deal alert sent to ${sent}/${users.length} users`);
    return { sent, total: users.length };
  } catch (err) {
    console.error('❌ sendDealAlert error:', err);
    throw err;
  }
}

/**
 * Trigger a 3-day hack digest.
 * Picks the 3 most recently updated active hacks and schedules one email
 * per day (today, tomorrow, day after) for all Smart Traveler + Elite users.
 * Called manually from the admin dashboard.
 */
async function triggerHackDigest() {
  try {
    // Get top 3 most recently updated hacks
    const hacksResult = await pool.query(`
      SELECT id, module_id, title, description, category, difficulty, avg_savings_euros
      FROM hacks
      WHERE is_active = true
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 3
    `);
    const hacks = hacksResult.rows;
    if (hacks.length === 0) return { success: false, error: 'No active hacks found' };

    const users = await getEligibleUsers();
    if (users.length === 0) return { success: false, error: 'No eligible users found' };

    // Get the existing welcome sequence ID to attach templates to
    const seqResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = 'Welcome Email Sequence' LIMIT 1`
    );
    const sequenceId = seqResult.rows[0]?.id;
    if (!sequenceId) return { success: false, error: 'Email sequence not found in database' };

    // Create one-time templates for this digest batch
    const templateIds = [];
    for (let i = 0; i < hacks.length; i++) {
      const hack = hacks[i];
      const savings = hack.avg_savings_euros ? `Save up to $${Math.round(hack.avg_savings_euros)}` : null;
      const moduleLabels = {
        1:'Flight Hacking',2:'Credit Cards',3:'Hotel Hacking',4:'Timing Intelligence',
        5:'Airport & Transit',6:'Destinations',7:'Car Rentals',8:'Community',
        9:'Travel Money',10:'Travel Insurance',11:'Visa & Immigration',12:'Accommodations',
        13:'Ground Transport',14:'Travel Bookings',15:'Food & Dining',16:'Shopping & VAT'
      };
      const moduleLabel = moduleLabels[hack.module_id] || 'Travel Hack';

      const html = `
        <div style="background:linear-gradient(135deg,#1a2744 0%,#2d3f6b 100%);border-radius:10px;padding:28px;text-align:center;margin-bottom:28px;">
          <div style="font-size:36px;margin-bottom:8px;">✨</div>
          <h1 style="color:white;font-size:20px;margin:0;">Weekly Hack Digest</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Top Travel Hack ${i + 1} of ${hacks.length}</p>
        </div>
        <p>Hi {firstName},</p>
        <p>Here's one of our best recently updated travel hacks — ready to save you money on your next trip:</p>
        <div style="background:#f0f4ff;border-left:4px solid #667eea;border-radius:8px;padding:24px;margin:20px 0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#667eea;margin-bottom:8px;">${moduleLabel}</div>
          <h2 style="color:#1a2744;margin:0 0 10px;font-size:20px;">${hack.title}</h2>
          <p style="color:#374151;margin:0 0 16px;line-height:1.6;">${hack.description}</p>
          ${savings ? `<div style="display:inline-block;background:#10b981;color:white;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">${savings}</div>` : ''}
        </div>
        <div style="text-align:center;margin-top:24px;">
          <a href="{appUrl}" style="display:inline-block;background:#667eea;color:white;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Explore All Hacks →</a>
        </div>
        ${hacks.length - i - 1 > 0 ? `<p style="color:#9ca3af;font-size:13px;margin-top:20px;text-align:center;">${hacks.length - i - 1} more hack${hacks.length - i - 1 > 1 ? 's' : ''} coming tomorrow.</p>` : '<p style="color:#9ca3af;font-size:13px;margin-top:20px;text-align:center;">That\'s all for this digest — happy travels! 🌍</p>'}
      `;

      const templateId = uuidv4();
      await pool.query(
        `INSERT INTO email_templates (id, sequence_id, day, subject, content, html_content, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)`,
        [templateId, sequenceId, 9000 + i, `✨ Travel Hack #${i + 1}: ${hack.title}`, hack.description, html]
      );
      templateIds.push(templateId);
    }

    // Schedule emails for all eligible users
    let scheduled = 0;
    for (const user of users) {
      for (let i = 0; i < templateIds.length; i++) {
        const sendAt = new Date();
        sendAt.setDate(sendAt.getDate() + i);
        sendAt.setHours(9, 0, 0, 0);

        await pool.query(
          `INSERT INTO scheduled_emails (user_id, template_id, scheduled_at, status, created_at)
           VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)`,
          [user.id, templateIds[i], sendAt]
        );
        scheduled++;
      }
    }

    console.log(`✅ Hack digest triggered: ${hacks.length} hacks × ${users.length} users = ${scheduled} emails scheduled`);
    return {
      success: true,
      hacks: hacks.map(h => h.title),
      usersTargeted: users.length,
      emailsScheduled: scheduled
    };
  } catch (err) {
    console.error('❌ triggerHackDigest error:', err);
    throw err;
  }
}

module.exports = { sendDealAlert, triggerHackDigest };
