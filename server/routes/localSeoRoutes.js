const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const pool = require('../config/database');
const localSeoService = require('../services/localSeoService');

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

        const result = await pool.query(
          `INSERT INTO local_seo_combinations
             (market, city, niche, keyword_phrase, search_volume_estimate, lead_price_estimate,
              ranking_potential_score, combined_score, data_source, estimate_notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ai_estimate', $9, 'confirmed')
           ON CONFLICT (market, city, niche) DO NOTHING
           RETURNING *`,
          [
            market || 'pt-BR',
            combo.city,
            combo.niche,
            combo.keyword_phrase,
            scores.search_volume_estimate,
            scores.lead_price_estimate,
            scores.ranking_potential_score,
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
    const { search_volume_estimate, lead_price_estimate, ranking_potential_score, status } = req.body;
    const scoreFieldsProvided = [search_volume_estimate, lead_price_estimate, ranking_potential_score].some(
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
    };
    const combined_score = scoreFieldsProvided
      ? localSeoService.computeCombinedScore(nextScores)
      : existing.combined_score;

    const result = await pool.query(
      `UPDATE local_seo_combinations
       SET search_volume_estimate = $1, lead_price_estimate = $2, ranking_potential_score = $3,
           combined_score = $4, status = COALESCE($5, status),
           data_source = CASE WHEN $6 THEN 'manual' ELSE data_source END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        nextScores.search_volume_estimate,
        nextScores.lead_price_estimate,
        nextScores.ranking_potential_score,
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

module.exports = router;
