const axios = require('axios');
const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const bloggerService = require('./bloggerService');
const {
  fetchToolPageUrls,
  urlMatchesToolSlug,
} = require('./toolPromoTwitterService');

// Posts 1x/day to Blogger — a full article about a random free-tool page
// (why it's useful, what you can do with it, a link back to the tool), at a
// randomized time. Reuses toolPromoTwitterService's sitemap-driven URL
// discovery so it automatically covers generic + every country/airline/
// airport/destination variant page, including tools added after this file
// was written — no per-tool list to maintain here.

const SITE_ORIGIN = 'https://travelsmarterapp.com';
const HUB_URL = `${SITE_ORIGIN}/free-travel-tools.html`;

// One random time per day, in a broad "people are online reading" window —
// unlike tweets, a blog post doesn't need to land in a narrow engagement
// spike (it's found via search over time), so a single wide window is enough.
const POST_WINDOW = { startHour: 9, endHour: 20 }; // 9am–8pm ET

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

// ─── TIMEZONE HELPERS (duplicated from toolPromoTwitterService.js — small,
// dependency-free utility, kept local rather than shared across services) ──

function zonedTimeToUtc(y, mo, d, h, mi, timeZone) {
  const guessUtc = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(guessUtc).reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc; }, {});
  const hourFixed = parts.hour === '24' ? '00' : parts.hour;
  const guessedLocal = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +hourFixed, +parts.minute, 0));
  const offsetMs = guessedLocal.getTime() - guessUtc.getTime();
  return new Date(guessUtc.getTime() - offsetMs);
}

function todayInET() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc; }, {});
  return { year: +parts.year, month: +parts.month, day: +parts.day };
}

function randomTimeInWindow({ startHour, endHour }) {
  const totalMinutes = (endHour - startHour) * 60;
  const offset = Math.floor(Math.random() * totalMinutes);
  return { hour: startHour + Math.floor(offset / 60), minute: offset % 60 };
}

// ─── PICK A TOOL PAGE ─────────────────────────────────────────────────────

async function pickUnpostedToolUrl() {
  const urls = await fetchToolPageUrls();
  if (urls.length === 0) return null;

  let recentUrls = [];
  try {
    const { rows } = await pool.query(
      `SELECT tool_url FROM blogger_posts WHERE tool_url IS NOT NULL AND posted_at >= NOW() - interval '45 days'`
    );
    recentUrls = rows.map(r => r.tool_url);
  } catch (error) {
    console.warn('⚠️ Could not check recent tool-promo blog posts:', error.message);
  }

  const candidates = urls.filter(u => !recentUrls.includes(u));
  const pool_ = candidates.length > 0 ? candidates : urls;
  return pool_[Math.floor(Math.random() * pool_.length)];
}

// ─── PAGE SCRAPE (title/description + FAQ JSON-LD when present) ──────────

function describeError(error) {
  if (error.response?.data) {
    const d = error.response.data;
    if (typeof d === 'string') return d.slice(0, 300);
    return (d.error_description || d.error?.message || JSON.stringify(d)).slice(0, 300);
  }
  return error.message;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

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

// ─── ARTICLE GENERATION ────────────────────────────────────────────────────

async function generateToolArticle(page) {
  const faqBlock = page.faqs.length > 0
    ? `Here are 4 real Q&A pairs from the tool's own FAQ, for grounding — don't copy them verbatim, use them as factual source material:\n` +
      page.faqs.map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`).join('\n')
    : `No FAQ content is available for this page — write from the title and description only, keep claims general.`;

  const prompt = `You are a travel blogger writing a blog post for Blogger.com that promotes one specific free tool on TravelSmarter's website.

Tool page title: "${page.h1}"
Meta description: "${page.description}"
Tool page URL: ${page.url}

${faqBlock}

Write a complete blog post that:
- Opens with a 2-3 sentence hook about the travel problem this tool solves
- Has 3-4 H2 sections covering: why this tool is useful, what exactly you can do with it, and a practical example or scenario
- Ends with a clear call-to-action paragraph inviting the reader to try the tool, containing a link: <a href="${page.url}">${page.h1}</a>
- Also naturally mentions, once, TravelSmarter's full library of free tools with a link: <a href="${HUB_URL}">free travel tools</a>
- Natural, conversational, helpful tone — not salesy
- Total length: 500-750 words

Format as clean HTML using only: <h2>, <p>, <ul>, <li>, <strong>, <em>, <a>
Do NOT include wrapper tags, do NOT repeat the title as an <h1>. No inline styles. Only output the HTML body.

Also give the post its own catchy blog title (different from the tool's own page title, more like a blog headline). Respond in this exact format, nothing else before or after:
TITLE: <blog post title>
BODY:
<html body>`;

  const anthropic = await getAnthropicClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const titleMatch = text.match(/^TITLE:\s*(.+)$/m);
  const bodyMatch = text.match(/BODY:\s*([\s\S]*)$/);
  const title = titleMatch ? titleMatch[1].trim() : `Why You Need TravelSmarter's ${page.h1}`;
  const body = bodyMatch ? bodyMatch[1].trim() : text;

  return { title, body };
}

// ─── PUBLISH + RECORD ──────────────────────────────────────────────────────

async function postRandomToolBlogArticle() {
  await bloggerService.loadSettings();
  const status = bloggerService.getStatus();
  if (!status.configured) {
    console.warn('⚠️ Blogger not configured, skipping tool-promo blog post');
    return { success: false, message: 'Blogger not configured' };
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

  let article;
  try {
    article = await generateToolArticle(page);
  } catch (error) {
    const detail = describeError(error);
    console.error('❌ Failed to generate tool-promo article:', detail);
    return { success: false, message: detail };
  }

  const toolSlug = urlMatchesToolSlug(new URL(url).pathname);

  let published;
  try {
    const accessToken = await bloggerService.getAccessToken();
    published = await bloggerService.publishPost(accessToken, article.title, article.body, [toolSlug || 'travel-tools', 'travel tools']);
  } catch (error) {
    const detail = describeError(error);
    console.error('❌ Failed to publish tool-promo blog post:', detail);
    return { success: false, message: `Google/Blogger connection error: ${detail}. Try reconnecting your Google account in the Blogger tab.` };
  }

  try {
    await pool.query(
      `INSERT INTO blogger_posts (title, body, category, blogger_post_id, blogger_url, included_cta, status, posted_at, tool_slug, tool_url)
       VALUES ($1, $2, 'tool-promo', $3, $4, true, 'published', NOW(), $5, $6)`,
      [article.title, article.body, published.id, published.url, toolSlug, url]
    );
  } catch (error) {
    console.error('❌ Failed to record tool-promo blog post metadata:', error.message);
  }

  console.log(`✅ Posted tool-promo blog article for ${url} → ${published.url}`);
  return { success: true, url, bloggerUrl: published.url, title: article.title };
}

// ─── DAILY RANDOM SCHEDULER ─────────────────────────────────────────────────

let scheduledTimeout = null;
let dailyPlannerJob = null;

function scheduleTodaysPost() {
  if (scheduledTimeout) { clearTimeout(scheduledTimeout); scheduledTimeout = null; }
  const { year, month, day } = todayInET();
  const now = Date.now();

  const { hour, minute } = randomTimeInWindow(POST_WINDOW);
  const fireAt = zonedTimeToUtc(year, month, day, hour, minute, 'America/New_York');
  const delay = fireAt.getTime() - now;
  if (delay <= 0) return; // window already passed today — covered again tomorrow

  scheduledTimeout = setTimeout(() => {
    postRandomToolBlogArticle().catch(err => console.error('❌ Scheduled tool-promo blog post error:', err.message));
  }, delay);
  console.log(`📅 Tool-promo blog post scheduled for ${fireAt.toISOString()} (${hour}:${String(minute).padStart(2, '0')} ET)`);
}

function startToolPromoScheduler() {
  scheduleTodaysPost(); // cover the rest of today right away
  if (dailyPlannerJob) dailyPlannerJob.stop();
  dailyPlannerJob = cron.schedule('10 0 * * *', scheduleTodaysPost, { timezone: 'America/New_York' });
  console.log('📰 Tool-promo Blogger scheduler started (1 random post/day, 9am-8pm ET)');
}

function stopToolPromoScheduler() {
  if (scheduledTimeout) { clearTimeout(scheduledTimeout); scheduledTimeout = null; }
  if (dailyPlannerJob) { dailyPlannerJob.stop(); dailyPlannerJob = null; }
}

module.exports = {
  pickUnpostedToolUrl,
  scrapeToolPage,
  generateToolArticle,
  postRandomToolBlogArticle,
  startToolPromoScheduler,
  stopToolPromoScheduler,
};
