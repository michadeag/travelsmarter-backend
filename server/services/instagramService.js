const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { v2: cloudinary } = require('cloudinary');
const pool = require('../config/database');

const GRAPH_API = 'https://graph.facebook.com/v21.0';

const TOPICS = [
  { category: 'budget_flights', title: '5 Hacks to Fly for Way Less', promptTheme: 'flight deals and cheap airfare hacks' },
  { category: 'packing', title: 'The Perfect Carry-On Packing List', promptTheme: 'minimalist carry-on packing for any trip' },
  { category: 'points_miles', title: 'Earn Miles Without Flying', promptTheme: 'credit card points and airline miles strategy' },
  { category: 'budget_destinations', title: 'Best Budget Countries in 2025', promptTheme: 'affordable travel destinations worldwide' },
  { category: 'airport_hacks', title: 'Airport Tricks Every Traveler Needs', promptTheme: 'airport productivity and travel hacks' },
  { category: 'travel_safety', title: 'Stay Safe Anywhere in the World', promptTheme: 'travel safety tips and smart precautions' },
  { category: 'hotel_hacks', title: 'Get More from Every Hotel Stay', promptTheme: 'hotel booking hacks and loyalty tips' },
  { category: 'digital_nomad', title: 'Work Remotely from Anywhere', promptTheme: 'digital nomad lifestyle and remote work travel' },
  { category: 'upgrade_hacks', title: 'How to Get Upgraded (For Free)', promptTheme: 'flight and hotel upgrade strategies' },
  { category: 'travel_mindset', title: 'Travel More, Spend Less', promptTheme: 'smart travel mindset and lifestyle design' },
];

class InstagramService {
  constructor() {
    this.settings = {};
    this.postCounter = 0;
    this.topicIndex = 0;
    this.isConfigured = false;
  }

  async loadSettings() {
    try {
      const r = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'instagram_%' OR key LIKE 'cloudinary_%' OR key = 'ideogram_api_key' OR key = 'anthropic_api_key'`
      );
      r.rows.forEach(row => { this.settings[row.key] = row.value; });

      const counterR = await pool.query(`SELECT value FROM settings WHERE key = 'instagram_post_counter'`);
      if (counterR.rows.length) this.postCounter = parseInt(counterR.rows[0].value || '0');

      const indexR = await pool.query(`SELECT value FROM settings WHERE key = 'instagram_topic_index'`);
      if (indexR.rows.length) this.topicIndex = parseInt(indexR.rows[0].value || '0');

      this.isConfigured = !!(
        this._get('instagram_access_token') &&
        this._get('instagram_account_id') &&
        this._get('ideogram_api_key')
      );

      if (this._get('cloudinary_cloud_name')) {
        cloudinary.config({
          cloud_name: this._get('cloudinary_cloud_name'),
          api_key: this._get('cloudinary_api_key'),
          api_secret: this._get('cloudinary_api_secret'),
        });
      }

      return this.isConfigured;
    } catch (err) {
      console.error('Instagram loadSettings error:', err.message);
      return false;
    }
  }

  _get(key) {
    return this.settings[key] || process.env[key.toUpperCase()] || '';
  }

  _topic(index) {
    return TOPICS[index % TOPICS.length];
  }

  async generateCaption(topic) {
    const anthropic = new Anthropic({ apiKey: this._get('anthropic_api_key') || process.env.ANTHROPIC_API_KEY });
    const utmSlug = topic.category.replace(/_/g, '-');
    const link = `https://travelsmarterapp.com/welcome.html?ref=instagram&topic=${utmSlug}`;

    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Write an Instagram caption for TravelSmarter about: "${topic.title}" (${topic.promptTheme}).

Requirements:
- Hook in first line — bold statement or surprising fact, no hashtags
- 120–180 words total, conversational and energetic
- 3–5 emojis naturally placed
- End with a question to drive comments
- Soft mention of travelsmarterapp.com: "${link}"
- 15–20 hashtags on a separate final line (mix popular + niche travel hashtags)

Return ONLY the caption, nothing else.`
      }]
    });

    return r.content[0].text.trim();
  }

  async generateImage(topic) {
    const apiKey = this._get('ideogram_api_key');
    const r = await axios.post('https://api.ideogram.ai/generate', {
      image_request: {
        prompt: `Instagram travel infographic: "${topic.title}". Bold modern design, Deep Navy (#1a2744) background, Vibrant Coral (#ff6b4a) accents, clean typography. Travel photography style. Inspiring and professional. Theme: ${topic.promptTheme}.`,
        aspect_ratio: 'ASPECT_2_3',
        model: 'V_2',
        style_type: 'DESIGN',
        magic_prompt_option: 'AUTO',
      }
    }, {
      headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    return r.data.data[0].url;
  }

  async uploadToCloudinary(imageUrl) {
    const r = await cloudinary.uploader.upload(imageUrl, {
      folder: 'travelsmarter/instagram',
      resource_type: 'image',
    });
    return r.secure_url;
  }

  async generatePreview(topicIndex = null) {
    const idx = topicIndex !== null ? topicIndex % TOPICS.length : this.topicIndex;
    const topic = this._topic(idx);

    const caption = await this.generateCaption(topic);
    const ideogramUrl = await this.generateImage(topic);

    let publicImageUrl = ideogramUrl;
    if (this._get('cloudinary_cloud_name')) {
      publicImageUrl = await this.uploadToCloudinary(ideogramUrl);
    }

    const r = await pool.query(
      `INSERT INTO instagram_posts (title, category, image_url, caption, status, created_at)
       VALUES ($1, $2, $3, $4, 'draft', NOW()) RETURNING id`,
      [topic.title, topic.category, publicImageUrl, caption]
    );

    return {
      dbId: r.rows[0].id,
      topic: topic.title,
      category: topic.category,
      imageUrl: publicImageUrl,
      caption,
    };
  }

  async publishPost(dbId) {
    const r = await pool.query(`SELECT * FROM instagram_posts WHERE id = $1`, [dbId]);
    if (!r.rows.length) throw new Error('Post not found');
    const post = r.rows[0];

    const token = this._get('instagram_access_token');
    const accountId = this._get('instagram_account_id');

    // Create media container
    console.log('Instagram publish: accountId=', accountId, 'imageUrl=', post.image_url?.substring(0, 60));
    let containerRes;
    try {
      containerRes = await axios.post(`${GRAPH_API}/${accountId}/media`, null, {
        params: { image_url: post.image_url, caption: post.caption, access_token: token }
      });
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('Instagram container creation failed:', detail);
      throw new Error('Instagram API: ' + detail);
    }
    const creationId = containerRes.data?.id;
    if (!creationId) throw new Error('Instagram: no creation_id returned');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Publish
    const publishRes = await axios.post(`${GRAPH_API}/${accountId}/media_publish`, null, {
      params: { creation_id: creationId, access_token: token }
    });
    const igPostId = publishRes.data?.id;

    await pool.query(
      `UPDATE instagram_posts SET status='posted', post_id=$1, posted_at=NOW() WHERE id=$2`,
      [igPostId, dbId]
    );

    this.topicIndex++;
    this.postCounter++;
    await this._saveCounters();

    return { igPostId, postUrl: `https://www.instagram.com/` };
  }

  async _saveCounters() {
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('instagram_post_counter', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.postCounter)]
    );
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('instagram_topic_index', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.topicIndex)]
    );
  }

  async getRecentPosts(limit = 20) {
    const r = await pool.query(
      `SELECT * FROM instagram_posts ORDER BY created_at DESC LIMIT $1`, [limit]
    );
    return r.rows;
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      postCounter: this.postCounter,
      nextTopic: this._topic(this.topicIndex)?.title || null,
      topics: TOPICS.length,
    };
  }

  getTopics() {
    return TOPICS.map((t, i) => ({ index: i, name: t.title }));
  }
}

module.exports = new InstagramService();
