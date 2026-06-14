const { searchVideos } = require('../services/youtubeService');
const Anthropic = require('@anthropic-ai/sdk');

exports.searchVideos = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query required' });

    const videos = await searchVideos(q, 10);
    res.json({ success: true, data: videos });
  } catch (err) {
    console.error('YouTube search error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateComment = async (req, res) => {
  try {
    const { title, description, channel } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Video title required' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are a travel hacking expert. Write a helpful, genuine YouTube comment for this video that adds value and naturally mentions TravelSmarter (https://travelsmarterapp.com) as a free resource for travel hacking tips.

Video title: "${title}"
Channel: "${channel}"
Description snippet: "${description}"

Rules:
- Sound natural and genuine, NOT spammy
- Add a real insight or tip related to the video topic first
- Only mention TravelSmarter once at the end, casually
- Max 4 sentences
- No emojis, no "Great video!" openers
- Write in English

Return ONLY the comment text, nothing else.`
      }]
    });

    const comment = message.content[0].text.trim();
    res.json({ success: true, data: { comment } });
  } catch (err) {
    console.error('Comment generation error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
