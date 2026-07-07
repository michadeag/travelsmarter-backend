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
<p>By the way, if you haven't explored our full library of 87 hacks yet, you're leaving a lot on the table. Members on our Smart Traveler plan save an average of $500+ on their first trip after upgrading.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">See what's included →</a></p>
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
<p>The weekly deal alerts alone have helped members save hundreds of dollars this month. That feature is available on our paid plans — worth a look if you haven't already.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">Explore plans →</a></p>
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
<p>Smart Traveler is $19/month. Most members recover that in their first booking.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;font-weight:bold;">Start saving more →</a></p>
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
  },
  {
    id: 'deal_alert_highlight',
    name: 'Deal Alerts: The feature you\'re missing',
    subject: '📧 The email that finds deals before you do',
    html: `<h2>Hi {firstName},</h2>
<p>Right now you're browsing hacks manually — which works, but it takes time. Smart Traveler members get a weekly email with the 3 best verified deals we've found that week, no searching required.</p>
<p><strong>Here's how it could look:</strong> Marcus L. from Seattle almost skipped his digest email one Friday. It had a mistake-fare alert to Lisbon. He booked in 20 minutes and saved $310 off the normal fare.</p>
<p>That's the difference between hunting for deals and having them delivered.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">See the Weekly Deal Digest →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'limited_time_discount',
    name: 'Limited Offer: 20% off first month',
    subject: '⏰ 20% off your first month — this week only',
    html: `<h2>Hi {firstName},</h2>
<p>Quick one: for a limited time, you can get Smart Traveler or Elite for 20% off your first month.</p>
<p><strong>Use code SPOTLIGHT20 at checkout</strong> — expires July 30, and it's capped at the first 100 people who use it.</p>
<p>Most members recover the full price of their first month on a single booking, so the discount is really just a head start.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;font-weight:bold;">Claim 20% off →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'success_story',
    name: 'Success Stories: What members are saying',
    subject: '💬 What members are saying about TravelSmarter',
    html: `<h2>Hi {firstName},</h2>
<p>We ask members to share what's actually worked for them. A few recent notes:</p>
<p><strong>Here's how it could look:</strong></p>
<ul>
  <li>"Used the mistake-fare alert once and it paid for a year of membership." — Rachel S.</li>
  <li>"The hotel status-match trick got me a free upgrade on my very next stay." — Tom H.</li>
  <li>"Didn't expect the credit card timing hack to matter this much. It did." — Priya K.</li>
</ul>
<p>None of these are guarantees — but they're the kind of results members report when they actually use the system, not just browse it.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">See what's included →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'new_hacks_added',
    name: 'Library Update: New hacks added',
    subject: '📚 New hacks just added to the library',
    html: `<h2>Hi {firstName},</h2>
<p>The hack library keeps growing — we've added new strategies across flights, hotels, and credit cards this month.</p>
<p><strong>A few of the latest additions:</strong></p>
<ul>
  <li>✈️ A new positioning-flight trick for long-haul routes</li>
  <li>🏨 An updated hotel status-match script that's working better than the old one</li>
  <li>💳 A timing strategy for stacking two card sign-up bonuses</li>
</ul>
<p>Free members see 20 of the 87 hacks. Smart Traveler and Elite members get the rest, updated as new strategies get verified.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">Unlock the full library →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'community_highlight',
    name: 'Community: Live deals from other members',
    subject: '💬 See what 12,340+ travelers are sharing right now',
    html: `<h2>Hi {firstName},</h2>
<p>The Travel Community is where Elite members post deals, mistake fares, and status-match wins the moment they find them — often before we've added them to the digest.</p>
<p><strong>Here's how it could look:</strong> a member posted a mistake fare 40 minutes after it went live. Another member saw it, booked before it corrected, and saved over $300.</p>
<p>It's the closest thing to having 12,340 people watching for deals on your behalf.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">See Elite membership →</a></p>
<p>The TravelSmarter Team</p>`
  },
  {
    id: 'milestone_social_proof',
    name: 'Milestone: $250M+ saved together',
    subject: '🎉 Our members have saved $250M+ together',
    html: `<h2>Hi {firstName},</h2>
<p>TravelSmarter members have saved more than $250M combined using the strategies in this app — not from one big trick, but from using several small ones together, consistently.</p>
<p><strong>The pattern we see most:</strong> members who combine a price alert, a deal digest, and one credit card hack on a single trip tend to save far more than the sum of the parts — because each one compounds with the others.</p>
<p>If you've only tried one or two hacks so far, that's normal. The bigger savings show up once you start using the system as a whole.</p>
<p><a href="{appUrl}/sales-page.html" style="background:#667eea;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">See the full system →</a></p>
<p>The TravelSmarter Team</p>`
  }
];

// GET /api/broadcast/templates — list available templates, with how many
// free users have already received each one
router.get('/templates', protectWithAdminFallback, async (req, res) => {
  try {
    const countResult = await pool.query(
      `SELECT template_id, COUNT(*) AS sent_count FROM broadcast_sends GROUP BY template_id`
    );
    const countsByTemplate = {};
    countResult.rows.forEach(row => { countsByTemplate[row.template_id] = parseInt(row.sent_count, 10); });

    res.json({
      success: true,
      templates: BROADCAST_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        sentCount: countsByTemplate[t.id] || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Broadcasts are a free->paid nurture tool: always restrict to free-tier
// users who are active, haven't opted out of marketing email, and haven't
// already received this specific template before. templateId is omitted
// for custom (non-template) broadcasts, which skip the dedup check.
function buildRecipientQuery({ subscribedAfter, subscribedBefore, templateId }) {
  const params = [];
  let query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.created_at
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
    WHERE u.is_active = true
      AND COALESCE(u.email_marketing_opt_out, false) = false
      AND COALESCE(s.tier, u.subscription_tier, 'free') = 'free'
  `;

  if (subscribedAfter) {
    params.push(subscribedAfter);
    query += ` AND u.created_at >= $${params.length}`;
  }
  if (subscribedBefore) {
    params.push(subscribedBefore);
    query += ` AND u.created_at <= $${params.length}`;
  }
  if (templateId) {
    params.push(templateId);
    query += ` AND NOT EXISTS (
      SELECT 1 FROM broadcast_sends bs WHERE bs.user_id = u.id AND bs.template_id = $${params.length}
    )`;
  }

  query += ' ORDER BY u.created_at DESC';
  return { query, params };
}

// GET /api/broadcast/subscribers — get filtered subscriber list
router.get('/subscribers', protectWithAdminFallback, async (req, res) => {
  try {
    const { subscribed_after, subscribed_before, template_id } = req.query;
    const { query, params } = buildRecipientQuery({
      subscribedAfter: subscribed_after,
      subscribedBefore: subscribed_before,
      templateId: template_id && template_id !== 'custom' ? template_id : null,
    });

    const result = await pool.query(query, params);

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
    const isCustom = !template_id || template_id === 'custom';
    if (!isCustom) {
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

    const { query, params } = buildRecipientQuery({
      subscribedAfter: filters.subscribed_after,
      subscribedBefore: filters.subscribed_before,
      templateId: isCustom ? null : template_id,
    });

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No matching free-tier subscribers who haven\'t already received this broadcast' });
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

        if (!isCustom) {
          await pool.query(
            `INSERT INTO broadcast_sends (user_id, template_id) VALUES ($1, $2)
             ON CONFLICT (user_id, template_id) DO NOTHING`,
            [user.id, template_id]
          );
        }
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
