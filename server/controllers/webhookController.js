const pool = require('../config/database');
const { EventWebhook } = require('@sendgrid/eventwebhook');

const eventWebhook = new EventWebhook();

// @desc Receive SendGrid Event Webhook events (delivered, open, click, bounce, etc.)
// @route POST /api/webhooks/sendgrid
// @access Public (SendGrid POSTs here directly; no auth header available) —
// verified via SendGrid's Signed Event Webhook signature when configured
// (enable "Signed Event Webhook Requests" in SendGrid's Event Webhook
// settings and set SENDGRID_WEBHOOK_VERIFICATION_KEY to the verification
// key it gives you). Without that env var set, requests are still accepted
// unverified so this doesn't break email tracking before that's set up.
exports.handleSendGridEvent = async (req, res) => {
  try {
    // req.body is the raw Buffer here (see server.js's express.raw() for
    // this route) — signature verification needs the exact bytes SendGrid
    // signed, before any JSON parsing.
    const rawBody = req.body;

    if (process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY) {
      const signature = req.get('X-Twilio-Email-Event-Webhook-Signature');
      const timestamp = req.get('X-Twilio-Email-Event-Webhook-Timestamp');

      // A malformed signature/timestamp makes verifySignature throw rather
      // than return false — treat that the same as "invalid" instead of
      // letting it fall through to the generic error handler below.
      let isValid = false;
      try {
        const publicKey = eventWebhook.convertPublicKeyToECDSA(process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY);
        isValid = Boolean(signature) && Boolean(timestamp) &&
          eventWebhook.verifySignature(publicKey, rawBody, signature, timestamp);
      } catch (verifyErr) {
        console.warn('❌ SendGrid webhook signature verification threw:', verifyErr.message);
      }

      if (!isValid) {
        console.warn('❌ Rejected SendGrid webhook: invalid or missing signature');
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
    } else {
      console.warn('⚠️ SENDGRID_WEBHOOK_VERIFICATION_KEY not set — accepting SendGrid webhook without signature verification');
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }
    const events = Array.isArray(parsedBody) ? parsedBody : [];

    for (const event of events) {
      // SendGrid merges customArgs directly into each event object at the
      // top level (not nested), so event.scheduled_email_id etc. are set
      // from the customArgs passed at send time in sendPendingEmails().
      try {
        await pool.query(
          `INSERT INTO email_events (
             scheduled_email_id, user_id, template_id, sequence_name, day,
             event_type, email, url, sg_message_id, event_timestamp
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10))`,
          [
            event.scheduled_email_id || null,
            event.user_id || null,
            event.template_id || null,
            event.sequence_name || null,
            event.day ? parseInt(event.day, 10) : null,
            event.event || 'unknown',
            event.email || null,
            event.url || null,
            event.sg_message_id || null,
            event.timestamp || null
          ]
        );
      } catch (rowErr) {
        console.error('❌ Failed to store one SendGrid event:', rowErr.message);
      }
    }

    // SendGrid just needs a 200 to consider the batch delivered
    res.status(200).json({ success: true, received: events.length });
  } catch (error) {
    console.error('❌ Error handling SendGrid webhook:', error.message);
    // Still 200 so SendGrid doesn't retry-storm us over a transient logging issue
    res.status(200).json({ success: false, error: error.message });
  }
};

// @desc Aggregated open/click stats per drip-sequence email, for the admin dashboard
// @route GET /api/webhooks/sendgrid/stats
// @access Private (Admin)
exports.getEmailEngagementStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sequence_name,
        day,
        count(*) FILTER (WHERE event_type = 'delivered') AS delivered,
        count(*) FILTER (WHERE event_type = 'open') AS opens,
        count(DISTINCT scheduled_email_id) FILTER (WHERE event_type = 'open') AS unique_opens,
        count(*) FILTER (WHERE event_type = 'click') AS clicks,
        count(DISTINCT scheduled_email_id) FILTER (WHERE event_type = 'click') AS unique_clicks,
        count(*) FILTER (WHERE event_type = 'bounce') AS bounces,
        count(*) FILTER (WHERE event_type = 'unsubscribe') AS unsubscribes
      FROM email_events
      WHERE sequence_name IS NOT NULL
      GROUP BY sequence_name, day
      ORDER BY sequence_name, day
    `);

    res.status(200).json({ success: true, stats: result.rows });
  } catch (error) {
    console.error('❌ Error fetching email engagement stats:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
