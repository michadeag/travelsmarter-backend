const axios = require('axios');

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// One search pass for a single freshness window (publishedAfter = null means
// no date restriction / all-time). Returns ranked videos, possibly empty.
async function searchWindow(apiKey, query, maxResults, publishedAfter) {
  const params = {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: Math.min(25, maxResults * 2), // overfetch, we re-rank below
    relevanceLanguage: 'en',
    order: 'viewCount',
    key: apiKey,
  };
  if (publishedAfter) params.publishedAfter = publishedAfter;

  const searchRes = await axios.get(`${YT_API_BASE}/search`, { params });
  const items = searchRes.data.items || [];
  const videoIds = items.map(v => v.id && v.id.videoId).filter(Boolean).join(',');
  if (!videoIds) return []; // nothing this window — skip the stats call entirely

  const statsRes = await axios.get(`${YT_API_BASE}/videos`, {
    params: { part: 'statistics,snippet', id: videoIds, key: apiKey },
  });

  const now = Date.now();
  return (statsRes.data.items || []).map(v => {
    const ageDays = Math.max(0.25, (now - new Date(v.snippet.publishedAt).getTime()) / 86400000);
    const views = parseInt(v.statistics.viewCount || 0);
    return {
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      description: v.snippet.description?.slice(0, 300) || '',
      publishedAt: v.snippet.publishedAt,
      ageDays: Math.round(ageDays * 10) / 10,
      views,
      viewsPerDay: Math.round(views / ageDays), // momentum — the ranking signal
      comments: parseInt(v.statistics.commentCount || 0),
      likes: parseInt(v.statistics.likeCount || 0),
      url: `https://youtube.com/watch?v=${v.id}`,
    };
  })
    .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
    .slice(0, 10);
}

/**
 * Search YouTube videos by keyword, preferring FRESH videos with momentum —
 * an early comment on a video taking off right now beats one on an old
 * evergreen whose top comments are locked in. Niche topics (especially the
 * auto-generated daily-topic queries) often have zero videos in the last 7
 * days, which used to surface as a bare "no videos found". So this widens the
 * window step by step (7 → 30 → 90 days → all-time) and returns the first
 * window that yields results, reporting which one hit so the UI can note it.
 * Always ranks by views-per-day, so even the wider windows favour momentum.
 *
 * @returns {Promise<{videos: Array, windowDays: number|null}>}
 *   windowDays: 7 = fresh; 30/90 = widened fallback; null = no date filter.
 */
async function searchVideos(query, maxResults = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');

  const DAY = 24 * 60 * 60 * 1000;
  const windows = [7, 30, 90, null]; // fresh first, then progressively wider
  for (const days of windows) {
    const publishedAfter = days ? new Date(Date.now() - days * DAY).toISOString() : null;
    const videos = await searchWindow(apiKey, query, maxResults, publishedAfter);
    if (videos.length) return { videos, windowDays: days };
  }
  return { videos: [], windowDays: null };
}

module.exports = { searchVideos };
