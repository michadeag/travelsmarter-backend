const express = require('express');
const router = express.Router();
const axios = require('axios');
const sgMail = require('@sendgrid/mail');
const { protectWithAdminFallback } = require('../middleware/auth');
const pool = require('../config/database');
const referralService = require('../services/referralService');
const outreachSequenceService = require('../services/outreachSequenceService');

const CHANNEL_TYPES = ['blog', 'youtube', 'pinterest', 'instagram', 'newsletter', 'other'];
const PROSPECT_STATUSES = ['new', 'contacted', 'replied', 'converted', 'declined', 'bounced'];
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// @desc Manually add a prospect
// @route POST /api/outreach/admin/prospects
router.post('/admin/prospects', protectWithAdminFallback, async (req, res) => {
  try {
    const { name, channel_type, url, contact_email, audience_size, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO outreach_prospects (name, channel_type, url, contact_email, audience_size, notes, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'manual')
       RETURNING *`,
      [
        name,
        CHANNEL_TYPES.includes(channel_type) ? channel_type : 'other',
        url || null,
        contact_email || null,
        audience_size || null,
        notes || null,
      ]
    );
    res.status(201).json({ success: true, prospect: result.rows[0] });
  } catch (error) {
    console.error('Add outreach prospect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc List prospects, optionally filtered by status/channel_type
// @route GET /api/outreach/admin/prospects
router.get('/admin/prospects', protectWithAdminFallback, async (req, res) => {
  try {
    const { status, channel_type } = req.query;
    const conditions = [];
    const params = [];
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (channel_type) {
      params.push(channel_type);
      conditions.push(`channel_type = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM outreach_prospects ${where} ORDER BY created_at DESC`,
      params
    );
    res.status(200).json({ success: true, prospects: result.rows });
  } catch (error) {
    console.error('List outreach prospects error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Update a prospect's status/notes/contact info
// @route PUT /api/outreach/admin/prospects/:id
router.put('/admin/prospects/:id', protectWithAdminFallback, async (req, res) => {
  try {
    const { status, notes, contact_email } = req.body;
    if (status && !PROSPECT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${PROSPECT_STATUSES.join(', ')}`,
      });
    }
    const result = await pool.query(
      `UPDATE outreach_prospects
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           contact_email = COALESCE($3, contact_email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, notes, contact_email, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prospect not found' });
    }
    res.status(200).json({ success: true, prospect: result.rows[0] });
  } catch (error) {
    console.error('Update outreach prospect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Remove a prospect (e.g. bad/duplicate entry)
// @route DELETE /api/outreach/admin/prospects/:id
router.delete('/admin/prospects/:id', protectWithAdminFallback, async (req, res) => {
  try {
    await pool.query(`DELETE FROM outreach_prospects WHERE id = $1`, [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete outreach prospect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Search YouTube channels by keyword and add them as prospects.
// Note: the YouTube Data API does not expose a channel's contact email
// (that's only shown on the channel's own About page in the UI) — these
// come in with contact_email unset, for the admin to fill in after a look.
// @route POST /api/outreach/admin/prospects/search-youtube
router.post('/admin/prospects/search-youtube', protectWithAdminFallback, async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'YOUTUBE_API_KEY not configured' });
    }
    const { query, maxResults = 10 } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const searchRes = await axios.get(`${YT_API_BASE}/search`, {
      params: { part: 'snippet', q: query, type: 'channel', maxResults, key: apiKey },
    });

    const channelIds = searchRes.data.items.map(item => item.snippet.channelId || item.id.channelId).filter(Boolean);
    if (channelIds.length === 0) {
      return res.status(200).json({ success: true, added: 0, prospects: [] });
    }

    const statsRes = await axios.get(`${YT_API_BASE}/channels`, {
      params: { part: 'snippet,statistics', id: channelIds.join(','), key: apiKey },
    });

    const added = [];
    for (const channel of statsRes.data.items) {
      const url = `https://youtube.com/channel/${channel.id}`;
      const subscriberCount = channel.statistics?.subscriberCount;
      const result = await pool.query(
        `INSERT INTO outreach_prospects (name, channel_type, url, audience_size, source)
         SELECT $1, 'youtube', $2, $3, 'youtube_api'
         WHERE NOT EXISTS (SELECT 1 FROM outreach_prospects WHERE url = $2)
         RETURNING *`,
        [
          channel.snippet.title,
          url,
          subscriberCount ? `${Number(subscriberCount).toLocaleString()} subscribers` : null,
        ]
      );
      if (result.rows.length > 0) added.push(result.rows[0]);
    }

    res.status(200).json({ success: true, added: added.length, prospects: added });
  } catch (error) {
    console.error('YouTube prospect search error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Convert a prospect who agreed to promote TravelSmarter into an
// approved referral partner, so they get a working referral link right away.
// @route POST /api/outreach/admin/prospects/:id/convert
router.post('/admin/prospects/:id/convert', protectWithAdminFallback, async (req, res) => {
  try {
    const prospectResult = await pool.query(
      `SELECT * FROM outreach_prospects WHERE id = $1`,
      [req.params.id]
    );
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prospect not found' });
    }
    const prospect = prospectResult.rows[0];
    if (prospect.referral_partner_id) {
      return res.status(400).json({ success: false, error: 'Prospect was already converted' });
    }
    if (!prospect.contact_email) {
      return res.status(400).json({ success: false, error: 'Prospect needs a contact_email before converting' });
    }

    const referralCode = await referralService.generateUniqueReferralCode(prospect.name);
    const partnerResult = await pool.query(
      `INSERT INTO referral_partners (name, email, referral_code, channel_type, website_url, audience_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')
       RETURNING *`,
      [prospect.name, prospect.contact_email.toLowerCase(), referralCode, prospect.channel_type, prospect.url, prospect.audience_size]
    );
    const partner = partnerResult.rows[0];

    await pool.query(
      `UPDATE outreach_prospects
       SET status = 'converted', referral_partner_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [partner.id, prospect.id]
    );

    res.status(201).json({ success: true, partner });
  } catch (error) {
    console.error('Convert outreach prospect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc List past outreach campaigns with their send stats
// @route GET /api/outreach/admin/campaigns
router.get('/admin/campaigns', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM outreach_campaigns ORDER BY created_at DESC`
    );
    res.status(200).json({ success: true, campaigns: result.rows });
  } catch (error) {
    console.error('List outreach campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Send a personalized outreach email to a chosen batch of prospects,
// after the admin has reviewed subject/body — this is the one confirmation
// step that gates the actual send, deliberately not fully automatic.
// @route POST /api/outreach/admin/campaigns/send
router.post('/admin/campaigns/send', protectWithAdminFallback, async (req, res) => {
  try {
    const { prospectIds, subject, bodyHtml } = req.body;
    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return res.status(400).json({ success: false, error: 'prospectIds must be a non-empty array' });
    }
    if (!subject || !bodyHtml) {
      return res.status(400).json({ success: false, error: 'subject and bodyHtml are required' });
    }
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ success: false, error: 'SendGrid not configured' });
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const prospectsResult = await pool.query(
      `SELECT * FROM outreach_prospects WHERE id = ANY($1::uuid[]) AND contact_email IS NOT NULL`,
      [prospectIds]
    );
    if (prospectsResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'None of the selected prospects have a contact_email set' });
    }

    const campaignResult = await pool.query(
      `INSERT INTO outreach_campaigns (subject, body_html) VALUES ($1, $2) RETURNING id`,
      [subject, bodyHtml]
    );
    const campaignId = campaignResult.rows[0].id;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com';

    let sentCount = 0;
    const errors = [];

    for (const prospect of prospectsResult.rows) {
      const personalizedHtml = bodyHtml
        .replace(/{name}/g, prospect.name)
        .replace(/{channelType}/g, prospect.channel_type)
        .replace(/{url}/g, prospect.url || '');

      try {
        await sgMail.send({ to: prospect.contact_email, from: fromEmail, subject, html: personalizedHtml });
        sentCount++;
        await pool.query(
          `INSERT INTO outreach_sends (campaign_id, prospect_id, status) VALUES ($1, $2, 'sent')
           ON CONFLICT (campaign_id, prospect_id) DO NOTHING`,
          [campaignId, prospect.id]
        );
        await pool.query(
          `UPDATE outreach_prospects SET status = 'contacted', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'new'`,
          [prospect.id]
        );
      } catch (err) {
        errors.push({ prospectId: prospect.id, email: prospect.contact_email, error: err.message });
        await pool.query(
          `INSERT INTO outreach_sends (campaign_id, prospect_id, status, error_message) VALUES ($1, $2, 'failed', $3)
           ON CONFLICT (campaign_id, prospect_id) DO NOTHING`,
          [campaignId, prospect.id, err.message]
        );
      }
    }

    await pool.query(
      `UPDATE outreach_campaigns SET sent_count = $1, failed_count = $2 WHERE id = $3`,
      [sentCount, errors.length, campaignId]
    );

    res.status(200).json({
      success: true,
      campaignId,
      sent: sentCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Send outreach campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc The fixed 3-step sequence content, for the admin UI to preview
// @route GET /api/outreach/admin/sequence/steps
router.get('/admin/sequence/steps', protectWithAdminFallback, async (req, res) => {
  res.status(200).json({ success: true, steps: outreachSequenceService.SEQUENCE_STEPS });
});

// @desc Enroll selected prospects in the 3-step sequence — sends step 1
// immediately, and the scheduler in server.js sends steps 2/3 automatically
// on the configured day gaps, stopping for anyone whose status moves away
// from 'contacted' (i.e. they replied, declined, converted, or bounced).
// @route POST /api/outreach/admin/sequence/enroll
router.post('/admin/sequence/enroll', protectWithAdminFallback, async (req, res) => {
  try {
    const { prospectIds } = req.body;
    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return res.status(400).json({ success: false, error: 'prospectIds must be a non-empty array' });
    }
    const result = await outreachSequenceService.enrollProspects(prospectIds);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Enroll outreach sequence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
