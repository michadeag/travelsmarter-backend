const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');
const wordpressService = require('./wordpressService');
const {
  fetchToolPageUrls,
  urlMatchesToolSlug,
} = require('./toolPromoTwitterService');

// Posts 1x/day to WordPress — a full article about a random free-tool page
// (why it's useful, what you can do with it, a link back to the tool), at a
// randomized time. Mirrors toolPromoBloggerService.js exactly, only the
// publish call differs (WordPress REST API via Basic Auth, no OAuth token
// step). Reuses toolPromoTwitterService's sitemap-driven URL discovery so
// it automatically covers generic + every country/airline/airport/
// destination variant page, including tools added after this file was
// written — no per-tool list to maintain here.

const SITE_ORIGIN = 'https://travelsmarterapp.com';
const HUB_URL = `${SITE_ORIGIN}/free-travel-tools.html`;

// One random time per day, in a broad "people are online reading" window —
// unlike tweets, a blog post doesn't need to land in a narrow engagement
// spike (it's found via search over time), so a single wide window is enough.
// Offset 30min from the Blogger tool-promo window so the two don't always
// fire back-to-back.
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

function describeError(error) {
  if (error.response?.data) {
    const d = error.response.data;
    if (typeof d === 'string') return d.slice(0, 300);
    return (d.message || d.error_description || d.error?.message || JSON.stringify(d)).slice(0, 300);
  }
  return error.message;
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

// ─── PICK A TOOL PAGE ─────────────────────────────────────────────────────

async function pickUnpostedToolUrl() {
  const urls = await fetchToolPageUrls();
  if (urls.length === 0) return null;

  let recentUrls = [];
  try {
    const { rows } = await pool.query(
      `SELECT tool_url FROM wordpress_posts WHERE tool_url IS NOT NULL AND posted_at >= NOW() - interval '45 days'`
    );
    recentUrls = rows.map(r => r.tool_url);
  } catch (error) {
    console.warn('⚠️ Could not check recent tool-promo WordPress posts:', error.message);
  }

  const candidates = urls.filter(u => !recentUrls.includes(u));
  const pool_ = candidates.length > 0 ? candidates : urls;
  return pool_[Math.floor(Math.random() * pool_.length)];
}

// ─── PAGE SCRAPE (title/description + FAQ JSON-LD when present) ──────────

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

  const prompt = `You are a travel blogger writing a blog post for a WordPress blog that promotes one specific free tool on TravelSmarter's website.

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
  await wordpressService.loadSettings();
  if (!wordpressService.isConfigured()) {
    console.warn('⚠️ WordPress not configured, skipping tool-promo blog post');
    return { success: false, message: 'WordPress not configured' };
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
    published = await wordpressService.publishPost(article.title, article.body);
  } catch (error) {
    const detail = describeError(error);
    console.error('❌ Failed to publish tool-promo WordPress post:', detail);
    return { success: false, message: `WordPress connection error: ${detail}. Check your site URL / username / application password in the WordPress tab.` };
  }

  try {
    await pool.query(
      `INSERT INTO wordpress_posts (title, body, category, wp_post_id, wp_url, included_cta, status, posted_at, tool_slug, tool_url)
       VALUES ($1, $2, 'tool-promo', $3, $4, true, 'published', NOW(), $5, $6)`,
      [article.title, article.body, published.id, published.url, toolSlug, url]
    );
  } catch (error) {
    console.error('❌ Failed to record tool-promo WordPress post metadata:', error.message);
  }

  console.log(`✅ Posted tool-promo WordPress article for ${url} → ${published.url}`);
  return { success: true, url, wpUrl: published.url, title: article.title };
}

// ─── RESTART-RESILIENT DAILY POLLER ────────────────────────────────────────
// A single long-lived setTimeout does not survive a process restart — this
// platform redeploys on every git push (dozens/day during active
// development), which wipes any in-memory timer and re-rolls a fresh
// random time into a shrinking remaining window, so it can go indefinitely
// without ever firing. Same bug already found and fixed for the identical
// pattern in toolPromoBloggerService.js and toolPromoTwitterService.js.
// Fix: today's target minute is derived deterministically from a hash of
// the date (not stored in memory, so a restart recomputes the same
// target instead of losing it), checked every 15 minutes against a
// DB-backed "already posted today" query.

function pseudoRandomOffsetForDate(dateStr, totalMinutes) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  return hash % totalMinutes;
}

function todaysTargetMinuteOfDay() {
  const { year, month, day } = todayInET();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-wp`;
  const totalMinutes = (POST_WINDOW.endHour - POST_WINDOW.startHour) * 60;
  const offset = pseudoRandomOffsetForDate(dateStr, totalMinutes);
  return POST_WINDOW.startHour * 60 + offset;
}

function currentMinuteOfDayET() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date()).reduce((acc, p) => { if (p.type !== 'literal') acc[p.type] = p.value; return acc; }, {});
  const hour = parts.hour === '24' ? 0 : +parts.hour;
  return hour * 60 + +parts.minute;
}

async function hasPostedToday() {
  const { year, month, day } = todayInET();
  const startOfDayUtc = zonedTimeToUtc(year, month, day, 0, 0, 'America/New_York');
  const { rows } = await pool.query(
    `SELECT 1 FROM wordpress_posts WHERE tool_slug IS NOT NULL AND posted_at >= $1 LIMIT 1`,
    [startOfDayUtc]
  );
  return rows.length > 0;
}

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let pollerInterval = null;

async function checkAndPostIfDue() {
  try {
    if (currentMinuteOfDayET() < todaysTargetMinuteOfDay()) return; // not due yet
    if (await hasPostedToday()) return; // already covered today
    console.log('📝 Tool-promo WordPress post due — posting now');
    await postRandomToolBlogArticle();
  } catch (err) {
    console.error('❌ Tool-promo WordPress poller error:', err.message);
  }
}

function startToolPromoScheduler() {
  checkAndPostIfDue(); // catch up immediately if already due and not posted
  if (pollerInterval) clearInterval(pollerInterval);
  pollerInterval = setInterval(checkAndPostIfDue, POLL_INTERVAL_MS);
  console.log('📝 Tool-promo WordPress scheduler started (1 post/day, 9am-8pm ET, restart-safe poller every 15min)');
}

function stopToolPromoScheduler() {
  if (pollerInterval) { clearInterval(pollerInterval); pollerInterval = null; }
}

module.exports = {
  pickUnpostedToolUrl,
  scrapeToolPage,
  generateToolArticle,
  postRandomToolBlogArticle,
  startToolPromoScheduler,
  stopToolPromoScheduler,
};
