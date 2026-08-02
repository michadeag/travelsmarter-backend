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
    topic: 'how business travelers can use credit card points and airline miles to reduce company travel costs',
    category: 'points'
  },
  {
    topic: 'productivity tips for professionals who travel frequently — staying focused, beating jet lag, and keeping work on track',
    category: 'productivity'
  },
  {
    topic: 'how remote work has changed business travel and what hybrid travelers need to know in 2025',
    category: 'remote_work'
  },
  {
    topic: 'smart strategies for booking business travel to maximize comfort while minimizing cost',
    category: 'budget'
  },
  {
    topic: 'travel hacking for entrepreneurs and freelancers — flying business class for less',
    category: 'hacks'
  },
  {
    topic: 'how to choose the right airport lounge access strategy for frequent business travelers',
    category: 'lounges'
  },
  {
    topic: 'lessons learned from traveling to 20+ countries for work — what nobody tells you',
    category: 'insights'
  },
  {
    topic: 'building a travel-friendly lifestyle: balancing professional obligations with exploring the world',
    category: 'lifestyle'
  }
];

class LinkedInService {
  constructor() {
    this.scheduler = null;
    this.isConfigured = false;
    this.credentials = {};
    this.postCounter = 0;
    this.TOPICS = TOPICS;
  }

  async loadSettings() {
    try {
      // Re-initialize Anthropic client with key from DB if available
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });
      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key LIKE 'linkedin_%'`
      );
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      this.credentials = {
        accessToken: settings.linkedin_access_token || '',
        orgId: settings.linkedin_org_id || '',
        personUrn: settings.linkedin_person_urn || '',
        frequency: settings.linkedin_posting_frequency || 'daily',
        maxPosts: parseInt(settings.linkedin_max_posts_per_day || '1'),
        postingTime: settings.linkedin_posting_time || '09:00',
        autoPosting: settings.linkedin_auto_posting === 'true'
      };

      this.isConfigured = !!(this.credentials.accessToken);

      const counterResult = await pool.query(
        `SELECT value FROM settings WHERE key = 'linkedin_post_counter'`
      );
      if (counterResult.rows.length > 0) {
        this.postCounter = parseInt(counterResult.rows[0].value || '0');
      }

      return this.isConfigured;
    } catch (err) {
      console.error('LinkedIn: failed to load settings:', err.message);
      return false;
    }
  }

  async generatePost(topicEntry, includeCTA) {
    const CTA_VARIANTS = [
      `\n\n🔗 I use TravelSmarter to track flight deals and travel hacks — completely free: https://travelsmarterapp.com/welcome.html`,
      `\n\n💡 If you want to travel smarter (literally), I've been using this free tool to find cheap flights before they spike: https://travelsmarterapp.com/welcome.html`,
      `\n\n✈️ Shameless plug: TravelSmarter is a free app I use to stay ahead of flight deals — worth bookmarking: https://travelsmarterapp.com/welcome.html`,
      `\n\n📌 Tools I actually use: TravelSmarter for flight deal tracking — no cost, surprisingly good: https://travelsmarterapp.com/welcome.html`,
    ];
    const ctaText = includeCTA
      ? CTA_VARIANTS[this.postCounter % CTA_VARIANTS.length]
      : '';

    const prompt = `You are a travel industry professional writing a LinkedIn post about: ${topicEntry.topic}

Write a LinkedIn post that:
- Opens with a strong hook (a surprising stat, bold statement, or short story)
- Shares genuine, actionable insight from professional experience
- Uses a confident, direct tone appropriate for LinkedIn — not corporate fluff
- Includes 2–4 short paragraphs with line breaks for readability
- Ends with a thought-provoking question or clear takeaway
- Is 150–300 words — punchy enough for LinkedIn
- Do NOT add hashtags (we'll let LinkedIn handle that)

Format your response as JSON:
{
  "text": "the full post text"
}

Only output valid JSON, nothing else.`;

    anthropic = await getAnthropicClient();


    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    let raw = response.content[0].text.trim();
    // Strip markdown code fences if present
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(raw);

    return {
      text: parsed.text + ctaText,
      category: topicEntry.category
    };
  }

  async getMemberUrn(accessToken) {
    const res = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' }
    });
    const id = res.data.id;
    console.log(`💼 LinkedIn: member URN resolved → urn:li:person:${id}`);
    return `urn:li:person:${id}`;
  }

  async postToLinkedIn(rawText) {
    const text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    const { accessToken, orgId, personUrn } = this.credentials;

    // Priority: org URN > person URN from settings > API lookup
    let authorUrn;
    if (orgId) {
      authorUrn = `urn:li:organization:${orgId}`;
    } else if (personUrn) {
      // Keep urn:li:member: if already set (new API uses this format)
      // If plain numeric ID, prefix with urn:li:person:
      if (personUrn.startsWith('urn:li:')) {
        authorUrn = personUrn;
      } else {
        authorUrn = `urn:li:person:${personUrn}`;
      }
      console.log(`💼 LinkedIn: posting as person (from settings): ${authorUrn}`);
    } else {
      // Try to decode URN from JWT token
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          const id = payload.sub || payload.id;
          if (id) { authorUrn = `urn:li:person:${id}`; console.log(`💼 LinkedIn: URN from JWT: ${authorUrn}`); }
        }
      } catch (e) {}
      if (!authorUrn) authorUrn = await this.getMemberUrn(accessToken);
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    };

    // /rest/posts requires urn:li:person: format (not urn:li:member:)
    const personAuthor = authorUrn.replace(/^urn:li:member:/, 'urn:li:person:');
    console.log(`💼 LinkedIn: authorUrn=${authorUrn} → personAuthor=${personAuthor}`);

    // Use new REST Posts API — try recent versions until one is active.
    // LinkedIn's Analytics tab shows /posts-CREATE has been returning both
    // 426 (Upgrade Required — a version in this list is now too old) and
    // 403 every day for the past couple weeks, so the list needs the
    // current month added, not just a longer fallback loop.
    const versionsToTry = ['202507', '202506', '202505', '202504', '202503', '202502'];
    const body = {
      author: personAuthor,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };

    // Only re-throw once every version has been tried — previously this
    // stopped at the first non-NONEXISTENT_VERSION error (e.g. a bare 403),
    // so if LinkedIn ever restricts/deprecates just the newest version for
    // this app, every post would fail at that first version and never fall
    // through to an older one that's still fine, even though the loop was
    // built specifically to "try recent versions until one is active."
    let lastErr = null;
    for (const version of versionsToTry) {
      try {
        console.log(`💼 LinkedIn: POST /rest/posts version=${version} author=${authorUrn}`);
        const response = await axios.post('https://api.linkedin.com/rest/posts', body, {
          headers: { ...headers, 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' }
        });
        console.log(`💼 LinkedIn: /rest/posts ${version} success`);
        return response.headers['x-restli-id'] || response.data?.id || null;
      } catch (err) {
        lastErr = err;
        console.warn(`💼 LinkedIn version ${version} failed (${err.response?.status} — ${JSON.stringify(err.response?.data)}), trying next`);
      }
    }
    console.error(`💼 LinkedIn: all versions ${versionsToTry.join(', ')} failed — last error: ${lastErr?.response?.status} — ${JSON.stringify(lastErr?.response?.data)}`);
    throw lastErr || new Error('No active LinkedIn API version found in range 202502–202506');
  }

  async createAndPost() {
    await this.loadSettings();
    if (!this.isConfigured) {
      throw new Error('LinkedIn not configured — add credentials in Settings.');
    }

    const topicEntry = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    this.postCounter++;
    const includeCTA = this.postCounter % 2 === 0;

    const post = await this.generatePost(topicEntry, includeCTA);
    console.log('💼 LinkedIn: generated post, posting to API...');
    const postId = await this.postToLinkedIn(post.text);
    console.log(`💼 LinkedIn: API returned postId=${postId}`);

    await this._logPost({
      body: post.text,
      category: post.category,
      includedCTA: includeCTA,
      linkedinPostId: postId,
      status: 'posted'
    });

    return {
      category: post.category,
      includedCTA: includeCTA,
      postId,
      preview: post.text.substring(0, 120) + '…'
    };
  }

  async _logPost({ body, category, includedCTA, linkedinPostId, status }) {
    try {
      await pool.query(
        `INSERT INTO linkedin_posts (body, category, included_cta, linkedin_post_id, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [body, category, includedCTA, linkedinPostId, status]
      );
      await pool.query(
        `INSERT INTO settings (key, value, type) VALUES ('linkedin_post_counter', $1, 'text')
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(this.postCounter)]
      );
    } catch (err) {
      console.error('LinkedIn: failed to log post to DB:', err.message);
    }
  }

  async getRecentPosts(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT body, category, included_cta, linkedin_post_id, status, posted_at
         FROM linkedin_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch {
      return [];
    }
  }

  startScheduler() {
    if (this.schedulerJobs && this.schedulerJobs.length > 0) {
      return { started: false, reason: 'Scheduler already running' };
    }

    const cron = require('node-cron');
    this.schedulerJobs = [];

    // 8:00 AM & 5:00 PM Eastern Time (DST-aware)
    const cronTimes = ['0 8 * * *', '0 17 * * *'];
    const labels = ['8:00 AM ET', '5:00 PM ET'];

    cronTimes.forEach((cronExpr, i) => {
      const job = cron.schedule(cronExpr, async () => {
        try {
          const result = await this.createAndPost();
          console.log(`✅ LinkedIn: posted at ${labels[i]} [${result.category}]`);
        } catch (err) {
          console.error('LinkedIn scheduler error:', err.message);
        }
      }, { timezone: 'America/New_York' });
      this.schedulerJobs.push(job);
    });

    // Keep legacy this.scheduler truthy for getStatus()
    this.scheduler = true;

    console.log('💼 LinkedIn scheduler started — 8:00 AM & 5:00 PM ET (US audience)');
    return { started: true, times: labels };
  }

  stopScheduler() {
    if (!this.schedulerJobs || this.schedulerJobs.length === 0) {
      return { stopped: false, reason: 'No scheduler running' };
    }
    this.schedulerJobs.forEach(job => job.stop());
    this.schedulerJobs = [];
    this.scheduler = null;
    return { stopped: true };
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      schedulerRunning: !!this.scheduler,
      orgId: this.credentials.orgId || null,
      frequency: this.credentials.frequency,
      maxPosts: this.credentials.maxPosts,
      postingTime: this.credentials.postingTime,
      postCounter: this.postCounter,
      autoPosting: this.credentials.autoPosting
    };
  }
}

module.exports = new LinkedInService();
