const pool = require('../config/database');
const sgMail = require('@sendgrid/mail');

// The default 3-step cold outreach sequence: an opener, a day-2 follow-up,
// and a day-4 no-pressure close. Editing these means editing this file —
// mirrors how BROADCAST_TEMPLATES works, no DB-editable template UI (yet).
const SEQUENCE_STEPS = [
  {
    step: 1,
    gapDays: 0, // sent immediately on enrollment
    subject: 'Quick idea for {name} — partner with TravelSmarter?',
    bodyHtml: `<p>Hi {name},</p>
<p>I've been following {url} and your travel content is exactly the kind of practical, no-fluff advice we try to build into TravelSmarter.</p>
<p>Quick pitch: we're looking for a handful of travel creators to partner with. The deal is simple — you share your unique link, and for every person who upgrades to a paid plan, you keep 100% of their first month. No cap on referrals, no complicated tiers.</p>
<p>Concretely: that's up to $49 for a single referral, paid directly to you.</p>
<p>No forms, no application — if you're interested, just reply to this email and I'll set up your link and send everything you need (banners, sample posts) within a day.</p>
<p>Worth a two-minute look?</p>
<p>Best,<br>Michael<br>TravelSmarter</p>`,
  },
  {
    step: 2,
    gapDays: 2, // sent 2 days after step 1
    subject: 'Re: Quick idea for {name}',
    bodyHtml: `<p>Hi {name},</p>
<p>Following up in case this got buried in your inbox.</p>
<p>Short version: you post your link once — in a video description, a blog post, wherever fits — and every reader or viewer who upgrades earns you their entire first month. Up to $49, no strings attached.</p>
<p>Takes about five minutes to get set up. Just reply "yes" and I'll send your link and materials the same day.</p>
<p>Michael<br>TravelSmarter</p>`,
  },
  {
    step: 3,
    gapDays: 2, // sent 2 days after step 2 (day 4 total)
    subject: 'Last note from TravelSmarter',
    bodyHtml: `<p>Hi {name},</p>
<p>I'll keep this short — don't want to clutter your inbox further.</p>
<p>If the timing isn't right, no worries at all. The offer stands whenever it makes sense: 100% of the first month on every referral, set up in minutes, no commitment.</p>
<p>Just reply if you'd like to pick this up — otherwise, keep doing great work over at {url}.</p>
<p>Best,<br>Michael</p>`,
  },
];

function personalize(html, prospect) {
  return html
    .replace(/{name}/g, prospect.name)
    .replace(/{channelType}/g, prospect.channel_type)
    .replace(/{url}/g, prospect.url || '');
}

async function sendStepToProspect(prospect, step, campaignId) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com';
  const subject = personalize(step.subject, prospect);
  const html = personalize(step.bodyHtml, prospect);
  try {
    await sgMail.send({ to: prospect.contact_email, from: fromEmail, subject, html });
    await pool.query(
      `INSERT INTO outreach_sends (campaign_id, prospect_id, status) VALUES ($1, $2, 'sent')
       ON CONFLICT (campaign_id, prospect_id) DO NOTHING`,
      [campaignId, prospect.id]
    );
    return true;
  } catch (err) {
    await pool.query(
      `INSERT INTO outreach_sends (campaign_id, prospect_id, status, error_message) VALUES ($1, $2, 'failed', $3)
       ON CONFLICT (campaign_id, prospect_id) DO NOTHING`,
      [campaignId, prospect.id, err.message]
    );
    return false;
  }
}

// @desc Enroll prospects in the sequence: sends step 1 immediately to each,
// starting the clock towards the day-2/day-4 automated follow-ups. Silently
// skips anyone without a contact_email or already enrolled (sequence_step > 0).
async function enrollProspects(prospectIds) {
  if (!process.env.SENDGRID_API_KEY) throw new Error('SendGrid not configured');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const step1 = SEQUENCE_STEPS[0];
  const prospectsResult = await pool.query(
    `SELECT * FROM outreach_prospects
     WHERE id = ANY($1::uuid[]) AND contact_email IS NOT NULL AND sequence_step = 0`,
    [prospectIds]
  );
  if (prospectsResult.rows.length === 0) {
    return { enrolled: 0, failed: 0 };
  }

  const campaignResult = await pool.query(
    `INSERT INTO outreach_campaigns (subject, body_html) VALUES ($1, $2) RETURNING id`,
    [`[Sequenz Step 1] ${step1.subject}`, step1.bodyHtml]
  );
  const campaignId = campaignResult.rows[0].id;

  let sent = 0;
  let failed = 0;
  for (const prospect of prospectsResult.rows) {
    const ok = await sendStepToProspect(prospect, step1, campaignId);
    if (ok) {
      sent++;
      // Only mark as enrolled if step 1 actually sent — otherwise this
      // prospect would silently skip straight to waiting for step 2 without
      // ever having received step 1, with no retry. Leaving sequence_step
      // at 0 keeps them eligible to be re-enrolled (the query above only
      // matches sequence_step = 0).
      await pool.query(
        `UPDATE outreach_prospects
         SET sequence_step = 1, enrolled_at = CURRENT_TIMESTAMP, last_step_sent_at = CURRENT_TIMESTAMP,
             status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [prospect.id]
      );
    } else {
      failed++;
    }
  }
  await pool.query(
    `UPDATE outreach_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3`,
    [sent, failed, campaignId]
  );

  return { enrolled: sent, failed };
}

// @desc Send the next due follow-up step to every prospect who is still
// 'contacted' (hasn't replied, converted, declined, or bounced — that status
// change is what stops the automation) and whose wait since the last step
// has passed. Meant to be called periodically; safe to call anytime since
// it's gated on durable DB timestamps, not an in-memory schedule.
async function processSequenceFollowUps() {
  if (!process.env.SENDGRID_API_KEY) return { sent: 0 };
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  let totalSent = 0;

  for (let i = 1; i < SEQUENCE_STEPS.length; i++) {
    const step = SEQUENCE_STEPS[i];
    const previousStepNumber = SEQUENCE_STEPS[i - 1].step;

    const dueResult = await pool.query(
      `SELECT * FROM outreach_prospects
       WHERE sequence_step = $1
         AND status = 'contacted'
         AND contact_email IS NOT NULL
         AND last_step_sent_at <= NOW() - make_interval(days => $2)`,
      [previousStepNumber, step.gapDays]
    );
    if (dueResult.rows.length === 0) continue;

    const campaignResult = await pool.query(
      `INSERT INTO outreach_campaigns (subject, body_html) VALUES ($1, $2) RETURNING id`,
      [`[Sequenz Step ${step.step}] ${step.subject}`, step.bodyHtml]
    );
    const campaignId = campaignResult.rows[0].id;

    let sent = 0;
    let failed = 0;
    for (const prospect of dueResult.rows) {
      const ok = await sendStepToProspect(prospect, step, campaignId);
      if (ok) {
        sent++;
        // Only advance on a successful send — otherwise a transient failure
        // (e.g. SendGrid hiccup) would silently skip this step forever, since
        // sequence_step would move on as if it sent. Leaving last_step_sent_at
        // untouched keeps this prospect "due" so the next scheduler pass
        // (every 6h) retries it automatically.
        await pool.query(
          `UPDATE outreach_prospects
           SET sequence_step = $1, last_step_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [step.step, prospect.id]
        );
      } else {
        failed++;
      }
    }
    await pool.query(
      `UPDATE outreach_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3`,
      [sent, failed, campaignId]
    );
    totalSent += sent;
  }

  return { sent: totalSent };
}

module.exports = { SEQUENCE_STEPS, enrollProspects, processSequenceFollowUps };
