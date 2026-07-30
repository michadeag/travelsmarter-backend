const pool = require('../config/database');
const emailService = require('./emailService');

// Post-purchase drip for Trip Brief buyers — distinct from
// toolLeadEmailSequence.js (which targets people who downloaded a free
// tool PDF but haven't paid for anything) and emailSequenceService.js's
// Welcome/Feature Spotlight sequences (which trigger on account signup).
// A Trip Brief buyer has paid once but has no `users` row — this sequence
// exists to convert that one-off purchase into (a) a free TravelSmarter
// account (welcome.html — 20 free hacks, no credit card) and (b) a Pro
// subscription (sales-page.html). Scheduling lives in its own
// trip_brief_scheduled_emails table (FK'd to trip_briefs) for the same
// reason toolLeadEmailSequence has its own table: buyers have no `users`
// row to hang scheduled_emails off of.

const TRIP_BRIEF_SEQUENCE_NAME = 'Trip Brief Buyer Sequence';

// ─── HELPERS (mirrors toolLeadEmailSequence.js's private helpers) ────────────

function h(text) {
  return `<h2 style="color:#1a2744;font-size:21px;font-weight:700;margin:0 0 16px;line-height:1.3;">${text}</h2>`;
}
function p(text) {
  return `<p style="color:#374151;margin:0 0 14px;line-height:1.75;font-size:15px;">${text}</p>`;
}
function small(text) {
  return `<p style="color:#9ca3af;font-size:13px;margin:16px 0 0;line-height:1.6;">${text}</p>`;
}
function tipBox(content) {
  return `<div style="background:#f0f4ff;border-left:4px solid #667eea;border-radius:0 8px 8px 0;padding:18px 20px;margin:22px 0;color:#1f2937;line-height:1.7;">${content}</div>`;
}
function btn(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-top:4px;">${label} →</a>`;
}

// Free-account CTA — welcome.html, not sales-page.html. This is the
// "membership" ask: no payment, just 20 free hacks and a saved profile so
// future Trip Briefs and tool visits don't start from zero every time.
function accountBox(text) {
  return `<div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <p style="margin:0 0 12px;font-size:14px;color:#065f46;">${text}</p>
    <a href="{welcomeUrl}" style="display:inline-block;background:#10b981;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">Get My Free Account →</a>
  </div>`;
}

// Pro CTA — sales-page.html, same convention used everywhere else in the
// app (every tool's PDF/confirmation email links here for the paid pitch).
function proBox(text) {
  return `<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <p style="margin:0 0 12px;font-size:14px;color:#92400e;">${text}</p>
    <a href="{appUrl}/sales-page.html" style="display:inline-block;background:#ff6b4a;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">See TravelSmarter Pro →</a>
  </div>`;
}

// ─── THE SEQUENCE ──────────────────────────────────────────────────────────
// 6 emails over 18 days — tighter cadence than the 30-day cold-lead
// sequence, since this audience already paid once and needs less
// convincing that the product has value. Day 14's box is product-aware
// ({productPitchBox} resolved per-buyer at send time in
// sendPendingTripBriefEmails, since 'single' buyers still have a reason to
// hear about the $99 lifetime upgrade and 'lifetime' buyers don't).

const DAYS = [
  {
    day: 2,
    subject: '✈️ Did your Trip Brief help?',
    html: h(`Did your Trip Brief help?`)
      + p(`Hope it made the trip prep easier — that was the whole point.`)
      + p(`Quick thing you might not know: you didn't need an account to get it, but if you want one — it's free, no credit card, and comes with 20 more travel hacks (credit card point strategies, transfer partners, status-match tricks) that aren't in the brief.`)
      + accountBox(`Get a free TravelSmarter account — 20 travel hacks, no credit card required.`)
      + small(`Just here to check in — more next week.`),
  },
  {
    day: 5,
    subject: '📉 Wish you\'d known your flight price was about to drop?',
    html: h(`The feature most Trip Brief buyers ask about next`)
      + p(`Once you know where you're going, the next open question is usually: "am I paying too much?"`)
      + tipBox(`<strong>Automatic price alerts</strong> (TravelSmarter Pro) track your route after you book and tell you if the price drops — no manually re-checking three sites every few days.`)
      + proBox(`TravelSmarter Pro adds automatic price alerts, plus 87 verified travel hacks and every free tool with saved trip profiles. $19/month, cancel anytime.`)
      + small(`Tomorrow — well, next week: what else Pro unlocks.`),
  },
  {
    day: 8,
    subject: '📚 87 verified travel hacks, in case you missed it',
    html: h(`The 87-hack library`)
      + p(`Separate from the Trip Brief entirely: TravelSmarter Pro includes a library of 87 verified travel hacks — credit card point strategies, status-match tricks, lounge-access workarounds, the kind of stuff that's genuinely worth more than the subscription if you use even a few of them.`)
      + p(`It also saves your trip details, so your next Trip Brief (or any tool on the site) doesn't start from a blank form.`)
      + proBox(`87 verified hacks, saved trip profiles, automatic price alerts, and every free tool — all in one place. $19/month, cancel anytime.`)
      + small(`Not ready for that? A free account still gets you 20 of the hacks, no charge.`),
  },
  {
    day: 11,
    subject: '🎒 Your free TravelSmarter account is still waiting',
    html: h(`Still no account? Here's what you're skipping`)
      + p(`No pressure — this one's genuinely free. A TravelSmarter account gets you:`)
      + `<ul style="color:#374151;font-size:15px;line-height:1.9;margin:0 0 14px;padding-left:20px;">
           <li>20 free travel hacks (credit card points, status matching, transfer partners)</li>
           <li>Your trip details saved, so tools and future Trip Briefs go faster</li>
           <li>No credit card, no charge, ever — upgrade only if you want to</li>
         </ul>`
      + accountBox(`Get your free TravelSmarter account — takes under a minute.`)
      + small(`One more email after this, then we'll leave you be.`),
  },
  {
    day: 14,
    subject: '🧭 One more trip coming up?',
    html: h(`Planning another trip?`)
      + p(`Just flagging this in case it's useful: `)
      + `{productPitchBox}`
      + small(`Last email in this series is in a few days.`),
  },
  {
    day: 18,
    subject: '👋 Last one — here\'s everything in one place',
    html: h(`That's the series — here's everything in one place`)
      + p(`Two free things and one paid thing, all in one email so you don't have to dig through your inbox:`)
      + accountBox(`Free forever: a TravelSmarter account — 20 travel hacks, no credit card.`)
      + proBox(`$19/month: TravelSmarter Pro — 87 hacks, automatic price alerts, saved trip profiles, every tool unlocked.`)
      + p(`And the free tools are always there too, no account needed:`)
      + btn(`{appUrl}/free-travel-tools.html`, `Browse Free Tools`)
      + small(`Thanks for buying a Trip Brief — safe travels, whenever the next trip is.`),
  },
];

function buildTripBriefSequence() {
  return DAYS.map(({ day, subject, html }) => ({ day, subject, html }));
}

const tripBriefEmailSequence = buildTripBriefSequence();

// ─── PRODUCT-AWARE DAY-14 BOX ──────────────────────────────────────────────
// Resolved per-buyer at send time (not baked into the stored template),
// same technique used for {tripBriefUrl}/{tripBriefLabel} in
// toolLeadEmailSequence.js — 'single' buyers get a reason to hear about
// the $99 lifetime upgrade, 'lifetime' buyers (already unlimited) don't.
function productPitchBoxFor(product) {
  if (product === 'lifetime') {
    return proBox(`You've already got unlimited Trip Briefs — TravelSmarter Pro adds automatic price alerts and the full 87-hack library on top, for whichever trip comes next. $19/month, cancel anytime.`);
  }
  return `<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <p style="margin:0 0 12px;font-size:14px;color:#92400e;">Your last brief was a single trip ($19). If there's another one coming, <strong>Trip Brief Unlimited</strong> is $99 total — pays for itself on your 6th trip, ever.</p>
    <a href="{appUrl}/trip-brief.html" style="display:inline-block;background:#ff6b4a;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">See Trip Brief Plans →</a>
    <p style="margin:16px 0 8px;font-size:12.5px;color:#92400e;">Or get everything — unlimited briefs, 87 hacks, price alerts — with TravelSmarter Pro.</p>
    <a href="{appUrl}/sales-page.html" style="display:inline-block;background:#1a2744;color:white;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:12.5px;">See TravelSmarter Pro →</a>
  </div>`;
}

// ─── SEED / UPDATE ────────────────────────────────────────────────────────────

async function seedTripBriefSequence() {
  try {
    const existing = await pool.query(`SELECT id FROM email_sequences WHERE name = $1`, [TRIP_BRIEF_SEQUENCE_NAME]);
    if (existing.rows.length > 0) {
      console.log('✅ Trip Brief Buyer sequence already seeded');
      return existing.rows[0].id;
    }

    const { v4: uuidv4 } = require('uuid');
    const sequenceId = uuidv4();
    await pool.query(
      `INSERT INTO email_sequences (id, name, description, is_active, trigger_event, created_at)
       VALUES ($1, $2, $3, true, 'trip_brief_purchased', CURRENT_TIMESTAMP)`,
      [sequenceId, TRIP_BRIEF_SEQUENCE_NAME, '6-email post-purchase sequence for Trip Brief buyers: converts a one-off purchase into a free account and/or a Pro subscription, over 18 days.']
    );

    for (const email of tripBriefEmailSequence) {
      await pool.query(
        `INSERT INTO email_templates (id, sequence_id, day, subject, content, html_content, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)`,
        [uuidv4(), sequenceId, email.day, email.subject, email.html.replace(/<[^>]*>/g, ''), email.html]
      );
    }

    console.log(`✅ Trip Brief Buyer sequence seeded with ${tripBriefEmailSequence.length} templates`);
    return sequenceId;
  } catch (error) {
    console.error('❌ Error seeding Trip Brief Buyer sequence:', error);
    throw error;
  }
}

async function updateTripBriefTemplates() {
  try {
    const seqResult = await pool.query(`SELECT id FROM email_sequences WHERE name = $1 LIMIT 1`, [TRIP_BRIEF_SEQUENCE_NAME]);
    if (seqResult.rows.length === 0) return;
    const sequenceId = seqResult.rows[0].id;

    for (const email of tripBriefEmailSequence) {
      await pool.query(
        `UPDATE email_templates SET subject = $1, html_content = $2, content = $3 WHERE sequence_id = $4 AND day = $5`,
        [email.subject, email.html, email.html.replace(/<[^>]*>/g, ''), sequenceId, email.day]
      );
    }
    console.log('✅ Trip Brief Buyer templates updated from code');
  } catch (error) {
    console.error('❌ Error updating Trip Brief Buyer templates:', error);
  }
}

// ─── ENROLL A NEW BUYER ─────────────────────────────────────────────────────
// Called right after a Trip Brief PDF is generated and emailed (both the
// paid-checkout path and the free-via-lifetime-access path in
// tripBriefController.js) — that immediate delivery email is separate and
// unaffected; this schedules days 2-18 on top of it.

async function initializeTripBriefSequence(tripBriefId, email, firstName) {
  try {
    const sequenceResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = $1 AND is_active = true LIMIT 1`,
      [TRIP_BRIEF_SEQUENCE_NAME]
    );
    if (sequenceResult.rows.length === 0) {
      console.warn('⚠️ No active Trip Brief Buyer sequence found, skipping');
      return { success: false, message: 'No active sequence configured' };
    }
    const sequenceId = sequenceResult.rows[0].id;

    const templatesResult = await pool.query(
      `SELECT id, day FROM email_templates WHERE sequence_id = $1 AND is_active = true ORDER BY day ASC`,
      [sequenceId]
    );

    let scheduledCount = 0;
    for (const template of templatesResult.rows) {
      const scheduledAt = new Date();
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + template.day);
      scheduledAt.setUTCHours(16, 0, 0, 0); // 16:00 UTC — an hour after the free-tool-leads drip, to spread send load

      try {
        await pool.query(
          `INSERT INTO trip_brief_scheduled_emails (trip_brief_id, template_id, scheduled_at, status, created_at)
           VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)`,
          [tripBriefId, template.id, scheduledAt]
        );
        scheduledCount++;
      } catch (insertError) {
        console.error(`❌ Failed to schedule Trip Brief buyer day ${template.day} email:`, insertError.message);
      }
    }

    console.log(`✅ Trip Brief Buyer sequence initialized for ${email} (${scheduledCount} emails scheduled)`);
    return { success: true, scheduledCount };
  } catch (error) {
    console.error('❌ Error initializing Trip Brief Buyer sequence:', error);
    // Never throw — enrollment failure must not break PDF delivery itself.
    return { success: false, message: error.message };
  }
}

// ─── SEND PENDING BUYER EMAILS (hourly poller) ─────────────────────────────

async function sendPendingTripBriefEmails() {
  try {
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trip_brief_scheduled_emails')`
    );
    if (!tableCheck.rows[0].exists) return { sent: 0 };

    // Stop the drip the moment someone signs up for a real account — the
    // existing Feature Spotlight (free->paid nurture) sequence takes over
    // from there, so continuing this one too would be redundant.
    await pool.query(`
      UPDATE trip_brief_scheduled_emails tse
      SET status = 'cancelled'
      FROM trip_briefs tb
      WHERE tse.trip_brief_id = tb.id
        AND tse.status = 'pending'
        AND tb.converted_to_user_id IS NOT NULL
    `);

    const result = await pool.query(`
      SELECT tse.id, tse.trip_brief_id, tse.template_id, tb.email, tb.first_name, tb.product, tb.unsubscribe_token,
             et.day, et.subject, et.html_content
      FROM trip_brief_scheduled_emails tse
      JOIN trip_briefs tb ON tse.trip_brief_id = tb.id
      JOIN email_templates et ON tse.template_id = et.id
      WHERE tse.status = 'pending'
        AND tse.scheduled_at <= NOW()
        AND et.is_active = true
        AND (tb.email_opt_out IS NULL OR tb.email_opt_out = false)
      ORDER BY tse.scheduled_at ASC
    `);

    if (result.rows.length === 0) return { sent: 0 };

    const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
    let sentCount = 0;

    for (const row of result.rows) {
      try {
        // {productPitchBox} first — its own returned HTML still contains
        // literal {appUrl} tokens, which must survive to be caught by the
        // {appUrl} pass below. Resolving {appUrl} first would leave those
        // tokens stranded since they wouldn't exist yet at that point.
        const emailHtml = (row.html_content || '')
          .split('{productPitchBox}').join(productPitchBoxFor(row.product))
          .split('{firstName}').join(row.first_name || 'there')
          .split('{welcomeUrl}').join(`${appUrl}/welcome.html`)
          .split('{appUrl}').join(appUrl);

        const fullHtml = `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <tr><td align="center" style="padding:32px 16px;">
              <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <tr>
                  <td style="background:#1a2744;padding:18px 32px;border-radius:12px 12px 0 0;">
                    <span style="font-size:19px;font-weight:700;color:white;font-family:-apple-system,sans-serif;">
                      Travel<span style="color:#ff6b4a;">Smarter</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="background:white;padding:36px 32px;border-radius:0 0 12px 12px;color:#1f2937;line-height:1.7;font-size:15px;">
                    ${emailHtml}
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:36px 0 24px;">
                    <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.7;">
                      You received this because you bought a Trip Brief from TravelSmarter.<br>
                      <a href="${appUrl}/unsubscribe.html?token=${row.unsubscribe_token}&type=trip-brief" style="color:#667eea;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        `;

        await emailService.sendEmail({
          to: row.email,
          subject: row.subject,
          html: fullHtml,
          trackingSettings: {
            clickTracking: { enable: true, enableText: false },
            openTracking: { enable: true }
          },
          customArgs: {
            scheduled_trip_brief_email_id: String(row.id),
            trip_brief_id: String(row.trip_brief_id),
            template_id: String(row.template_id),
            sequence_name: TRIP_BRIEF_SEQUENCE_NAME,
            day: String(row.day)
          }
        });

        await pool.query(`UPDATE trip_brief_scheduled_emails SET status = 'sent', sent_at = NOW() WHERE id = $1`, [row.id]);
        sentCount++;
        console.log(`✅ Sent Trip Brief buyer day ${row.day} email to ${row.email}`);
      } catch (error) {
        console.error(`❌ Error sending Trip Brief buyer email for trip_brief_scheduled_emails ${row.id}:`, error);
        await pool.query(`UPDATE trip_brief_scheduled_emails SET status = 'failed' WHERE id = $1`, [row.id]);
      }
    }

    console.log(`✅ Sent ${sentCount} Trip Brief buyer emails`);
    return { sent: sentCount };
  } catch (error) {
    console.error('❌ Error sending pending Trip Brief buyer emails:', error);
    return { sent: 0, error: error.message };
  }
}

module.exports = {
  TRIP_BRIEF_SEQUENCE_NAME,
  tripBriefEmailSequence,
  seedTripBriefSequence,
  updateTripBriefTemplates,
  initializeTripBriefSequence,
  sendPendingTripBriefEmails,
};
