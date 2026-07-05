const pool = require('../config/database');
const emailService = require('../services/emailService');

function wrap(body) {
  const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;">
    <div style="background:#1a2744;padding:24px 32px;border-radius:10px 10px 0 0;text-align:center;">
      <span style="color:#ff6b4a;font-size:20px;font-weight:700;">✈️ TravelSmarter</span>
    </div>
    <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
      ${body}
      <hr style="margin:32px 0 20px;border:none;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        © 2026 TravelSmarter &nbsp;·&nbsp;
        <a href="${appUrl}/auth.html" style="color:#9ca3af;">Sign in</a> &nbsp;·&nbsp;
        <a href="${appUrl}/sales-page.html" style="color:#9ca3af;">Plans</a> &nbsp;·&nbsp;
        <a href="${appUrl}/unsubscribe.html" style="color:#9ca3af;">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

const TEMPLATES = [
  {
    id: 'checkin',
    name: 'Check-in: How is it going?',
    subject: 'Quick check-in from TravelSmarter 👋',
    html: (user) => wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.first_name || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">Just checking in — how's it going with TravelSmarter so far?</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">Most people who stick with it use a couple of hacks in their first two weeks and never look back. If you haven't tried one yet, this is a good week to start.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/index.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Browse Your Hacks →</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Reply anytime if you have a question — a real person reads these.</p>
    `),
  },
  {
    id: 'feature_update',
    name: "Feature Update: What's new",
    subject: "✈️ New on TravelSmarter — you'll want to see this",
    html: (user) => wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.first_name || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">We've shipped a few things recently that make it easier to save on your next trip:</p>
      <ul style="color:#374151;line-height:1.9;margin:0 0 24px;padding-left:20px;">
        <li>🔔 <strong>Flight Price Alerts</strong> — daily checks, email the moment your route drops</li>
        <li>🗺️ <strong>Hidden Gem of the Month</strong> — an underrated destination before the crowds arrive</li>
        <li>⚖️ <strong>Compensation Checker</strong> — paste a delay/cancellation email, get an instant claim assessment</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/index.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">See What's New →</a>
      </div>
    `),
  },
  {
    id: 'soft_pitch',
    name: 'Soft Pitch: Upgrade hint',
    subject: 'Are you getting the most out of TravelSmarter?',
    html: (user) => wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.first_name || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 16px;">Most of our free members use TravelSmarter to browse hacks and get ideas. That's a good start.</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">But the members who save the most money do something different. They use the deal alerts, the personalized recommendations, and the full hack library together — as a system.</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 8px;"><strong>Here's what Smart Traveler members get that free members don't:</strong></p>
      <ul style="color:#374151;line-height:1.9;margin:0 0 24px;padding-left:20px;">
        <li>📧 Weekly curated deal alerts sent directly to their inbox</li>
        <li>🎯 Personalized hack recommendations based on their travel style</li>
        <li>💬 Access to the community board where members share live deals</li>
        <li>📚 The complete 87-hack library with no restrictions</li>
      </ul>
      <p style="color:#374151;line-height:1.7;margin:0 0 24px;">Smart Traveler is <strong>$19/month</strong>. Most members recover that in their first booking.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/sales-page.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Start Saving More →</a>
      </div>
      <p style="color:#374151;line-height:1.7;margin:0;">The TravelSmarter Team</p>
    `),
  },
  {
    id: 're_engagement',
    name: 'Re-engagement: Come back',
    subject: 'We miss you — and so does your travel budget',
    html: (user) => wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.first_name || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">It's been a while since you last checked in on TravelSmarter. Your 20 free hacks are still waiting, and we've added new ones since your last visit.</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">Got a trip coming up? That's exactly when these hacks pay off the most.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/index.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Come Back →</a>
      </div>
    `),
  },
];

async function queryRecipients({ subscribed_after, subscribed_before, tier }) {
  let query = `
    SELECT u.id, u.email, u.first_name, u.created_at,
           COALESCE(s.tier, u.subscription_tier, 'free') AS resolved_tier
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
    WHERE u.is_active = true
      AND COALESCE(u.email_marketing_opt_out, false) = false
  `;
  const params = [];

  if (subscribed_after) {
    params.push(subscribed_after);
    query += ` AND u.created_at >= $${params.length}`;
  }
  if (subscribed_before) {
    params.push(subscribed_before);
    query += ` AND u.created_at <= $${params.length}`;
  }
  if (tier) {
    params.push(tier);
    query += ` AND COALESCE(s.tier, u.subscription_tier, 'free') = $${params.length}`;
  }

  query += ' ORDER BY u.created_at DESC';

  const result = await pool.query(query, params);
  return result.rows;
}

// @desc Get all broadcast templates
// @route GET /api/broadcast/templates
// @access Private (Admin)
exports.getTemplates = async (req, res) => {
  res.status(200).json({
    success: true,
    templates: TEMPLATES.map(({ id, name, subject }) => ({ id, name, subject })),
  });
};

// @desc Get subscribers matching filters
// @route GET /api/broadcast/subscribers
// @access Private (Admin)
exports.getSubscribers = async (req, res) => {
  try {
    const { subscribed_after, subscribed_before, tier } = req.query;
    const recipients = await queryRecipients({ subscribed_after, subscribed_before, tier });
    res.status(200).json({
      success: true,
      count: recipients.length,
      subscribers: recipients.map(r => ({ email: r.email })),
    });
  } catch (error) {
    console.error('Get broadcast subscribers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Send a broadcast email to matching subscribers
// @route POST /api/broadcast/send
// @access Private (Admin)
exports.sendBroadcast = async (req, res) => {
  try {
    const { template_id, custom_subject, filters = {} } = req.body;

    const template = TEMPLATES.find(t => t.id === template_id);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const recipients = await queryRecipients(filters || {});
    if (recipients.length === 0) {
      return res.status(200).json({ success: true, message: 'No matching subscribers — nothing sent.' });
    }

    let sent = 0;
    let failed = 0;
    for (const user of recipients) {
      const result = await emailService.sendEmail({
        to: user.email,
        subject: custom_subject || template.subject,
        html: template.html(user),
      });
      if (result.success) sent++; else failed++;
    }

    res.status(200).json({
      success: true,
      message: `Sent to ${sent} subscriber${sent !== 1 ? 's' : ''}${failed ? `, ${failed} failed` : ''}.`,
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
