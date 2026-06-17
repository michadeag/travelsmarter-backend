const axios = require('axios');
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
  {
    category: 'budget_flights',
    title: '5 Hacks to Fly for Way Less',
    promptTheme: 'finding cheap flights and flight deal strategies',
    boards: ['Travel Tips', 'Budget Travel', 'Travel Hacks'],
    tags: ['#cheapflights', '#travelhacks', '#budgettravel', '#flightdeals', '#travelsmarter', '#airtravel', '#traveltips'],
  },
  {
    category: 'packing',
    title: 'The Perfect Carry-On Packing List',
    promptTheme: 'minimalist carry-on packing for any trip length',
    boards: ['Packing Tips', 'Travel Tips', 'Minimalist Travel'],
    tags: ['#packingtips', '#carryon', '#minimalisttravel', '#travelpacking', '#travellight', '#travelhacks', '#packinglist'],
  },
  {
    category: 'points_miles',
    title: 'Earn Miles Without Flying',
    promptTheme: 'credit card points and airline miles strategies',
    boards: ['Travel Rewards', 'Travel Tips', 'Budget Travel'],
    tags: ['#travelmiles', '#creditcardpoints', '#travelrewards', '#pointsandmiles', '#freeflight', '#businessclass', '#travelhacks'],
  },
  {
    category: 'budget_destinations',
    title: 'Best Budget Destinations 2025',
    promptTheme: 'affordable and underrated travel destinations worldwide',
    boards: ['Travel Destinations', 'Budget Travel', 'Travel Inspiration'],
    tags: ['#budgettravel', '#traveldestinations', '#cheaptravel', '#travelinspiration', '#wanderlust', '#hiddengemtravel', '#traveltips'],
  },
  {
    category: 'airport_hacks',
    title: 'Airport Tricks Frequent Flyers Use',
    promptTheme: 'airport productivity hacks and insider tips',
    boards: ['Travel Hacks', 'Travel Tips', 'Air Travel'],
    tags: ['#airporthacks', '#frequentflyer', '#traveltips', '#tsaprecheck', '#airportlounge', '#travelhacks', '#airtravel'],
  },
  {
    category: 'travel_safety',
    title: 'Stay Safe Anywhere in the World',
    promptTheme: 'travel safety tips and smart precautions for solo and group travel',
    boards: ['Travel Safety', 'Travel Tips', 'Solo Travel'],
    tags: ['#travelsafety', '#solotravel', '#traveltips', '#travelsmarter', '#safetravel', '#travelhacks', '#traveladvice'],
  },
  {
    category: 'hotel_hacks',
    title: 'Get More from Every Hotel Stay',
    promptTheme: 'hotel booking strategies and loyalty program hacks',
    boards: ['Hotel Tips', 'Travel Hacks', 'Travel Tips'],
    tags: ['#hotelhacks', '#traveltips', '#hotelloyalty', '#freenights', '#travelhacks', '#hotelbooking', '#travelrewards'],
  },
  {
    category: 'digital_nomad',
    title: 'Work Remotely from Anywhere',
    promptTheme: 'digital nomad lifestyle, remote work travel, and best destinations',
    boards: ['Digital Nomad', 'Remote Work', 'Travel Tips'],
    tags: ['#digitalnomad', '#remotework', '#workfromanywhere', '#nomadlife', '#traveltips', '#locationindependent', '#workandtravel'],
  },
  {
    category: 'europe_budget',
    title: 'How to Travel Europe on $50/Day',
    promptTheme: 'budget travel Europe tips, cheap accommodation, free activities',
    boards: ['Europe Travel', 'Budget Travel', 'Travel Tips'],
    tags: ['#europetravel', '#budgeteurope', '#backpackingeurope', '#cheaptravel', '#traveleurope', '#budgettravel', '#traveltips'],
  },
  {
    category: 'travel_apps',
    title: 'Best Travel Apps Every Traveler Needs',
    promptTheme: 'essential travel apps for booking, navigation, saving money',
    boards: ['Travel Tips', 'Travel Tools', 'Budget Travel'],
    tags: ['#travelapps', '#traveltips', '#travelhacks', '#traveltools', '#smarttravel', '#travelsmarter', '#traveltech'],
  },
];

class PinterestService {
  constructor() {
    this.accessToken = null;
    this.boardId = null;
    this.boardName = null;
    this.ideogramKey = null;
    this.openaiKey = null;
    this.postCounter = 0;
    this.topicIndex = 0;
    this.userBoards = [];
    this.TOPICS = TOPICS;
  }

  async loadSettings() {
    try {
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });

      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key IN (
          'pinterest_access_token','pinterest_board_id','pinterest_board_name',
          'pinterest_post_counter','pinterest_topic_index','ideogram_api_key','openai_api_key'
        )`
      );
      result.rows.forEach(({ key, value }) => {
        if (key === 'pinterest_access_token') this.accessToken = value;
        if (key === 'pinterest_board_id') this.boardId = value;
        if (key === 'pinterest_board_name') this.boardName = value;
        if (key === 'pinterest_post_counter') this.postCounter = parseInt(value) || 0;
        if (key === 'pinterest_topic_index') this.topicIndex = parseInt(value) || 0;
        if (key === 'ideogram_api_key') this.ideogramKey = value;
        if (key === 'openai_api_key') this.openaiKey = value;
      });

      // Load user boards from DB
      try {
        const boardsR = await pool.query(`SELECT value FROM settings WHERE key = 'pinterest_boards_json'`);
        if (boardsR.rows[0]) this.userBoards = JSON.parse(boardsR.rows[0].value);
      } catch (e) { this.userBoards = []; }

    } catch (err) {
      console.error('Pinterest: loadSettings error:', err.message);
    }
  }

  isConfigured() {
    return !!(this.accessToken && (this.openaiKey || this.ideogramKey));
  }

  // Pick the best matching board from user's actual boards
  _pickBoard(topic) {
    if (!this.userBoards.length) return { id: this.boardId, name: this.boardName || 'Travel' };
    // Try to match by name
    for (const preferred of topic.boards) {
      const match = this.userBoards.find(b =>
        b.name.toLowerCase().includes(preferred.toLowerCase()) ||
        preferred.toLowerCase().includes(b.name.toLowerCase())
      );
      if (match) return match;
    }
    // Rotate through boards as fallback
    return this.userBoards[this.topicIndex % this.userBoards.length];
  }

  async generateImage(topic) {
    const prompt = `Pinterest travel infographic, portrait format, clean modern design.
Bold headline at top: "${topic.title}"
Travel theme: ${topic.promptTheme}
Color palette: warm coral and cream with navy accents. Travel icons. High contrast text.
Style: flat design infographic, professional, eye-catching, Pinterest-optimized.
No watermarks, no logos.`;

    if (this.openaiKey) {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        { model: 'gpt-image-1', prompt, n: 1, size: '1024x1536' },
        { headers: { 'Authorization': `Bearer ${this.openaiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 }
      );
      const imgData = response.data?.data?.[0];
      const url = imgData?.url || (imgData?.b64_json ? `data:image/png;base64,${imgData.b64_json}` : null);
      if (!url) throw new Error('OpenAI returned no image');
      console.log(`📌 Pinterest: OpenAI image ready (${imgData?.url ? 'url' : 'base64'})`);
      return url;
    }

    if (!this.ideogramKey) throw new Error('No image generation API key configured');
    const response = await axios.post(
      'https://api.ideogram.ai/generate',
      {
        image_request: {
          prompt,
          model: 'V_2',
          resolution: 'RESOLUTION_832_1248',
          style_type: 'DESIGN',
          magic_prompt_option: 'OFF'
        }
      },
      { headers: { 'Api-Key': this.ideogramKey, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    const url = response.data?.data?.[0]?.url;
    if (!url) throw new Error('Ideogram returned no image');
    console.log(`📌 Pinterest: Ideogram image ready → ${url.substring(0, 60)}...`);
    return url;
  }

  async generateDescription(topic) {
    const prompt = `Write a Pinterest pin description for a travel infographic titled "${topic.title}" about ${topic.promptTheme}.

Requirements:
- 2–3 sentences, inspiring and practical
- Mention 1–2 specific benefits or tips
- Conversational, not corporate
- Max 300 characters

Output only the description text. No hashtags (those come separately).`;

    anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].text.trim();
  }

  async generatePin(topicIndex = null) {
    await this.loadSettings();
    const index = topicIndex !== null ? topicIndex : this.topicIndex % TOPICS.length;
    const topic = TOPICS[index % TOPICS.length];
    const includeCTA = true; // always true — destination link is always present
    const board = this._pickBoard(topic);
    // Unique UTM link per pin so Pinterest analytics shows which pin drives traffic
    const pinSlug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').substring(0, 40);
    const link = `https://travelsmarterapp.com/welcome.html?ref=pinterest&pin=${pinSlug}`;

    console.log(`📌 Pinterest: generating description for "${topic.title}"`);
    const description = await this.generateDescription(topic);

    console.log(`📌 Pinterest: generating image for "${topic.title}"`);
    const imageUrl = await this.generateImage(topic);

    const tags = topic.tags.join(' ');

    // Save as draft
    const dbResult = await pool.query(
      `INSERT INTO pinterest_posts (title, category, image_url, description, tags, board_id, board_name, link, included_cta, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW()) RETURNING id`,
      [topic.title, topic.category, imageUrl, description, tags, board.id || null, board.name || null, link, includeCTA]
    );

    this.topicIndex++;
    this.postCounter++;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('pinterest_topic_index', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.topicIndex)]
    );
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('pinterest_post_counter', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.postCounter)]
    );

    return {
      title: topic.title,
      description,
      imageUrl,
      tags,
      board,
      link,
      includeCTA,
      category: topic.category,
      dbId: dbResult.rows[0].id,
    };
  }

  async markAsPosted(dbId, pinUrl = null) {
    await pool.query(
      `UPDATE pinterest_posts SET status = 'posted', pin_id = $1, posted_at = NOW() WHERE id = $2`,
      [pinUrl || null, dbId]
    );
  }

  async getRecentPosts(limit = 20) {
    try {
      const r = await pool.query(
        `SELECT id, title, category, image_url, description, board_name, included_cta, status, pin_id, posted_at
         FROM pinterest_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return r.rows;
    } catch { return []; }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({
      index: i,
      title: t.title,
      category: t.category,
      isNext: i === this.topicIndex % TOPICS.length,
    }));
  }

  getStatus() {
    return {
      connected: !!this.accessToken,
      ideogramConfigured: !!this.ideogramKey,
      boardId: this.boardId,
      boardName: this.boardName,
      boardsLoaded: this.userBoards.length,
      postCounter: this.postCounter,
      nextTopic: TOPICS[this.topicIndex % TOPICS.length]?.title || null,
    };
  }

  // Legacy: kept for backward compat
  async createAndPost() {
    throw new Error('Auto-posting disabled — use copy-paste workflow via /generate endpoint.');
  }

  startScheduler() { return { started: false, reason: 'Auto-posting not available — use copy-paste workflow' }; }
  stopScheduler() { return { stopped: false, reason: 'No scheduler running' }; }
}

module.exports = new PinterestService();
