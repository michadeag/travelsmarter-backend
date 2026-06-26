const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const pool = require('../config/database');
const sgMail = require('@sendgrid/mail');

const BROADCAST_TEMPLATES = [
  {
    id: 'checkin',
    name: 'Check-in: How is it going?',
    subject: 'Quick check-in from TravelSmarter 👋',
    html: `<h2>Hi {firstName},</h2>
<p>You've been a TravelSmarter member for a little while now, and we'd love to hear from you.</p>
<p><strong>Two quick questions:</strong></p>
<ol>
  <li>Have the travel hacks been useful so far?</li>
  <li>Is there anything you're looking for that you haven't found yet?</li>
</ol>
<p>Just hit reply — we read every response personally.</p>
<p>By the way, if you haven't explored our full library of 87 hacks yet, you're leaving a lot on the table. Members on our Smart Traveler plan save an average of €500+ on their first trip after upgrading.</p>
<p><a href="{appUrl}/pricing" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">See what's included →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`
  },
  {
    id: 'feature_update',
    name: 'Feature Update: What\'s new',
    subject: '✈️ New on TravelSmarter — you\'ll want to see this',
    html: `<h2>Hi {firstName},</h2>
<p>We've been busy improving TravelSmarter based on member feedback — and there are a few things worth knowing about.</p>
<p><strong>What's new:</strong></p>
<ul>
  <li>🔍 Improved hack search — find exactly what you need faster</li>
  <li>💡 New timing strategies in the Flight Hacks module</li>
  <li>📊 Weekly deal alerts for Smart Traveler and Elite members</li>
</ul>
<p>The weekly deal alerts alone have helped members save hundreds of euros this month. That feature is available on our paid plans — worth a look if you haven't already.</p>
<p><a href="{appUrl}/pricing" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">Explore plans →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'soft_pitch',
    name: 'Soft Pitch: Upgrade hint',
    subject: '💡 Are you getting the most out of TravelSmarter?',
    html: `<h2>Hi {firstName},</h2>
<p>Most of our free members use TravelSmarter to browse hacks and get ideas. That's a good start.</p>
<p>But the members who save the most money do something different. They use the deal alerts, the personalized recommendations, and the full hack library together — as a system.</p>
<p><strong>Here's what Smart Traveler members get that free members don't:</strong></p>
<ul>
  <li>📧 Weekly curated deal alerts sent directly to their inbox</li>
  <li>🎯 Personalized hack recommendations based on their travel style</li>
  <li>💬 Access to the community board where members share live deals</li>
  <li>📚 The complete 87-hack library with no restrictions</li>
</ul>
<p>Smart Traveler is €9.99/month. Most members recover that in their first booking.</p>
<p><a href="{appUrl}/pricing" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;font-weight:bold;">Start saving more →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'reengagement',
    name: 'Re-engagement: Come back',
    subject: '🌍 We miss you — and so does your travel budget',
    html: `<h2>Hi {firstName},</h2>
<p>It's been a while since you've visited TravelSmarter, and we wanted to check in.</p>
<p>Travel prices change fast. The hacks that save you the most money depend on timing — and the best windows don't stay open long.</p>
<p><strong>What's waiting for you:</strong></p>
<ul>
  <li>New flight hacking strategies added this month</li>
  <li>Updated hotel loyalty program guides</li>
  <li>A community of travelers sharing live deals right now</li>
</ul>
<p>Come back and take a look — it only takes a few minutes to find something useful for your next trip.</p>
<p><a href="{appUrl}" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">Back to TravelSmarter →</a></p>
<p>The TravelSmarter Team</p>`
  }
];

// GET /api/broadcast/templates — list available templates
router.get('/templates', protectWithAdminFallback, (req, res) => {
  res.json({ success: true, templates: BROADCAST_TEMPLATES.map(t => ({ id: t.id, name: t.name, subject: t.subject })) });
});

// GET /api/broadcast/subscribers — get filtered subscriber list
router.get('/subscribers', protectWithAdminFallback, async (req, res) => {
  try {
    const { subscribed_after, subscribed_before, tier } = req.query;
    const params = [];
    let where = 'WHERE is_active = true';

    if (subscribed_after) {
      params.push(subscribed_after);
      where += ` AND created_at >= $${params.length}`;
    }
    if (subscribed_before) {
      params.push(subscribed_before);
      where += ` AND created_at <= $${params.length}`;
    }
    if (tier && tier !== 'all') {
      params.push(tier);
      where += ` AND subscription_tier = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, subscription_tier, created_at FROM users ${where} ORDER BY created_at DESC`,
      params
    );

    res.json({ success: true, count: result.rows.length, subscribers: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/broadcast/send — send broadcast email
router.post('/send', protectWithAdminFallback, async (req, res) => {
  try {
    const { template_id, filters = {}, custom_subject, custom_html } = req.body;

    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      return res.status(500).json({ success: false, error: 'SendGrid not configured' });
    }

    // Get template
    let subject, html;
    if (template_id && template_id !== 'custom') {
      const template = BROADCAST_TEMPLATES.find(t => t.id === template_id);
      if (!template) return res.status(400).json({ success: false, error: 'Template not found' });
      subject = custom_subject || template.subject;
      html = template.html;
    } else {
      subject = custom_subject;
      html = custom_html;
    }

    if (!subject || !html) {
      return res.status(400).json({ success: false, error: 'Subject and content required' });
    }

    // Build user filter
    const { subscribed_after, subscribed_before, tier } = filters;
    const params = [];
    let where = 'WHERE is_active = true';

    if (subscribed_after) { params.push(subscribed_after); where += ` AND created_at >= $${params.length}`; }
    if (subscribed_before) { params.push(subscribed_before); where += ` AND created_at <= $${params.length}`; }
    if (tier && tier !== 'all') { params.push(tier); where += ` AND subscription_tier = $${params.length}`; }

    const result = await pool.query(
      `SELECT id, email, first_name FROM users ${where}`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No subscribers match the selected filters' });
    }

    const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@travelsmarterapp.com';

    let sentCount = 0;
    const errors = [];

    for (const user of result.rows) {
      try {
        const personalizedHtml = `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <tr><td align="center" style="padding:40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:600px;">
                <tr><td style="padding:40px;color:#1f2937;line-height:1.6;">
                  ${html.replace(/{firstName}/g, user.first_name || 'Traveler').replace(/{appUrl}/g, appUrl)}
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:40px 0;">
                  <p style="font-size:12px;color:#9ca3af;">
                    You received this email because you signed up for TravelSmarter.<br>
                    <a href="${appUrl}/unsubscribe" style="color:#667eea;text-decoration:none;">Unsubscribe</a>
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>`;

        await sgMail.send({ to: user.email, from: fromEmail, subject, html: personalizedHtml });
        sentCount++;
      } catch (err) {
        errors.push({ email: user.email, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Sent to ${sentCount} of ${result.rows.length} subscribers`,
      sent: sentCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
