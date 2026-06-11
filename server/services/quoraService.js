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

const TOPIC_MAP = [
  {
    title: 'Cheap Flights',
    category: 'flights',
    questions: [
      'What is the best way to find cheap flights?',
      'What are some tips for booking cheap airline tickets?',
      'How do I find the cheapest time to fly?',
    ],
    spaces: ['Travel', 'Budget Travel', 'Air Travel'],
  },
  {
    title: 'Budget Travel Europe',
    category: 'budget',
    questions: [
      'How can I travel Europe on a tight budget?',
      'What are the cheapest countries to visit in Europe?',
      'How do backpackers afford to travel Europe?',
    ],
    spaces: ['Travel', 'Budget Travel', 'Backpacking'],
  },
  {
    title: 'Travel Credit Cards & Points',
    category: 'points_miles',
    questions: [
      'How do travel credit card points work?',
      'What is the best credit card for earning travel miles?',
      'How can I fly business class for free using points?',
    ],
    spaces: ['Travel', 'Credit Cards', 'Personal Finance'],
  },
  {
    title: 'Travel Apps',
    category: 'tools',
    questions: [
      'What are the best travel apps?',
      'Which apps do frequent travelers use?',
      'What apps should every traveler have on their phone?',
    ],
    spaces: ['Travel', 'Travel Tips', 'Mobile Apps'],
  },
  {
    title: 'Minimalist Packing',
    category: 'packing',
    questions: [
      'How do you pack light for a long trip?',
      'What are the best tips for packing carry-on only?',
      'How do minimalist travelers pack for 2 weeks?',
    ],
    spaces: ['Travel', 'Minimalism', 'Travel Tips'],
  },
  {
    title: 'Digital Nomad Life',
    category: 'nomad',
    questions: [
      'What is it like to be a digital nomad?',
      'Which countries are best for digital nomads?',
      'How do I start working remotely and traveling the world?',
    ],
    spaces: ['Digital Nomads', 'Remote Work', 'Travel'],
  },
  {
    title: 'Travel Insurance',
    category: 'insurance',
    questions: [
      'Is travel insurance worth it?',
      'What does travel insurance actually cover?',
      'When should you buy travel insurance?',
    ],
    spaces: ['Travel', 'Insurance', 'Travel Tips'],
  },
  {
    title: 'Airport Hacks',
    category: 'airports',
    questions: [
      'What are the best airport hacks frequent flyers use?',
      'How do you get through airport security faster?',
      'What do experienced travelers do differently at airports?',
    ],
    spaces: ['Travel', 'Air Travel', 'Travel Tips'],
  },
  {
    title: 'Hidden Travel Destinations',
    category: 'destinations',
    questions: [
      'What are some underrated travel destinations worth visiting?',
      'Where should I travel that most tourists haven\'t discovered yet?',
      'What are the best hidden gem destinations in the world?',
    ],
    spaces: ['Travel', 'Travel Destinations', 'Adventure Travel'],
  },
  {
    title: 'Hotel Loyalty Programs',
    category: 'hotels',
    questions: [
      'Are hotel loyalty programs worth it?',
      'How do you earn free hotel nights faster?',
      'What hotel rewards program gives the most value?',
    ],
    spaces: ['Travel', 'Hotels', 'Travel Rewards'],
  },
  {
    title: 'Solo Travel',
    category: 'solo_travel',
    questions: [
      'What should every solo traveler know before their first trip?',
      'Is solo travel safe? How do you stay safe traveling alone?',
      'What are the best destinations for solo travelers?',
    ],
    spaces: ['Travel', 'Solo Travel', 'Travel Tips'],
  },
  {
    title: 'Travel Hacks',
    category: 'hacks',
    questions: [
      'What travel hacks do frequent travelers use that most people don\'t know?',
      'How can I make long flights more comfortable?',
      'What are the best ways to save money while traveling?',
    ],
    spaces: ['Travel', 'Travel Tips', 'Life Hacks'],
  },
];

const CTA_VARIANTS = [
  `\n\n---\n\n*One tool I find genuinely useful for this: [TravelSmarter](https://travelsmarterapp.com/welcome.html) — free app that tracks flight deals and surfaces travel hacks automatically. Worth bookmarking before your next trip.*`,
  `\n\n---\n\n*Bonus tip: I use [TravelSmarter](https://travelsmarterapp.com/welcome.html) to stay on top of flight deals without spending hours searching. It's free and surprisingly effective.*`,
  `\n\n---\n\n*Free resource worth bookmarking: [TravelSmarter](https://travelsmarterapp.com/welcome.html) — tracks cheap flight windows and travel hacks automatically. Saves a lot of time.*`,
  `\n\n---\n\n*Tool that helps a lot here: [TravelSmarter](https://travelsmarterapp.com/welcome.html) — free app, does the deal-hunting for you so you can focus on planning the actual trip.*`,
];

class QuoraService {
  constructor() {
    this.postCounter = 0;
    this.TOPIC_MAP = TOPIC_MAP;
  }

  async loadSettings() {
    try {
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });
      const r = await pool.query(`SELECT value FROM settings WHERE key = 'quora_post_counter'`);
      if (r.rows[0]) this.postCounter = parseInt(r.rows[0].value) || 0;
    } catch (e) { /* non-blocking */ }
  }

  getTopics() {
    return TOPIC_MAP.map((t, i) => ({
      index: i,
      title: t.title,
      category: t.category,
      isNext: i === this.postCounter % TOPIC_MAP.length,
    }));
  }

  // Legacy: kept for backward compat with old routes
  getQuestions() {
    return TOPIC_MAP.map((t, i) => ({
      index: i,
      question: t.questions[0],
      category: t.category,
    }));
  }

  async generatePost(topicIndex = null) {
    await this.loadSettings();
    const index = topicIndex !== null ? topicIndex : this.postCounter % TOPIC_MAP.length;
    const topic = TOPIC_MAP[index % TOPIC_MAP.length];
    const question = topic.questions[this.postCounter % topic.questions.length];
    const includeCTA = this.postCounter % 3 === 0;

    const ctaSuffix = includeCTA ? CTA_VARIANTS[this.postCounter % CTA_VARIANTS.length] : '';

    const prompt = `You are an experienced traveler writing a high-quality Quora answer.

Question: "${question}"
Topic area: ${topic.title}

Requirements:
- Open with a direct, confident statement that immediately addresses the question (no "Great question!" filler)
- First-person voice — share real experience, specific examples, actual numbers
- Short paragraphs (2–4 sentences each) for mobile readability
- 3–5 actionable, specific tips
- Conversational but authoritative tone — like advice from a well-traveled friend
- 300–450 words total
- End with one clear takeaway sentence

Format: plain text with paragraph breaks. No markdown headers. Use bold (**word**) sparingly only for key terms.
Output only the answer text — no preamble.`;

    anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    });

    const answerText = response.content[0].text.trim() + ctaSuffix;

    const dbResult = await pool.query(
      `INSERT INTO quora_answers (question, answer, category, space_suggestions, included_cta, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, 'draft', NOW()) RETURNING id`,
      [question, answerText, topic.category, topic.spaces.join(', '), includeCTA]
    );

    this.postCounter++;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('quora_post_counter', $1, 'text')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.postCounter)]
    );

    return {
      question,
      answer: answerText,
      category: topic.category,
      spaces: topic.spaces,
      includeCTA,
      dbId: dbResult.rows[0].id,
    };
  }

  async markAsPosted(dbId, postUrl = null) {
    await pool.query(
      `UPDATE quora_answers SET status = 'posted', post_url = $1, posted_at = NOW() WHERE id = $2`,
      [postUrl || null, dbId]
    );
  }

  // Legacy method used by old /generate route
  async generateAndLog(questionIndex = null) {
    return this.generatePost(questionIndex);
  }

  async getRecentPosts(limit = 20) {
    try {
      const r = await pool.query(
        `SELECT id, question, answer, category, space_suggestions, post_url, included_cta, status, posted_at
         FROM quora_answers ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return r.rows;
    } catch { return []; }
  }

  // Legacy alias
  async getRecentAnswers(limit = 20) {
    return this.getRecentPosts(limit);
  }

  getStatus() {
    return {
      totalQuestions: TOPIC_MAP.length,
      postCounter: this.postCounter,
      nextQuestion: TOPIC_MAP[this.postCounter % TOPIC_MAP.length]?.questions[0] || null,
    };
  }
}

module.exports = new QuoraService();
