const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const cron = require('node-cron');
const FormData = require('form-data');

let anthropic = null;
async function getAnthropicClient() {
  if (process.env.ANTHROPIC_API_KEY) return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'anthropic_api_key'`).catch(() => ({ rows: [] }));
  const key = r.rows[0]?.value;
  if (!key) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: key });
}

const TOPICS = [
  { title: 'The Ultimate Guide to Finding Cheap Flights: 12 Strategies That Actually Work', category: 'flights', tags: ['cheap flights', 'travel hacks', 'budget travel'] },
  { title: 'How to Travel Europe on $50 a Day (Without Sacrificing Experience)', category: 'budget', tags: ['budget travel', 'Europe', 'backpacking'] },
  { title: 'Credit Card Points for Beginners: How to Fly Business Class for Free', category: 'points_miles', tags: ['points and miles', 'business class', 'travel rewards'] },
  { title: 'The Best Travel Apps Every Traveler Needs in 2025', category: 'tools', tags: ['travel apps', 'travel tools', 'travel tips'] },
  { title: 'How to Pack a Carry-On for 2 Weeks: The Minimalist Packing List', category: 'packing', tags: ['packing tips', 'carry-on', 'minimalist travel'] },
  { title: 'Digital Nomad Destinations: 10 Countries With Fast WiFi and Low Cost of Living', category: 'nomad', tags: ['digital nomad', 'remote work', 'travel destinations'] },
  { title: 'Travel Insurance Explained: What It Covers, What It Doesn\'t, and When You Need It', category: 'insurance', tags: ['travel insurance', 'travel planning', 'travel tips'] },
  { title: 'Airport Hacks Frequent Flyers Swear By (Most People Don\'t Know These)', category: 'airports', tags: ['airport hacks', 'frequent flyer', 'travel tips'] },
  { title: 'Hidden Gem Destinations: 8 Places to Visit Before They Get Overrun by Tourists', category: 'destinations', tags: ['hidden gems', 'travel destinations', 'off the beaten path'] },
  { title: 'How Hotel Loyalty Programs Work — And How to Get Free Nights Faster', category: 'hotels', tags: ['hotel loyalty', 'free nights', 'travel rewards'] }
];

const CTA_VARIANTS = [
  `<p><em>One tool that makes trip planning much easier: <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> — free app that tracks flight deals and travel hacks automatically. Worth bookmarking before your next trip.</em></p>`,
  `<p><em>If you want to stay ahead of flight deals without spending hours searching, check out <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> — it's completely free and does the heavy lifting for you.</em></p>`,
  `<p><em>Small tip: I use <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> to track cheap flight windows — free tool, surprisingly effective for finding deals before they disappear.</em></p>`,
  `<p><em>Want to travel smarter? <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> is a free app built for exactly this — flight deal tracking, travel hacks, no noise. Give it a try.</em></p>`,
];

class WordPressService {
  constructor() {
    this.siteUrl = null;
    this.username = null;
    this.appPassword = null;
    this.ideogramKey = null;
    this.frequencyHours = 48;
    this.autoPosting = false;
    this.postCounter = 0;
    this.schedulerJobs = [];
    this.TOPICS = TOPICS;
  }

  async loadSettings() {
    try {
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });

      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key IN (
          'wordpress_site_url','wordpress_username','wordpress_app_password',
          'wordpress_frequency_hours','wordpress_auto_posting','wordpress_post_counter',
          'ideogram_api_key'
        )`
      );
      result.rows.forEach(({ key, value }) => {
        if (key === 'wordpress_site_url') this.siteUrl = value?.replace(/\/$/, '');
        if (key === 'wordpress_username') this.username = value;
        if (key === 'wordpress_app_password') this.appPassword = value;
        if (key === 'wordpress_frequency_hours') this.frequencyHours = parseInt(value) || 48;
        if (key === 'wordpress_auto_posting') this.autoPosting = value === 'true';
        if (key === 'wordpress_post_counter') this.postCounter = parseInt(value) || 0;
        if (key === 'ideogram_api_key') this.ideogramKey = value;
      });

      return this.isConfigured();
    } catch (err) {
      console.error('WordPress: loadSettings error:', err.message);
      return false;
    }
  }

  isConfigured() {
    return !!(this.siteUrl && this.username && this.appPassword);
  }

  async testConnection() {
    const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    const res = await axios.get(`${this.siteUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    return { id: res.data.id, name: res.data.name, url: this.siteUrl };
  }

  async generateArticle(topic, includeCTA) {
    const ctaSection = includeCTA
      ? `\n\n${CTA_VARIANTS[this.postCounter % CTA_VARIANTS.length]}`
      : '';

    const softPitchVariants = [
      `Tools like <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> make this effortless — it tracks flight deals and travel hacks automatically so you never miss a window.`,
      `This is where <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> comes in handy — a free tool that monitors cheap flight windows and surfaces the best deals before they disappear.`,
      `<a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> is a free app built exactly for this — it watches prices and alerts you when the right moment hits.`,
      `Apps like <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> do the heavy lifting here — free to use and surprisingly effective at catching deals most travelers miss.`,
      `That's the kind of edge <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> gives you — a free flight deal tracker that works quietly in the background while you focus on planning.`,
    ];
    // Pick 3 different variants for this article
    const counter = this.postCounter;
    const picks = [
      softPitchVariants[counter % softPitchVariants.length],
      softPitchVariants[(counter + 2) % softPitchVariants.length],
      softPitchVariants[(counter + 4) % softPitchVariants.length],
    ];

    const prompt = `You are a travel expert writing a high-quality SEO blog post for WordPress.

Title: "${topic.title}"
Category: ${topic.category}

Write a complete blog post that:
- Opens with an engaging 2-3 sentence intro (no "In this article" or "Today we'll cover" phrases)
- Has 5-7 clear H2 sections, each with 150-200 words of useful, specific content
- Includes real examples, numbers, and actionable tips throughout
- Uses natural, conversational tone — not corporate or listicle-style
- Closes with a 2-3 sentence conclusion that encourages action
- Total length: 900-1200 words

IMPORTANT — weave these 3 sentences naturally into the article body, one each in 3 different sections (not all at the end, not in the intro). Place each where it fits the surrounding advice:
1. "${picks[0]}"
2. "${picks[1]}"
3. "${picks[2]}"

Format as clean HTML using only: <h2>, <p>, <ul>, <li>, <strong>, <em>, <a>
Do NOT include <html>, <head>, <body> wrapper tags. No inline styles.
Only output the HTML content, nothing else.`;

    anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const body = response.content[0].text.trim();
    return { title: topic.title, body, category: topic.category, tags: topic.tags };
  }

  async publishPost(title, body, featuredMediaId = null) {
    if (!this.isConfigured()) throw new Error('WordPress nicht konfiguriert.');
    const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');

    const payload = { title, content: body, status: 'publish' };
    if (featuredMediaId) payload.featured_media = featuredMediaId;

    const response = await axios.post(
      `${this.siteUrl}/wp-json/wp/v2/posts`,
      payload,
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
    );

    return { id: String(response.data.id), url: response.data.link };
  }

  async generateFeaturedImage(topic) {
    if (!this.ideogramKey) return null;
    const prompt = `Professional travel blog header image for an article titled "${topic.title}".
Cinematic photography style, wide landscape format, vibrant colors, wanderlust feeling.
No text, no watermarks, no logos. Suitable for a travel blog featured image.`;
    try {
      const response = await axios.post(
        'https://api.ideogram.ai/generate',
        {
          image_request: {
            prompt,
            model: 'V_2',
            aspect_ratio: 'ASPECT_16_9',
            style_type: 'REALISTIC',
            magic_prompt_option: 'OFF'
          }
        },
        { headers: { 'Api-Key': this.ideogramKey, 'Content-Type': 'application/json' } }
      );
      const imageUrl = response.data?.data?.[0]?.url;
      if (!imageUrl) return null;
      console.log(`📝 WordPress: image generated → ${imageUrl.substring(0, 60)}...`);
      return imageUrl;
    } catch (err) {
      console.warn('WordPress: image generation failed:', err.message);
      return null;
    }
  }

  async uploadImageToWordPress(imageUrl, title) {
    const auth = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    // Download image buffer
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgRes.data);
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}.jpg`;

    const form = new FormData();
    form.append('file', buffer, { filename, contentType: 'image/jpeg' });

    const uploadRes = await axios.post(
      `${this.siteUrl}/wp-json/wp/v2/media`,
      form,
      { headers: { Authorization: `Basic ${auth}`, ...form.getHeaders() } }
    );
    console.log(`📝 WordPress: image uploaded, media ID=${uploadRes.data.id}`);
    return uploadRes.data.id;
  }

  async createAndPost(topicIndex = null) {
    await this.loadSettings();
    if (!this.isConfigured()) throw new Error('WordPress nicht konfiguriert — URL, Username und App Password in Settings eintragen.');

    const index = topicIndex !== null ? topicIndex : this.postCounter % TOPICS.length;
    this.postCounter++;
    const includeCTA = this.postCounter % 3 === 0;
    const topic = TOPICS[index % TOPICS.length];

    console.log(`📝 WordPress: generating "${topic.title}" (CTA: ${includeCTA})`);

    // Generate article and image in parallel
    const [articleResult, imageUrl] = await Promise.all([
      this.generateArticle(topic, includeCTA),
      this.generateFeaturedImage(topic)
    ]);
    const { title, body, category, tags } = articleResult;

    // Upload image, then publish post
    let featuredMediaId = null;
    if (imageUrl) {
      try { featuredMediaId = await this.uploadImageToWordPress(imageUrl, title); }
      catch (err) { console.warn('WordPress: image upload failed, posting without image:', err.message); }
    }

    const { id, url } = await this.publishPost(title, body, featuredMediaId);
    console.log(`📝 WordPress: published → ${url}`);

    await this._logPost({ title, body, category, wpPostId: id, wpUrl: url, includedCTA: includeCTA });
    return { title, category, wpPostId: id, wpUrl: url, includedCTA: includeCTA };
  }

  async _logPost({ title, body, category, wpPostId, wpUrl, includedCTA }) {
    try {
      await pool.query(
        `INSERT INTO wordpress_posts (title, body, category, wp_post_id, wp_url, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())`,
        [title, body, category, wpPostId, wpUrl, includedCTA]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('wordpress_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('WordPress: failed to log post:', err.message);
    }
  }

  startScheduler() {
    if (this.schedulerJobs.length > 0) return { started: false, reason: 'Scheduler läuft bereits' };
    if (!this.isConfigured()) return { started: false, reason: 'WordPress nicht konfiguriert' };

    // Post every 2 days at 10:00 AM UTC
    const job = cron.schedule('0 10 */2 * *', async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ WordPress: auto-published "${result.title}"`);
      } catch (err) {
        console.error('WordPress scheduler error:', err.message);
      }
    }, { timezone: 'UTC' });

    this.schedulerJobs.push(job);
    console.log('📝 WordPress: scheduler started — every 2 days at 10:00 UTC');
    return { started: true, schedule: 'every 2 days at 10:00 UTC' };
  }

  stopScheduler() {
    if (this.schedulerJobs.length === 0) return { stopped: false, reason: 'Scheduler läuft nicht' };
    this.schedulerJobs.forEach(j => j.stop());
    this.schedulerJobs = [];
    return { stopped: true };
  }

  async getRecentPosts(limit = 20) {
    try {
      const result = await pool.query(
        `SELECT id, title, category, wp_url, included_cta, status, posted_at
         FROM wordpress_posts ORDER BY posted_at DESC LIMIT $1`, [limit]
      );
      return result.rows;
    } catch { return []; }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({ index: i, title: t.title, category: t.category }));
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      siteUrl: this.siteUrl,
      schedulerRunning: this.schedulerJobs.length > 0,
      autoPosting: this.autoPosting,
      frequencyHours: this.frequencyHours,
      postCounter: this.postCounter
    };
  }
}

module.exports = new WordPressService();
