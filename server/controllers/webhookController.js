const pool = require('../config/database');

// @desc Receive SendGrid Event Webhook events (delivered, open, click, bounce, etc.)
// @route POST /api/webhooks/sendgrid
// @access Public (SendGrid POSTs here directly; no auth header available)
exports.handleSendGridEvent = async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [];

    for (const event of events) {
      // SendGrid merges customArgs directly into each event object at the
      // top level (not nested), so event.scheduled_email_id etc. are set
      // from the customArgs passed at send time in sendPendingEmails().
      try {
        await pool.query(
          `INSERT INTO email_events (
             scheduled_email_id, user_id, template_id, sequence_name,
             event_type, email, url, sg_message_id, event_timestamp
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9))`,
          [
            event.scheduled_email_id || null,
            event.user_id || null,
            event.template_id || null,
            event.sequence_name || null,
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
