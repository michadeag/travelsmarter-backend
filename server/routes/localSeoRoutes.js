const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const pool = require('../config/database');
const localSeoService = require('../services/localSeoService');
const twilioService = require('../services/twilioService');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.travelsmarterapp.com';

// Verifies the request actually came from Twilio (X-Twilio-Signature),
// using our own known public base URL rather than req.protocol/req.get('host')
// — those can be mangled behind a proxy/load balancer, while API_BASE_URL is
// exactly the URL we told Twilio to call when the number was configured.
function verifyTwilioWebhook(req, res, next) {
  const signature = req.headers['x-twilio-signature'];
  const url = `${API_BASE_URL}${req.originalUrl}`;
  if (!signature || !twilioService.verifySignature({ signature, url, params: req.body })) {
    console.warn('❌ Rejected Twilio webhook: invalid or missing signature', url);
    return res.status(401).send('Invalid signature');
  }
  next();
}

// @desc Brainstorm candidate (city, niche) combinations via AI — preview
// only, nothing is saved until confirmed via POST /admin/candidates.
// @route POST /api/local-seo/admin/candidates/generate
router.post('/admin/candidates/generate', protectWithAdminFallback, async (req, res) => {
  try {
    const { market, count } = req.body;
    const candidates = await localSeoService.generateCandidateCombinations({
      market: market || undefined,
      count: count || undefined,
    });
    res.status(200).json({ success: true, candidates });
  } catch (error) {
    console.error('Generate local SEO candidates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Confirm a set of candidates from the preview: AI-estimate their
// scores, compute the combined ranking score, and save them.
// @route POST /api/local-seo/admin/candidates
router.post('/admin/candidates', protectWithAdminFallback, async (req, res) => {
  try {
    const { combinations, market } = req.body;
    if (!Array.isArray(combinations) || combinations.length === 0) {
      return res.status(400).json({ success: false, error: 'combinations must be a non-empty array' });
    }

    const saved = [];
    const failed = [];

    for (const combo of combinations) {
      if (!combo.city || !combo.niche || !combo.keyword_phrase) {
        failed.push({ combo, error: 'city, niche, and keyword_phrase are required' });
        continue;
      }
      try {
        const scores = await localSeoService.estimateScores(combo);
        const combined_score = localSeoService.computeCombinedScore(scores);
        const monthly_value_estimate = localSeoService.computeMonthlyValueEstimate(scores);

        const result = await pool.query(
          `INSERT INTO local_seo_combinations
             (market, city, niche, keyword_phrase, target_keywords, search_volume_estimate, lead_price_estimate,
              ranking_potential_score, page1_ctr_estimate, monthly_value_estimate, combined_score,
              data_source, estimate_notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ai_estimate', $12, 'confirmed')
           ON CONFLICT (market, city, niche) DO NOTHING
           RETURNING *`,
          [
            market || 'pt-BR',
            combo.city,
            combo.niche,
            combo.keyword_phrase,
            combo.target_keywords && combo.target_keywords.length > 0 ? combo.target_keywords : [combo.keyword_phrase],
            scores.search_volume_estimate,
            scores.lead_price_estimate,
            scores.ranking_potential_score,
            scores.page1_ctr_estimate,
            monthly_value_estimate,
            combined_score,
            scores.estimate_notes || null,
          ]
        );
        if (result.rows.length > 0) {
          saved.push(result.rows[0]);
        } else {
          failed.push({ combo, error: 'Already exists for this market' });
        }
      } catch (err) {
        failed.push({ combo, error: err.message });
      }
    }

    res.status(201).json({ success: true, saved, failed });
  } catch (error) {
    console.error('Save local SEO candidates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc List combinations, ranked by combined_score, optionally filtered by status
// @route GET /api/local-seo/admin/candidates
router.get('/admin/candidates', protectWithAdminFallback, async (req, res) => {
  try {
    const { status, market } = req.query;
    const conditions = [];
    const params = [];
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (market) {
      params.push(market);
      conditions.push(`market = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM local_seo_combinations ${where} ORDER BY combined_score DESC NULLS LAST`,
      params
    );
    res.status(200).json({ success: true, combinations: result.rows });
  } catch (error) {
    console.error('List local SEO candidates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Full detail for one combination (incl. generated YouTube content)
// @route GET /api/local-seo/admin/candidates/:id
router.get('/admin/candidates/:id', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM local_seo_combinations WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combination not found' });
    }
    res.status(200).json({ success: true, combination: result.rows[0] });
  } catch (error) {
    console.error('Get local SEO candidate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Manually override any scoring field or status — recomputes
// combined_score if a scoring input changed, marks data_source='manual'.
// @route PATCH /api/local-seo/admin/candidates/:id
router.patch('/admin/candidates/:id', protectWithAdminFallback, async (req, res) => {
  try {
    const { search_volume_estimate, lead_price_estimate, ranking_potential_score, page1_ctr_estimate, status } = req.body;
    const scoreFieldsProvided = [search_volume_estimate, lead_price_estimate, ranking_potential_score, page1_ctr_estimate].some(
      (v) => v !== undefined
    );

    const existingResult = await pool.query(`SELECT * FROM local_seo_combinations WHERE id = $1`, [req.params.id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combination not found' });
    }
    const existing = existingResult.rows[0];

    const nextScores = {
      search_volume_estimate: search_volume_estimate ?? existing.search_volume_estimate,
      lead_price_estimate: lead_price_estimate ?? existing.lead_price_estimate,
      ranking_potential_score: ranking_potential_score ?? existing.ranking_potential_score,
      page1_ctr_estimate: page1_ctr_estimate ?? existing.page1_ctr_estimate,
    };
    const combined_score = scoreFieldsProvided
      ? localSeoService.computeCombinedScore(nextScores)
      : existing.combined_score;
    const monthly_value_estimate = scoreFieldsProvided
      ? localSeoService.computeMonthlyValueEstimate(nextScores)
      : existing.monthly_value_estimate;

    const result = await pool.query(
      `UPDATE local_seo_combinations
       SET search_volume_estimate = $1, lead_price_estimate = $2, ranking_potential_score = $3,
           page1_ctr_estimate = $4, monthly_value_estimate = $5, combined_score = $6,
           status = COALESCE($7, status),
           data_source = CASE WHEN $8 THEN 'manual' ELSE data_source END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        nextScores.search_volume_estimate,
        nextScores.lead_price_estimate,
        nextScores.ranking_potential_score,
        nextScores.page1_ctr_estimate,
        monthly_value_estimate,
        combined_score,
        status || null,
        scoreFieldsProvided,
        req.params.id,
      ]
    );
    res.status(200).json({ success: true, combination: result.rows[0] });
  } catch (error) {
    console.error('Update local SEO candidate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Remove a combination
// @route DELETE /api/local-seo/admin/candidates/:id
router.delete('/admin/candidates/:id', protectWithAdminFallback, async (req, res) => {
  try {
    await pool.query(`DELETE FROM local_seo_combinations WHERE id = $1`, [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete local SEO candidate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Process the next batch: generates YouTube script/description/tags
// for the top `batchSize` confirmed-but-unscripted combinations (highest
// combined_score first). Admin-triggered, not on a schedule — see
// project notes for why (control before automating).
// @route POST /api/local-seo/admin/batch/process-next
router.post('/admin/batch/process-next', protectWithAdminFallback, async (req, res) => {
  try {
    const { batchSize } = req.body;
    const result = await localSeoService.processNextBatch(batchSize || 10);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Process local SEO batch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Twilio number search/purchase (admin) ──

// @desc Search available Brazilian local numbers for a city — read-only,
// no cost.
// @route GET /api/local-seo/admin/twilio/available-numbers
router.get('/admin/twilio/available-numbers', protectWithAdminFallback, async (req, res) => {
  try {
    const { city, limit } = req.query;
    if (!city) {
      return res.status(400).json({ success: false, error: 'city is required' });
    }
    const numbers = await twilioService.searchAvailableNumbers({ city, limit: limit ? parseInt(limit, 10) : undefined });
    res.status(200).json({ success: true, numbers });
  } catch (error) {
    console.error('Search Twilio numbers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Purchases a specific number and wires it to this combination's
// call-forwarding webhook. Real, billed purchase — explicit admin action.
// @route POST /api/local-seo/admin/candidates/:id/phone-number
router.post('/admin/candidates/:id/phone-number', protectWithAdminFallback, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'phoneNumber is required' });
    }
    const result = await twilioService.purchaseNumberForCombination(req.params.id, phoneNumber);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Purchase Twilio number error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Lead recipients (admin) — up to 3 per combination ──

// @desc List recipients for one combination
// @route GET /api/local-seo/admin/candidates/:id/recipients
router.get('/admin/candidates/:id/recipients', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM local_seo_lead_recipients WHERE combination_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.status(200).json({ success: true, recipients: result.rows });
  } catch (error) {
    console.error('List local SEO recipients error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Add a recipient (max 3 per combination, matching the project spec)
// @route POST /api/local-seo/admin/candidates/:id/recipients
router.post('/admin/candidates/:id/recipients', protectWithAdminFallback, async (req, res) => {
  try {
    const { name, company_name, phone, email, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'name and phone are required' });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM local_seo_lead_recipients WHERE combination_id = $1`,
      [req.params.id]
    );
    if (parseInt(countResult.rows[0].count, 10) >= 3) {
      return res.status(400).json({ success: false, error: 'This combination already has 3 recipients (the maximum)' });
    }

    const result = await pool.query(
      `INSERT INTO local_seo_lead_recipients (combination_id, name, company_name, phone, email, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, name, company_name || null, phone, email || null, notes || null]
    );
    res.status(201).json({ success: true, recipient: result.rows[0] });
  } catch (error) {
    console.error('Add local SEO recipient error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Update a recipient (incl. toggling is_main_recipient)
// @route PATCH /api/local-seo/admin/recipients/:id
router.patch('/admin/recipients/:id', protectWithAdminFallback, async (req, res) => {
  try {
    const { name, company_name, phone, email, notes, is_main_recipient } = req.body;
    const result = await pool.query(
      `UPDATE local_seo_lead_recipients
       SET name = COALESCE($1, name), company_name = COALESCE($2, company_name),
           phone = COALESCE($3, phone), email = COALESCE($4, email), notes = COALESCE($5, notes),
           is_main_recipient = COALESCE($6, is_main_recipient), updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, company_name, phone, email, notes, is_main_recipient, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }
    res.status(200).json({ success: true, recipient: result.rows[0] });
  } catch (error) {
    console.error('Update local SEO recipient error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Remove a recipient
// @route DELETE /api/local-seo/admin/recipients/:id
router.delete('/admin/recipients/:id', protectWithAdminFallback, async (req, res) => {
  try {
    await pool.query(`DELETE FROM local_seo_lead_recipients WHERE id = $1`, [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete local SEO recipient error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Call event history for one combination
// @route GET /api/local-seo/admin/candidates/:id/calls
router.get('/admin/candidates/:id/calls', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.*, r.name AS answered_by_name
       FROM local_seo_call_events ce
       LEFT JOIN local_seo_lead_recipients r ON r.id = ce.answered_by_recipient_id
       WHERE ce.combination_id = $1
       ORDER BY ce.created_at DESC
       LIMIT 100`,
      [req.params.id]
    );
    res.status(200).json({ success: true, calls: result.rows });
  } catch (error) {
    console.error('List local SEO call events error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Voice webhooks (public — called by Twilio directly, verified via
// X-Twilio-Signature instead of admin auth) ──

// @desc Handles an inbound call to a combination's purchased number:
// simul-rings all recipients with a whisper greeting, and logs the call.
// @route POST /api/local-seo/voice/incoming
router.post('/voice/incoming', verifyTwilioWebhook, async (req, res) => {
  try {
    const { combinationId } = req.query;
    const { CallSid, From } = req.body;

    const comboResult = await pool.query(
      `SELECT twilio_phone_number FROM local_seo_combinations WHERE id = $1`,
      [combinationId]
    );
    const recipientsResult = await pool.query(
      `SELECT id, phone FROM local_seo_lead_recipients WHERE combination_id = $1 ORDER BY created_at ASC`,
      [combinationId]
    );

    await pool.query(
      `INSERT INTO local_seo_call_events (combination_id, call_sid, caller_number, status)
       VALUES ($1, $2, $3, 'ringing')`,
      [combinationId, CallSid, From]
    );

    const twiml = twilioService.buildIncomingCallTwiml({
      combinationId,
      recipients: recipientsResult.rows,
      callerId: comboResult.rows[0]?.twilio_phone_number,
    });

    res.type('text/xml').send(twiml);
  } catch (error) {
    console.error('Voice incoming webhook error:', error);
    res.status(500).send('Internal error');
  }
});

// @desc Played to whichever recipient picks up, before being bridged to the caller.
// @route POST /api/local-seo/voice/whisper
router.post('/voice/whisper', verifyTwilioWebhook, (req, res) => {
  res.type('text/xml').send(twilioService.buildWhisperTwiml());
});

// @desc Per-recipient leg status updates — marks who answered and the
// final call outcome/duration.
// @route POST /api/local-seo/voice/leg-status
router.post('/voice/leg-status', verifyTwilioWebhook, async (req, res) => {
  try {
    const { combinationId, recipientId } = req.query;
    const { CallStatus, CallDuration } = req.body;

    if (CallStatus === 'in-progress') {
      await pool.query(
        `UPDATE local_seo_call_events
         SET status = 'answered', answered_by_recipient_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM local_seo_call_events
           WHERE combination_id = $2 AND status IN ('ringing', 'no-answer')
           ORDER BY created_at DESC LIMIT 1
         )`,
        [recipientId, combinationId]
      );
    } else if (CallStatus === 'completed') {
      await pool.query(
        `UPDATE local_seo_call_events
         SET status = 'completed', duration_seconds = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM local_seo_call_events
           WHERE combination_id = $2 AND status = 'answered'
           ORDER BY created_at DESC LIMIT 1
         )`,
        [CallDuration ? parseInt(CallDuration, 10) : null, combinationId]
      );
    } else if (['no-answer', 'busy', 'failed', 'canceled'].includes(CallStatus)) {
      // Only downgrade a still-ringing event — never overwrite one another
      // leg already answered.
      await pool.query(
        `UPDATE local_seo_call_events
         SET status = 'no-answer', updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM local_seo_call_events
           WHERE combination_id = $1 AND status = 'ringing'
           ORDER BY created_at DESC LIMIT 1
         )`,
        [combinationId]
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Voice leg-status webhook error:', error);
    res.status(500).send('Internal error');
  }
});

module.exports = router;
