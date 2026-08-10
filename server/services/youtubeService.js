const axios = require('axios');

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube videos by keyword — restricted to FRESH videos (last 7
 * days) and ranked by views-per-day momentum. For comment marketing, an
 * early comment on a video that is taking off right now is worth far more
 * than any comment on an old evergreen video whose top comments are locked in.
 */
async function searchVideos(query, maxResults = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');

  const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Search for fresh videos with traction (order=viewCount within the window)
  const searchRes = await axios.get(`${YT_API_BASE}/search`, {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: Math.min(25, maxResults * 2), // overfetch, we re-rank below
      relevanceLanguage: 'en',
      publishedAfter,
      order: 'viewCount',
      key: apiKey
    }
  });

  const videoIds = searchRes.data.items.map(v => v.id.videoId).join(',');

  // Get video statistics
  const statsRes = await axios.get(`${YT_API_BASE}/videos`, {
    params: {
      part: 'statistics,snippet',
      id: videoIds,
      key: apiKey
    }
  });

  const now = Date.now();
  return statsRes.data.items.map(v => {
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
      url: `https://youtube.com/watch?v=${v.id}`
    };
  })
    .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
    .slice(0, 10);
}

module.exports = { searchVideos };
