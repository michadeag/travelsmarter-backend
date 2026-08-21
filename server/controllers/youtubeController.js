const { searchVideos } = require('../services/youtubeService');
const { TOOLS } = require('../services/toolLeadEmailSequence');
const Anthropic = require('@anthropic-ai/sdk');

// Pick the tool tips most relevant to a video title/description, as raw
// material for a comment that demonstrates expertise instead of praising.
function relevantTips(title, description, n = 4) {
  const text = `${title} ${description}`.toLowerCase();
  const scored = TOOLS.map(t => {
    const words = `${t.name} ${t.hook}`.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3);
    const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
    return { tip: t.tip, score };
  }).sort((a, b) => b.score - a.score);
  const top = scored.filter(t => t.score > 0).slice(0, n);
  // fall back to a random sample so the model always has material
  return (top.length ? top : scored.sort(() => Math.random() - 0.5).slice(0, n)).map(t => t.tip);
}

// @desc Daily rotating comment-marketing topic: one free tool per day
//   (deterministic day-of-year rotation, same idea as the video pipeline)
//   plus ready-made YouTube search queries for it.
// @route GET /api/youtube/daily-topic
exports.dailyTopic = (req, res) => {
  const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
  const tool = TOOLS[dayOfYear % TOOLS.length];
  const base = tool.name
    .replace(/Checker|Calculator|Generator|Converter/gi, '')
    .replace(/&.*$/, '')
    .trim();
  res.json({
    success: true,
    data: {
      tool: tool.name,
      hook: tool.hook,
      tip: tool.tip,
      queries: [
        `${base} travel tips`,
        `${base} mistakes`,
        `travel hacks ${base.toLowerCase()}`,
      ],
    },
  });
};

exports.searchVideos = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query required' });

    const { videos, windowDays } = await searchVideos(q, 10);
    res.json({ success: true, data: videos, windowDays });
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
        content: `Write a YouTube comment for this travel video. The goal: demonstrate so much genuine expertise that viewers get curious and click the commenter's profile. The comment itself must contain NO link and NO brand mention — the profile does that work.

Video title: "${title}"
Channel: "${channel}"
Description snippet: "${description}"

The comment formula:
1. One short acknowledgment of the video's specific topic (not generic praise)
2. ONE concrete, surprising, useful fact or number the video likely didn't cover — pick and adapt the best-fitting one from the verified facts below
3. Optionally a brief first-person touch ("saved me $180 last month", "learned that the hard way")

Verified facts to draw from (pick ONE, rephrase naturally):
${relevantTips(title, description).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Rules:
- 2-3 sentences max, conversational US English
- NO links, NO brand names, NO "check out", NO call to action
- No "Great video!" openers, at most one emoji or none
- Must read like a knowledgeable traveler, not a marketer

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
