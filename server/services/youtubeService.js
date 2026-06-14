const axios = require('axios');

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube videos by keyword
 */
async function searchVideos(query, maxResults = 10) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');

  // Search for videos
  const searchRes = await axios.get(`${YT_API_BASE}/search`, {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      relevanceLanguage: 'en',
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

  return statsRes.data.items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    description: v.snippet.description?.slice(0, 300) || '',
    publishedAt: v.snippet.publishedAt,
    views: parseInt(v.statistics.viewCount || 0),
    comments: parseInt(v.statistics.commentCount || 0),
    likes: parseInt(v.statistics.likeCount || 0),
    url: `https://youtube.com/watch?v=${v.id}`
  }));
}

module.exports = { searchVideos };
