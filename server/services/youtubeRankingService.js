/**
 * YouTube Ranking Service
 * Checks where a published video ranks in YouTube's own search results for
 * a given keyword, using the official YouTube Data API (search.list).
 *
 * Quota note: each search.list call costs 100 of the default 10,000 daily
 * quota units, regardless of how many results are requested per page — so
 * checking one keyword = one call = 100 units. Only the first page (up to
 * 50 results) is checked; a video not there is reported as "not in top 50"
 * rather than paying for further pages, which would multiply the cost per
 * keyword. A combination's full keyword cluster (5-10 keywords) therefore
 * costs roughly 500-1000 units per check — checks are admin-triggered only,
 * never scheduled, so quota spend stays under manual control.
 */

const axios = require('axios');
const pool = require('../config/database');

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Handles youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, and
// youtube.com/embed/ URL shapes.
function extractVideoId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
      const shortsMatch = parsed.pathname.match(/\/(shorts|embed)\/([^/?]+)/);
      if (shortsMatch) return shortsMatch[2];
    }
    return null;
  } catch {
    return null;
  }
}

// @desc Finds a video's position (1-based) in YouTube's own search results
// for one keyword, checking only the first 50 results (one API call).
// Returns null for position if the video isn't found there.
async function checkRankingForKeyword({ videoId, keyword }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');

  const response = await axios.get(`${YT_API_BASE}/search`, {
    params: { part: 'snippet', q: keyword, type: 'video', maxResults: 50, key: apiKey },
  });

  const items = response.data.items || [];
  const index = items.findIndex((item) => item.id?.videoId === videoId);
  return index === -1 ? null : index + 1;
}

// @desc Checks ranking for each of the given keywords, saves each result as
// a new history row (so position-over-time is tracked), and returns the
// results. A failure on one keyword doesn't abort the rest.
async function checkRankingForCombination({ combinationId, videoId, keywords }) {
  const results = [];

  for (const keyword of keywords) {
    try {
      const position = await checkRankingForKeyword({ videoId, keyword });
      await pool.query(
        `INSERT INTO local_seo_ranking_checks (combination_id, keyword, position) VALUES ($1, $2, $3)`,
        [combinationId, keyword, position]
      );
      results.push({ keyword, position, error: null });
    } catch (error) {
      console.error(`❌ Ranking check failed for "${keyword}":`, error.message);
      results.push({ keyword, position: null, error: error.message });
    }
  }

  return results;
}

module.exports = { extractVideoId, checkRankingForKeyword, checkRankingForCombination };
