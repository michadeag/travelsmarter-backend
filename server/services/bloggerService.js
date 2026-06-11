const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const cron = require('node-cron');

let anthropic = null;
async function getAnthropicClient() {
  if (process.env.ANTHROPIC_API_KEY) return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'anthropic_api_key'`).catch(() => ({ rows: [] }));
  const key = r.rows[0]?.value;
  if (!key) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: key });
}

const TOPICS = [
  { title: 'The Ultimate Guide to Finding Cheap Flights: 12 Strategies That Actually Work', category: 'flights' },
  { title: 'How to Travel Europe on $50 a Day (Without Sacrificing Experience)', category: 'budget' },
  { title: 'Credit Card Points for Beginners: How to Fly Business Class for Free', category: 'points_miles' },
  { title: 'The Best Travel Apps Every Traveler Needs in 2025', category: 'tools' },
  { title: 'How to Pack a Carry-On for 2 Weeks: The Minimalist Packing List', category: 'packing' },
  { title: 'Digital Nomad Destinations: 10 Countries With Fast WiFi and Low Cost of Living', category: 'nomad' },
  { title: 'Travel Insurance Explained: What It Covers, What It Doesn\'t, and When You Need It', category: 'insurance' },
  { title: 'Airport Hacks Frequent Flyers Swear By (Most People Don\'t Know These)', category: 'airports' },
  { title: 'Hidden Gem Destinations: 8 Places to Visit Before They Get Overrun by Tourists', category: 'destinations' },
  { title: 'How Hotel Loyalty Programs Work — And How to Get Free Nights Faster', category: 'hotels' }
];

class BloggerService {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.refreshToken = null;
    this.blogId = null;
    this.ideogramKey = null;
    this.frequencyHours = 48;
    this.autoPosting = false;
    this.postCounter = 0;
    this.schedulerJobs = [];
    this.redirectUri = 'https://api.travelsmarterapp.com/api/blogger/callback';
    this.TOPICS = TOPICS;
  }

  async loadSettings() {
    try {
      // Re-initialize Anthropic client with key from DB if available
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key IN (
          'google_client_id','google_client_secret','google_refresh_token',
          'blogger_blog_id','blogger_frequency_hours','blogger_auto_posting',
          'blogger_post_counter','ideogram_api_key'
        )`
      );
      result.rows.forEach(({ key, value }) => {
        if (key === 'google_client_id') this.clientId = value;
        if (key === 'google_client_secret') this.clientSecret = value;
        if (key === 'google_refresh_token') this.refreshToken = value;
        if (key === 'blogger_blog_id') this.blogId = value;
        if (key === 'blogger_frequency_hours') this.frequencyHours = parseInt(value) || 48;
        if (key === 'blogger_auto_posting') this.autoPosting = value === 'true';
        if (key === 'blogger_post_counter') this.postCounter = parseInt(value) || 0;
        if (key === 'ideogram_api_key') this.ideogramKey = value;
      });
    } catch (err) {
      console.error('Blogger: loadSettings error:', err.message);
    }
  }

  async getAccessToken() {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('Google OAuth2 credentials not configured. Connect your Google account first.');
    }
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token'
    });
    return response.data.access_token;
  }

  getAuthUrl() {
    if (!this.clientId) throw new Error('Google Client ID not configured.');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/blogger',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    if (!this.clientId || !this.clientSecret) throw new Error('Google OAuth2 credentials not configured.');
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    });
    const { refresh_token, access_token } = response.data;
    if (!refresh_token) throw new Error('No refresh_token returned — ensure access_type=offline and prompt=consent.');
    this.refreshToken = refresh_token;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('google_refresh_token', $1, 'text')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [refresh_token]
    );
    return { refresh_token, access_token };
  }

  async fetchBlogId(accessToken) {
    const response = await axios.get('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const blogs = response.data.items || [];
    if (blogs.length === 0) throw new Error('No Blogger blogs found for this Google account.');
    return blogs.map(b => ({ id: b.id, name: b.name, url: b.url }));
  }

  async generateImage(topic) {
    if (!this.ideogramKey) return null;
    try {
      const response = await axios.post(
        'https://api.ideogram.ai/generate',
        { image_request: { prompt: `Professional travel blog header image for "${topic.title}". Cinematic photography, vibrant colors, wanderlust feeling. No text, no watermarks.`, model: 'V_2', aspect_ratio: 'ASPECT_16_9', style_type: 'REALISTIC', magic_prompt_option: 'OFF' } },
        { headers: { 'Api-Key': this.ideogramKey, 'Content-Type': 'application/json' } }
      );
      return response.data?.data?.[0]?.url || null;
    } catch (err) { console.warn('Blogger: image generation failed:', err.message); return null; }
  }

  async generateArticle(topic) {
    const softPitchVariants = [
      `Tools like <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> make this effortless — it tracks flight deals automatically so you never miss a cheap window.`,
      `This is where <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> helps — a free app that monitors prices and surfaces deals before they disappear.`,
      `<a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> is a free tool built exactly for this — it watches flight prices and alerts you at the right moment.`,
      `Apps like <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> do the heavy lifting here — free to use and great at catching deals most travelers miss.`,
      `That's the kind of edge <a href="https://travelsmarterapp.com/welcome.html">TravelSmarter</a> gives you — a free flight deal tracker that works quietly in the background.`,
    ];
    const c = this.postCounter;
    const picks = [
      softPitchVariants[c % softPitchVariants.length],
      softPitchVariants[(c + 2) % softPitchVariants.length],
      softPitchVariants[(c + 4) % softPitchVariants.length],
    ];

    const prompt = `You are a travel expert writing a high-quality SEO blog post for Blogger.

Title: "${topic.title}"
Category: ${topic.category}

Write a complete blog post that:
- Opens with an engaging 2-3 sentence intro (no "In this article" phrases)
- Has 5–7 clear H2 sections, each with 150–200 words of useful, specific content
- Includes real examples, numbers, and actionable tips throughout
- Uses natural, conversational tone
- Closes with a 2-3 sentence conclusion
- Total length: 900–1200 words

IMPORTANT — weave these 3 sentences naturally into the body, one per section:
1. "${picks[0]}"
2. "${picks[1]}"
3. "${picks[2]}"

Format as clean HTML using only: <h2>, <p>, <ul>, <li>, <strong>, <em>, <a>
Do NOT include wrapper tags. No inline styles. Only output the HTML.`;

    anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    return { title: topic.title, body: response.content[0].text.trim(), category: topic.category };
  }

  async publishPost(accessToken, title, body, labels) {
    if (!this.blogId) throw new Error('Blogger Blog ID not configured.');
    const response = await axios.post(
      `https://www.googleapis.com/blogger/v3/blogs/${this.blogId}/posts`,
      { title, content: body, labels },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return { id: response.data.id, url: response.data.url };
  }

  async createAndPost(topicIndex = null) {
    await this.loadSettings();
    if (!this.refreshToken) throw new Error('Google account not connected — authorize in the Blogger tab first.');
    if (!this.blogId) throw new Error('Blog ID not set — load blogs and select one first.');

    const index = topicIndex !== null ? topicIndex : this.postCounter % TOPICS.length;
    this.postCounter++;
    const topic = TOPICS[index % TOPICS.length];

    console.log(`📰 Blogger: generating "${topic.title}"`);
    const [articleResult, imageUrl] = await Promise.all([
      this.generateArticle(topic),
      this.generateImage(topic)
    ]);
    let { title, body, category } = articleResult;

    // Prepend image to content if available
    if (imageUrl) {
      body = `<img src="${imageUrl}" alt="${title}" style="width:100%;max-width:800px;height:auto;border-radius:8px;margin-bottom:20px;">\n\n${body}`;
    }

    const accessToken = await this.getAccessToken();
    const { id, url } = await this.publishPost(accessToken, title, body, [category, 'travel', 'travel tips']);
    console.log(`📰 Blogger: published → ${url}`);

    await this._logPost({ title, body, category, bloggerPostId: id, bloggerUrl: url, includedCTA: true });
    return { title, category, bloggerPostId: id, bloggerUrl: url };
  }

  async _logPost({ title, body, category, bloggerPostId, bloggerUrl, includedCTA }) {
    try {
      await pool.query(
        `INSERT INTO blogger_posts (title, body, category, blogger_post_id, blogger_url, included_cta, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())`,
        [title, body, category, bloggerPostId, bloggerUrl, includedCTA]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('blogger_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('Blogger: failed to log post:', err.message);
    }
  }

  startScheduler() {
    if (this.schedulerJobs.length > 0) return { started: false, reason: 'Scheduler läuft bereits' };
    if (!this.refreshToken) return { started: false, reason: 'Google account not connected' };
    if (!this.blogId) return { started: false, reason: 'Blog ID not configured' };

    // Post every 2 days at 11:00 AM UTC (offset from WordPress at 10:00)
    const job = cron.schedule('0 11 */2 * *', async () => {
      try {
        const result = await this.createAndPost();
        console.log(`✅ Blogger: auto-published "${result.title}"`);
      } catch (err) {
        console.error('Blogger scheduler error:', err.message);
      }
    }, { timezone: 'UTC' });

    this.schedulerJobs.push(job);
    console.log('📰 Blogger: scheduler started — every 2 days at 11:00 UTC');
    return { started: true, schedule: 'every 2 days at 11:00 UTC' };
  }

  stopScheduler() {
    if (this.schedulerJobs.length === 0) return { stopped: false, reason: 'Scheduler nicht aktiv' };
    this.schedulerJobs.forEach(j => j.stop());
    this.schedulerJobs = [];
    return { stopped: true };
  }

  async getRecentPosts(limit = 20) {
    try {
      const result = await pool.query(
        `SELECT id, title, category, blogger_url, included_cta, status, posted_at
         FROM blogger_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch { return []; }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({ index: i, title: t.title, category: t.category }));
  }

  getStatus() {
    return {
      configured: !!(this.clientId && this.clientSecret && this.refreshToken && this.blogId),
      connected: !!this.refreshToken,
      schedulerRunning: this.schedulerJobs.length > 0,
      autoPosting: this.autoPosting,
      frequencyHours: this.frequencyHours,
      postCounter: this.postCounter,
      blogId: this.blogId
    };
  }
}

module.exports = new BloggerService();
