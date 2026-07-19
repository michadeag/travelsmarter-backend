/**
 * Local SEO Service
 * Pipeline for the local-service video-ranking + lead-gen feature:
 * brainstorm (city, niche) candidates, AI-estimate their scoring inputs
 * (search volume / lead price / ranking potential — no live keyword-tool
 * access, so these are heuristic starting points, not authoritative data),
 * rank them, and generate YouTube script/description/tags for the top
 * candidates in batches.
 */

const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const { extractText } = require('./anthropicUtils');

const client = new Anthropic();
const MODEL = 'claude-sonnet-5';

// ── Candidate brainstorming ──

/**
 * Brainstorms (city, niche, target_keywords) candidates for the given
 * market, avoiding pairs already in the DB. Returns a plain array —
 * nothing is saved here, this is a preview the admin reviews first.
 *
 * Each candidate carries a whole cluster of related money keywords
 * (target_keywords), not just one exact phrase — a single YouTube video
 * per (city, niche) is realistically optimized to rank for several
 * related long-tail searches at once (e.g. "marceneiro Curitiba",
 * "móveis planejados Curitiba", "armário embutido Curitiba" all point at
 * the same video). keyword_phrase stays as the primary/headline term
 * for display, target_keywords holds the full cluster including it.
 */
async function generateCandidateCombinations({ market = 'pt-BR', count = 20 } = {}) {
  const existingResult = await pool.query(
    `SELECT city, niche FROM local_seo_combinations WHERE market = $1`,
    [market]
  );
  const existingPairs = existingResult.rows.map((r) => `${r.city} / ${r.niche}`).join(', ') || '(none yet)';

  const prompt = `You are a local-SEO strategist for a Brazilian home-services lead-generation business (market: ${market}, Portuguese).

Suggest ${count} candidate (city, trade/niche) combinations for local-service YouTube videos aimed at generating leads for tradespeople (Handwerker — e.g. encanador/plumber, eletricista/electrician, dedetizador/pest control, chaveiro/locksmith, jardineiro/gardener, pintor/painter, marceneiro/carpenter, técnico em ar-condicionado/AC technician).

Favor a mix of:
- Large metro areas (São Paulo, Rio de Janeiro, Belo Horizonte, Brasília, Salvador, Curitiba, Recife, Porto Alegre, Fortaleza, Manaus) for volume
- Mid-size cities (300k–1.5M population) where competition for local video content is likely lower

Already have these combinations — do NOT repeat them: ${existingPairs}

For each combination, a SINGLE YouTube video will target a whole cluster of related money keywords, not just one exact phrase — e.g. for "marceneiro" in a city, related searches include the trade name + city, related service terms (e.g. "móveis planejados", "armário embutido"), price-intent terms ("orçamento marceneiro"), and quality-intent terms ("melhor marceneiro", "marceneiro perto de mim"). Give 5-10 realistic Portuguese search phrases a local customer would actually type or say — natural phrasing, not just "niche + city" concatenated each time.

Return ONLY a JSON array (no markdown, no explanation), each item shaped as:
{"city": "...", "niche": "...", "keyword_phrase": "the single most representative phrase, used as the headline keyword", "target_keywords": ["5 to 10 related phrases including the keyword_phrase itself"]}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = extractText(message);
  const parsed = JSON.parse(responseText);
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of candidates');
  return parsed;
}

// ── Scoring ──

/**
 * AI-estimates the three scoring inputs for one combination. These are
 * heuristic starting points (city size, general economic indicators,
 * typical competition patterns) — not real keyword-tool data. Falls back
 * to conservative mid-range defaults, clearly flagged, if the model call
 * fails or returns something unparseable.
 */
async function estimateScores({ city, niche, keyword_phrase, target_keywords }) {
  const fallback = {
    search_volume_estimate: 100,
    lead_price_estimate: 30,
    ranking_potential_score: 50,
    page1_ctr_estimate: 5,
    estimate_notes: 'Fallback estimate — AI estimation failed, treat as placeholder and correct manually.',
  };

  const keywordCluster = target_keywords && target_keywords.length > 0 ? target_keywords : [keyword_phrase];

  try {
    const prompt = `You are a local-SEO analyst estimating rough, directional numbers for a Brazilian local-service search opportunity. You do NOT have access to real keyword tools — give your best-reasoned heuristic estimate based on general knowledge (city population/economic level, typical competition for local trade services, how saturated local YouTube content is for this kind of niche).

City: ${city}
Niche/trade: ${niche}
Target keyword cluster (ONE video will target all of these together): ${keywordCluster.map((k) => `"${k}"`).join(', ')}

Estimate:
- search_volume_estimate: rough COMBINED monthly search volume across the WHOLE keyword cluster together (integer — sum the realistic volume of each variant, not just the primary phrase; usually hundreds to a few thousand for a full cluster, not more)
- lead_price_estimate: plausible price in BRL a business would pay for one qualified lead of this type in this city (number, typically R$10–150 for trades)
- ranking_potential_score: 0-100, how easy this would be to rank a new YouTube channel for (100 = very easy/low competition, 0 = very hard/saturated)
- page1_ctr_estimate: percentage (0-100) of the monthly searches that would realistically turn into an actual lead/call if this video holds a page-1 YouTube ranking for the keyphrase (typically 2-15% for local trade searches — factor in search intent and how much of the traffic is likely just browsing vs. ready to call)
- estimate_notes: one or two sentences explaining your reasoning and key assumptions

Return ONLY a JSON object (no markdown, no explanation):
{"search_volume_estimate": 0, "lead_price_estimate": 0, "ranking_potential_score": 0, "page1_ctr_estimate": 0, "estimate_notes": "..."}`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const parsed = JSON.parse(extractText(message));
    if (
      typeof parsed.search_volume_estimate !== 'number' ||
      typeof parsed.lead_price_estimate !== 'number' ||
      typeof parsed.ranking_potential_score !== 'number' ||
      typeof parsed.page1_ctr_estimate !== 'number'
    ) {
      throw new Error('Missing expected numeric fields in estimate response');
    }
    return parsed;
  } catch (error) {
    console.error(`❌ Score estimation failed for ${city}/${niche}, using fallback:`, error.message);
    return fallback;
  }
}

// @desc Rough monthly revenue-potential indicator: how many of the
// estimated monthly searches would realistically convert to a paid lead
// at a page-1 ranking, times what that lead is worth. Not weighted into
// combined_score — shown as a separate, more concrete "what could this be
// worth" number alongside the abstract 0-100 ranking score.
function computeMonthlyValueEstimate({ search_volume_estimate, lead_price_estimate, page1_ctr_estimate }) {
  const volume = search_volume_estimate || 0;
  const price = lead_price_estimate || 0;
  const ctr = Math.min(100, Math.max(0, page1_ctr_estimate || 0));
  return Math.round(volume * price * (ctr / 100) * 100) / 100;
}

/**
 * Blends the three (very differently-scaled) inputs into one comparable
 * 0-100ish ranking score. This is a deliberately simple, documented
 * formula meant for rough prioritization, not a precise model:
 *  - search volume: capped at 2000/mo = 100 points (few local long-tail
 *    terms realistically exceed that)
 *  - lead price: capped at R$100 = 100 points (matches the R$8-150
 *    Brazilian CPL benchmark range researched for this project)
 *  - ranking potential: already 0-100, used as-is
 * Weighted 35% volume / 35% lead price / 30% ranking potential — volume
 * and price both need to be decent for a combination to be worth
 * pursuing at all, ranking potential matters slightly less since it's
 * the softest of the three estimates.
 */
function computeCombinedScore({ search_volume_estimate, lead_price_estimate, ranking_potential_score }) {
  const normVolume = Math.min(100, (search_volume_estimate || 0) / 20);
  const normPrice = Math.min(100, lead_price_estimate || 0);
  const normRanking = Math.min(100, Math.max(0, ranking_potential_score || 0));
  return Math.round((0.35 * normVolume + 0.35 * normPrice + 0.30 * normRanking) * 100) / 100;
}

// ── YouTube content generation ──

/**
 * Generates a YouTube title/script/description/tags for one combination,
 * in Portuguese. Returns null on failure rather than throwing, so a
 * failure on one combination doesn't abort the whole batch — the caller
 * leaves that combination un-scripted for the next batch run to retry.
 */
async function generateYoutubeContent({ city, niche, keyword_phrase, target_keywords }) {
  const keywordCluster = target_keywords && target_keywords.length > 0 ? target_keywords : [keyword_phrase];

  try {
    const prompt = `You are a scriptwriter for short, helpful local-service YouTube videos in Brazilian Portuguese, for a lead-generation business.

City: ${city}
Trade/niche: ${niche}
Target keyword cluster — weave ALL of these naturally across the script/description/tags so this ONE video can rank for each of them, not just the first one: ${keywordCluster.map((k) => `"${k}"`).join(', ')}

Write content for a 3-5 minute YouTube video that helps a local resident evaluate/choose a ${niche} in ${city} (practical tips, red flags to avoid, what fair pricing looks like) — genuinely useful, not a thinly-veiled ad. It should naturally rank for every phrase in the keyword cluster above, not just the primary one.

Return ONLY a JSON object (no markdown, no explanation):
{
  "youtube_title": "under 100 chars, includes the city and niche naturally",
  "youtube_script": "full spoken script, 3-5 minutes reading length, conversational Brazilian Portuguese, naturally touching on multiple keyword-cluster phrases/topics (e.g. pricing, related services) so the content genuinely covers them",
  "youtube_description": "SEO-optimized description, 150-300 words, works in several of the cluster keywords naturally (not just the primary one), ends with a call to action",
  "youtube_tags": ["10 to 15 tags covering the primary phrase AND the other cluster keywords"]
}`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const parsed = JSON.parse(extractText(message));
    if (!parsed.youtube_script || !parsed.youtube_description) {
      throw new Error('Missing expected fields in generated content');
    }
    return parsed;
  } catch (error) {
    console.error(`❌ YouTube content generation failed for ${city}/${niche}:`, error.message);
    return null;
  }
}

/**
 * Processes the next batch: the top `batchSize` 'confirmed' combinations
 * (by combined_score, highest first) that don't have a script yet, in
 * one incrementing batch number. Safe to call repeatedly — combinations
 * that fail generation stay un-scripted and are picked up by the next call.
 */
async function processNextBatch(batchSize = 10) {
  const batchNumberResult = await pool.query(
    `SELECT COALESCE(MAX(batch_number), 0) + 1 AS next_batch FROM local_seo_combinations`
  );
  const batchNumber = batchNumberResult.rows[0].next_batch;

  const candidatesResult = await pool.query(
    `SELECT id, city, niche, keyword_phrase, target_keywords
     FROM local_seo_combinations
     WHERE status = 'confirmed' AND youtube_script IS NULL
     ORDER BY combined_score DESC NULLS LAST
     LIMIT $1`,
    [batchSize]
  );

  let succeeded = 0;
  let failed = 0;

  for (const row of candidatesResult.rows) {
    const content = await generateYoutubeContent(row);
    if (content) {
      await pool.query(
        `UPDATE local_seo_combinations
         SET youtube_title = $1, youtube_script = $2, youtube_description = $3, youtube_tags = $4,
             status = 'scripted', batch_number = $5, scripted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [content.youtube_title || null, content.youtube_script, content.youtube_description, content.youtube_tags || [], batchNumber, row.id]
      );
      succeeded++;
    } else {
      failed++;
    }
  }

  return { processed: candidatesResult.rows.length, succeeded, failed, batchNumber };
}

module.exports = {
  generateCandidateCombinations,
  estimateScores,
  computeCombinedScore,
  computeMonthlyValueEstimate,
  generateYoutubeContent,
  processNextBatch,
};
