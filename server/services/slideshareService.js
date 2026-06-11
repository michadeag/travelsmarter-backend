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

    const prompt = `You are a presentation designer creating a SlideShare deck on travel for a smart travel app.

Topic: "${topic.title}"
Category: ${topic.category}

Generate two things:

## 1. GAMMA PROMPT
Write a detailed prompt for Gamma AI (gamma.app) to create a beautiful presentation. Include:
- Exact slide count: 10 slides
- Visual style: ${topic.style}
- Color scheme: ${topic.color}
- Slide-by-slide structure with titles and key bullet points (2-3 per slide)
- Slide 1: Title slide with subtitle "A guide by TravelSmarter"
- Slides 2-9: Content slides with specific, actionable travel tips
- Slide 10: CTA slide — "Start traveling smarter for free" with URL: ${link}
- Tone: Expert but friendly, data-driven where possible
Format the Gamma prompt clearly so it can be copy-pasted directly.

## 2. SLIDESHARE METADATA
Title: (SEO-optimized, max 100 chars)
Description: (150-200 words, keyword-rich, includes: ${link})
Tags: (10-12 comma-separated tags, no #)
Category: Education

${includeCTA ? `## 3. CTA LINE (include naturally in description):\n"${cta}"` : ''}

Separate each section clearly with the ## headers.`;

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
