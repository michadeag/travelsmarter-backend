const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

let anthropic = null;
async function getAnthropicClient() {
  if (process.env.ANTHROPIC_API_KEY) return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'anthropic_api_key'`).catch(() => ({ rows: [] }));
  const key = r.rows[0]?.value;
  if (!key) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: key });
}

const TOPICS = [
  { title: '10 Flight Hacks That Save Hundreds Every Year', category: 'flights', style: 'Modern Travel', color: 'Navy blue and coral' },
  { title: 'How to Travel Europe on $50 a Day', category: 'budget', style: 'Minimalist Adventure', color: 'Sage green and cream' },
  { title: 'The Beginner\'s Guide to Travel Credit Card Points', category: 'points_miles', style: 'Clean Financial', color: 'Deep blue and gold' },
  { title: 'The Ultimate Carry-On Packing Guide', category: 'packing', style: 'Modern Lifestyle', color: 'Warm orange and white' },
  { title: 'Digital Nomad Starter Kit: Work & Travel the World', category: 'nomad', style: 'Tech & Travel', color: 'Purple and teal' },
  { title: 'Travel Insurance: What It Covers & When You Need It', category: 'insurance', style: 'Professional Clean', color: 'Blue and white' },
  { title: 'Airport Secrets Frequent Flyers Don\'t Share', category: 'airports', style: 'Bold Infographic', color: 'Dark charcoal and yellow' },
  { title: 'Hidden Travel Destinations Worth Visiting in 2025', category: 'destinations', style: 'Wanderlust Photography', color: 'Terracotta and sand' },
  { title: 'Hotel Loyalty Programs: Free Nights Faster Than You Think', category: 'hotels', style: 'Elegant Hospitality', color: 'Burgundy and cream' },
  { title: 'Solo Travel Safety Guide: Everything You Need to Know', category: 'solo_travel', style: 'Empowering Adventure', color: 'Coral and white' },
];

const CTA_VARIANTS = [
  'Track flight deals automatically with TravelSmarter → travelsmarterapp.com/welcome.html',
  'Never miss a cheap flight again — TravelSmarter is free → travelsmarterapp.com/welcome.html',
  'TravelSmarter finds the deals. You book the trip → travelsmarterapp.com/welcome.html',
  'Free tool for smart travelers: TravelSmarter → travelsmarterapp.com/welcome.html',
];

class SlideShareService {
  constructor() {
    this.postCounter = 0;
    this.TOPICS = TOPICS;
  }

  async loadSettings() {
    try {
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });
      const r = await pool.query(`SELECT value FROM settings WHERE key = 'slideshare_post_counter'`);
      if (r.rows[0]) this.postCounter = parseInt(r.rows[0].value) || 0;
    } catch (e) { /* non-blocking */ }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({
      index: i,
      title: t.title,
      category: t.category,
      isNext: i === this.postCounter % TOPICS.length,
    }));
  }

  async generatePresentation(topicIndex = null) {
    await this.loadSettings();
    const index = topicIndex !== null ? topicIndex : this.postCounter % TOPICS.length;
    const topic = TOPICS[index % TOPICS.length];
    const includeCTA = this.postCounter % 3 === 0;
    const cta = CTA_VARIANTS[this.postCounter % CTA_VARIANTS.length];
    const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
    const link = `https://travelsmarterapp.com/welcome.html?ref=slideshare&deck=${slug}`;

    const softPitches = [
      `💡 **Pro tip:** [TravelSmarter](${link}) tracks flight deals automatically so you never miss a cheap window — it's free.`,
      `✈️ **Want this done for you?** [TravelSmarter](${link}) monitors prices and surfaces deals before they disappear — free to use.`,
      `🎯 **Smart traveler move:** Bookmark [TravelSmarter](${link}) — it does the deal-hunting so you can focus on planning the trip.`,
    ];

    const prompt = `You are a presentation designer for TravelSmarter — a smart travel app at travelsmarterapp.com.

## BRAND GUIDELINES for TravelSmarter:
- Primary color: Deep Navy (#1a2744)
- Accent color: Vibrant Coral (#ff6b4a)
- Secondary: Warm White (#fafaf8) and Light Sky (#e8f4fd)
- Font style: Clean modern sans-serif (like Inter or DM Sans)
- Logo text: "TravelSmarter" — always in coral on navy background
- Tone: Expert but warm, data-driven, empowering — "travel like a pro without the complexity"
- Tagline: "Travel Smarter. Not Harder."

## TASK
Create a Gamma AI prompt for a 12-slide presentation on: "${topic.title}"

## SLIDE STRUCTURE (write exact titles + 3-4 bullet points per slide):

Slide 1 — TITLE SLIDE
- Title: "${topic.title}"
- Subtitle: "A Free Guide by TravelSmarter"
- Visual: Full-bleed navy background, coral accent line, TravelSmarter branding
- Bottom: travelsmarterapp.com

Slides 2–4 — FOUNDATION (basics, why it matters, common mistakes)
Slides 5–7 — TACTICS (specific actionable tips with numbers/examples)
Slides 8–9 — ADVANCED (insider tips, tools, pro moves)

Slide 10 — SOFT PITCH (natural, not salesy)
- Title: "Make This Even Easier"
- Content: "${softPitches[this.postCounter % softPitches.length]}"
- Visual: Coral accent card on navy

Slide 11 — SUMMARY
- Top 5 takeaways from the presentation as a visual checklist

Slide 12 — CTA SLIDE
- Title: "Start Traveling Smarter — For Free"
- Big URL: ${link}
- Subtitle: "Flight deal tracking. Travel hacks. Zero cost."
- Visual: Full coral background, white text, TravelSmarter logo

## GAMMA FORMATTING INSTRUCTIONS:
- Use the brand colors above consistently throughout
- Every slide should have a bold headline, clean bullets, and generous white space
- Alternate between navy-background and white-background slides for visual rhythm
- Add travel-themed icons where appropriate (✈️ 🌍 💰 🎒 🏨)
- Make it feel premium — this is a free guide that should feel better than paid content

Write the complete Gamma prompt ready to paste into gamma.app → "New" → "Generate with AI".

---

## 2. SLIDESHARE METADATA
Title: (SEO-optimized, include main keyword, max 100 chars)
Description: (180-220 words, keyword-rich, conversational, naturally mention: ${link})
Tags: (12 comma-separated tags, no #, mix broad and specific)
Category: Education

Separate sections clearly with the ## headers.`;

    anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();

    // Parse sections
    const gammaMatch = raw.match(/##\s*1\.\s*GAMMA PROMPT\s*([\s\S]*?)(?=##\s*2\.)/i);
    const metaMatch = raw.match(/##\s*2\.\s*SLIDESHARE METADATA\s*([\s\S]*?)(?=##\s*3\.|$)/i);

    const gammaPrompt = gammaMatch ? gammaMatch[1].trim() : raw;
    const metaBlock = metaMatch ? metaMatch[1].trim() : '';

    const titleMatch = metaBlock.match(/^Title:\s*(.+)$/mi);
    const descMatch = metaBlock.match(/^Description:\s*([\s\S]*?)(?=^Tags:|$)/mi);
    const tagsMatch = metaBlock.match(/^Tags:\s*(.+)$/mi);

    const ssTitle = titleMatch ? titleMatch[1].trim() : topic.title;
    const ssDescription = descMatch ? descMatch[1].trim() : '';
    const ssTags = tagsMatch ? tagsMatch[1].trim() : 'travel, travel tips, budget travel, travel hacks';

    // Save to DB
    const dbResult = await pool.query(
      `INSERT INTO slideshare_posts (title, category, gamma_prompt, ss_title, ss_description, ss_tags, link, included_cta, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', NOW()) RETURNING id`,
      [topic.title, topic.category, gammaPrompt, ssTitle, ssDescription, ssTags, link, includeCTA]
    );

    this.postCounter++;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('slideshare_post_counter', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.postCounter)]
    );

    return {
      topic: topic.title,
      category: topic.category,
      gammaPrompt,
      ssTitle,
      ssDescription,
      ssTags,
      link,
      includeCTA,
      dbId: dbResult.rows[0].id,
    };
  }

  async markAsPosted(dbId, postUrl = null) {
    await pool.query(
      `UPDATE slideshare_posts SET status = 'posted', post_url = $1, posted_at = NOW() WHERE id = $2`,
      [postUrl || null, dbId]
    );
  }

  async getRecentPosts(limit = 20) {
    try {
      const r = await pool.query(
        `SELECT id, title, category, ss_title, post_url, included_cta, status, posted_at
         FROM slideshare_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return r.rows;
    } catch { return []; }
  }

  getStatus() {
    return {
      postCounter: this.postCounter,
      nextTopic: TOPICS[this.postCounter % TOPICS.length]?.title || null,
    };
  }
}

module.exports = new SlideShareService();
