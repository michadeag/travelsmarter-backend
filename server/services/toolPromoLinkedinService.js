const axios = require('axios');
const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const linkedinService = require('./linkedinService');
const {
  fetchToolPageUrls,
  urlMatchesToolSlug,
} = require('./toolPromoTwitterService');

// Posts 1x/day to LinkedIn — a short professional post about a random
// free-tool page, with a backlink. Distinct from linkedinService.js's own
// generic topic-based scheduler (8am/5pm ET, TOPICS-driven) — this is
// tool-page promotion specifically, content-driven by the live sitemap
// rather than a hardcoded list, so newly added tools are picked up
// automatically with no code change. Reuses linkedinService.postToLinkedIn()
// directly rather than re-implementing the API call, so it shares the same
// proven-working auth/author-URN resolution.
//
// Scheduling uses a fixed daily cron time (like linkedinService's own
// scheduler, which has 26 successful posts as of this writing) rather than
// a randomized-delay setTimeout — the latter pattern was found and fixed
// three times over in the Blogger/Twitter/WordPress tool-promo services
// (a long-lived setTimeout doesn't survive a process restart, and this
// platform redeploys on every git push). A fixed cron expression has no
// such problem: it's re-evaluated fresh against the current time on every
// tick, not computed once and stored.

const SITE_ORIGIN = 'https://travelsmarterapp.com';
const HUB_URL = `${SITE_ORIGIN}/free-travel-tools.html`;
const POST_TIME_CRON = '0 11 * * *'; // 11:00 AM ET daily — distinct from the generic 8am/5pm slots

let anthropicClient = null;
async function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropicClient;
  }
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'anthropic_api_key'`).catch(() => ({ rows: [] }));
  const key = r.rows[0]?.value;
  if (!key) throw new Error('Anthropic API key not configured');
  anthropicClient = new Anthropic({ apiKey: key });
  return anthropicClient;
}

function describeError(error) {
  if (error.response?.data) {
    const d = error.response.data;
    if (typeof d === 'string') return d.slice(0, 300);
    return (d.message || d.error_description || d.error?.message || JSON.stringify(d)).slice(0, 300);
  }
  return error.message;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// ─── PICK A TOOL PAGE ─────────────────────────────────────────────────────

async function pickUnpostedToolUrl() {
  const urls = await fetchToolPageUrls();
  if (urls.length === 0) return null;

  let recentUrls = [];
  try {
    const { rows } = await pool.query(
      `SELECT tool_url FROM linkedin_posts WHERE tool_url IS NOT NULL AND posted_at >= NOW() - interval '45 days'`
    );
    recentUrls = rows.map(r => r.tool_url);
  } catch (error) {
    console.warn('⚠️ Could not check recent tool-promo LinkedIn posts:', error.message);
  }

  const candidates = urls.filter(u => !recentUrls.includes(u));
  const pool_ = candidates.length > 0 ? candidates : urls;
  return pool_[Math.floor(Math.random() * pool_.length)];
}

// ─── PAGE SCRAPE (title/description + FAQ JSON-LD when present) ──────────

async function scrapeToolPage(url) {
  const { data: html } = await axios.get(url, { timeout: 15000 });

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  let title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : 'Free travel tool';
  title = title.replace(/\s*\|\s*TravelSmarter\s*$/i, '').trim();

  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descMatch ? decodeHtmlEntities(descMatch[1]).trim() : '';

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, '')).trim() : title;

  let faqs = [];
  const ldJsonBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of ldJsonBlocks) {
    try {
      const data = JSON.parse(block[1]);
      if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
        faqs = data.mainEntity.map(qa => ({
          question: qa.name,
          answer: qa.acceptedAnswer?.text || '',
        })).filter(qa => qa.question && qa.answer);
        break;
      }
    } catch { /* not valid JSON — skip */ }
  }

  return { title, h1, description, faqs, url };
}

// ─── POST GENERATION ───────────────────────────────────────────────────────

async function generateToolLinkedinPost(page) {
  const faqBlock = page.faqs.length > 0
    ? `Here's one real Q&A from the tool's own FAQ, for grounding — don't copy it verbatim:\nQ: ${page.faqs[0].question}\nA: ${page.faqs[0].answer}`
    : `No FAQ content is available for this page — write from the title and description only, keep claims general.`;

  const prompt = `You are writing a LinkedIn post (first-person, professional-but-conversational travel-industry voice) promoting one specific free tool on TravelSmarter's website.

Tool page title: "${page.h1}"
Meta description: "${page.description}"
Tool page URL: ${page.url}

${faqBlock}

Write a LinkedIn post that:
- Opens with a 1-2 sentence hook about the travel problem this tool solves (a relatable scenario or question works well)
- Has 2-3 short paragraphs (or a brief bulleted list) on why this matters and what the tool actually does
- Ends with a direct call-to-action line inviting the reader to try it, followed by the tool URL on its own line: ${page.url}
- Natural, first-person, no corporate-speak, no excessive hashtags (0-3 relevant ones at the very end is fine)
- Total length: 120-220 words (LinkedIn posts perform better shorter than blog posts)

Do NOT use markdown formatting (no **, no #, no [text](url) links — LinkedIn posts are plain text). Output ONLY the post text, nothing before or after.`;

  const anthropic = await getAnthropicClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text.trim();
}

// ─── PUBLISH + RECORD ──────────────────────────────────────────────────────

async function postRandomToolLinkedinPost() {
  await linkedinService.loadSettings();
  if (!linkedinService.isConfigured) {
    console.warn('⚠️ LinkedIn not configured, skipping tool-promo LinkedIn post');
    return { success: false, message: 'LinkedIn not configured' };
  }

  const url = await pickUnpostedToolUrl();
  if (!url) {
    console.warn('⚠️ No candidate tool page URLs found (sitemap fetch failed?)');
    return { success: false, message: 'No candidate URLs' };
  }

  let page;
  try {
    page = await scrapeToolPage(url);
  } catch (error) {
    const detail = describeError(error);
    console.error(`❌ Failed to scrape tool page ${url}:`, detail);
    return { success: false, message: detail };
  }

  let text;
  try {
    text = await generateToolLinkedinPost(page);
  } catch (error) {
    const detail = describeError(error);
    console.error('❌ Failed to generate tool-promo LinkedIn post:', detail);
    return { success: false, message: detail };
  }

  const toolSlug = urlMatchesToolSlug(new URL(url).pathname);

  let postId;
  try {
    postId = await linkedinService.postToLinkedIn(text);
  } catch (error) {
    const detail = describeError(error);
    console.error('❌ Failed to publish tool-promo LinkedIn post:', detail);
    return { success: false, message: `LinkedIn API error: ${detail}. Try reconnecting your LinkedIn account in the LinkedIn tab.` };
  }

  try {
    await pool.query(
      `INSERT INTO linkedin_posts (body, category, included_cta, linkedin_post_id, status, posted_at, tool_slug, tool_url)
       VALUES ($1, 'tool-promo', true, $2, 'posted', NOW(), $3, $4)`,
      [text, postId, toolSlug, url]
    );
  } catch (error) {
    console.error('❌ Failed to record tool-promo LinkedIn post metadata:', error.message);
  }

  console.log(`✅ Posted tool-promo LinkedIn post for ${url}`);
  return { success: true, url, postId, preview: text.slice(0, 120) + '…' };
}

// ─── FIXED-TIME DAILY SCHEDULER ─────────────────────────────────────────────

let schedulerJob = null;

function startToolPromoScheduler() {
  if (schedulerJob) return;
  schedulerJob = cron.schedule(POST_TIME_CRON, () => {
    postRandomToolLinkedinPost().catch(err => console.error('❌ Scheduled tool-promo LinkedIn post error:', err.message));
  }, { timezone: 'America/New_York' });
  console.log('💼 Tool-promo LinkedIn scheduler started (1 post/day, 11:00 AM ET)');
}

function stopToolPromoScheduler() {
  if (schedulerJob) { schedulerJob.stop(); schedulerJob = null; }
}

module.exports = {
  pickUnpostedToolUrl,
  scrapeToolPage,
  generateToolLinkedinPost,
  postRandomToolLinkedinPost,
  startToolPromoScheduler,
  stopToolPromoScheduler,
};
