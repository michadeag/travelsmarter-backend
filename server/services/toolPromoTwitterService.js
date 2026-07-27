const axios = require('axios');
const cron = require('node-cron');
const pool = require('../config/database');
const twitterService = require('./twitterService');

// Posts 3x/day to Twitter/X promoting a random free-tool page (generic tool
// pages + every country/airline/airport/destination variant), with a
// backlink, at randomized times inside three known-good US engagement
// windows. Distinct from twitterScheduler.js/travelTips.js, which posts
// generic travel tips on fixed clock times — this is tool-page promotion
// specifically, content-driven by the live sitemap rather than a hardcoded
// list, so newly added tools are picked up automatically with no code change.

// Kept in sync manually with freeToolAnalyticsController.js's identically-
// named list — duplicated rather than required cross-layer (a service
// shouldn't depend on a controller) since it's a small, rarely-changed array.
const TOOL_BASE_SLUGS = [
  'best-time-to-book-flights', 'carry-on-size-checker', 'visa-requirement-checker',
  'jet-lag-calculator', 'packing-list-generator', 'travel-budget-calculator',
  'power-plug-checker', 'tipping-calculator', 'layover-checker',
  'travel-health-checker', 'water-safety-checker', 'flight-carbon-calculator',
  'airport-transfer-calculator', 'baggage-fee-calculator', 'emergency-number-checker',
  'rideshare-checker', 'driving-checker', 'sim-checker',
  'delay-compensation-checker', 'customs-checker', 'best-month-checker',
  'currency-checker', 'language-checker', 'transit-checker',
  'airport-amenities-checker', 'drone-checker', 'alcohol-checker',
  'seat-pitch-checker', 'insurance-cost-estimator', 'pet-travel-checker',
  'passport-validity-checker', 'public-holiday-checker', 'rental-age-checker',
  'atm-fee-checker', 'dress-code-checker', 'lost-passport-checker',
  'tourist-tax-checker', 'short-term-rental-checker', 'uv-index-checker',
  'departure-tax-checker', 'wildlife-safety-checker', 'time-zone-checker',
  'drinking-age-checker', 'vpn-censorship-checker', 'smoking-vaping-checker',
  'natural-disaster-checker', 'cashless-payment-checker', 'etiquette-checker',
  'business-hours-checker', 'internet-speed-checker', 'airport-arrival-time-checker',
  'medication-legality-checker', 'vat-refund-checker', 'resort-fee-checker',
  'travel-advisory-checker',
].sort((a, b) => b.length - a.length);

const SITEMAP_URL = 'https://travelsmarterapp.com/sitemap.xml';
const SITE_ORIGIN = 'https://travelsmarterapp.com';

// Three commonly-cited best-engagement windows for a US Twitter/X audience,
// in America/New_York local time (handles EST/EDT automatically). One
// random time is drawn from each window every day.
const POST_WINDOWS = [
  { startHour: 8, endHour: 10 },  // morning commute/coffee
  { startHour: 12, endHour: 14 }, // lunch
  { startHour: 17, endHour: 19 }, // evening wind-down
];

let scheduledTimeouts = [];
let sitemapCache = { urls: [], fetchedAt: 0 };
const SITEMAP_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── TIMEZONE HELPERS (no external tz library — see server.js for the
// established pattern of avoiding new deps where a small helper suffices) ──

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

// ─── SITEMAP → CANDIDATE TOOL PAGE URLS ──────────────────────────────────────

function urlMatchesToolSlug(pathname) {
  const clean = pathname.replace(/^\//, '').replace(/\.html$/i, '');
  if (clean === 'free-travel-tools') return 'free-travel-tools-hub';
  for (const slug of TOOL_BASE_SLUGS) {
    if (clean === slug || clean.startsWith(slug + '-')) return slug;
  }
  return null;
}

async function fetchToolPageUrls(force = false) {
  if (!force && sitemapCache.urls.length > 0 && Date.now() - sitemapCache.fetchedAt < SITEMAP_CACHE_MS) {
    return sitemapCache.urls;
  }
  try {
    const { data: xml } = await axios.get(SITEMAP_URL, { timeout: 15000 });
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    const urls = locs.filter(u => {
      try {
        return urlMatchesToolSlug(new URL(u).pathname) !== null;
      } catch {
        return false;
      }
    });
    if (urls.length > 0) {
      sitemapCache = { urls, fetchedAt: Date.now() };
    }
    return sitemapCache.urls.length > 0 ? sitemapCache.urls : urls;
  } catch (error) {
    console.error('❌ Failed to fetch sitemap for tool-promo tweets:', error.message);
    return sitemapCache.urls; // stale cache is better than nothing
  }
}

async function pickUnpostedUrl() {
  const urls = await fetchToolPageUrls();
  if (urls.length === 0) return null;

  let recentUrls = [];
  try {
    const { rows } = await pool.query(
      `SELECT url FROM twitter_posts WHERE url IS NOT NULL AND posted_at >= NOW() - interval '20 days'`
    );
    recentUrls = rows.map(r => r.url);
  } catch (error) {
    console.warn('⚠️ Could not check recent tool-promo tweets:', error.message);
  }

  const pool_ = urls.filter(u => !recentUrls.includes(u));
  const candidates = pool_.length > 0 ? pool_ : urls;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── TWEET CONTENT (derived from the live page's own <title>/description —
// no per-tool hardcoding, so new tools "just work" the moment they're live) ─

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

async function buildTweetFromPage(url) {
  const { data: html } = await axios.get(url, { timeout: 15000 });

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  let title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : 'Free travel tool';
  title = title.replace(/\s*\|\s*TravelSmarter\s*$/i, '').trim();

  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = descMatch ? decodeHtmlEntities(descMatch[1]).trim() : '';

  // Twitter/X shortens any link to a flat ~23 chars regardless of actual
  // length, and always adds a line break before it — budget for that rather
  // than the URL's real length.
  const LINK_BUDGET = 24;
  const maxTextLen = 280 - LINK_BUDGET - 2; // 2 for the blank line before the link

  let text = description ? `${title}\n\n${description}` : title;
  if (text.length > maxTextLen) {
    text = text.slice(0, maxTextLen - 1).replace(/\s+\S*$/, '') + '…';
  }

  return { text: `${text}\n\n${url}`, url };
}

// ─── POST + RECORD ────────────────────────────────────────────────────────────

async function postRandomToolTweet() {
  if (!twitterService.isConfigured()) {
    console.warn('⚠️ Twitter not configured, skipping tool-promo tweet');
    return { success: false, message: 'Twitter not configured' };
  }

  const url = await pickUnpostedUrl();
  if (!url) {
    console.warn('⚠️ No candidate tool page URLs found (sitemap fetch failed?)');
    return { success: false, message: 'No candidate URLs' };
  }

  let tweet;
  try {
    tweet = await buildTweetFromPage(url);
  } catch (error) {
    console.error(`❌ Failed to build tweet from ${url}:`, error.message);
    return { success: false, message: error.message };
  }

  const result = await twitterService.postTweet(tweet.text);
  if (!result.success) {
    console.error('❌ Tool-promo tweet failed to post:', result.error);
    return { success: false, message: result.error || 'Failed to post tweet' };
  }

  const toolSlug = urlMatchesToolSlug(new URL(url).pathname);
  try {
    await pool.query(
      `UPDATE twitter_posts SET url = $1, tool_slug = $2 WHERE tweet_id = $3`,
      [url, toolSlug, result.tweetId]
    );
  } catch (error) {
    console.error('❌ Failed to record tool-promo tweet metadata:', error.message);
  }

  console.log(`✅ Posted tool-promo tweet for ${url}`);
  return { success: true, url, tweetId: result.tweetId };
}

// ─── DAILY RANDOM SCHEDULER ───────────────────────────────────────────────────

function clearScheduledTimeouts() {
  scheduledTimeouts.forEach(t => clearTimeout(t));
  scheduledTimeouts = [];
}

// Picks one random time inside each of the 3 windows for "today" (ET) and
// schedules a one-off setTimeout for each window whose time hasn't already
// passed. Called once on boot (covering the rest of today) and once daily
// just after midnight ET (covering the full next day).
function scheduleTodaysPosts() {
  clearScheduledTimeouts();
  const { year, month, day } = todayInET();
  const now = Date.now();

  for (const window of POST_WINDOWS) {
    const { hour, minute } = randomTimeInWindow(window);
    const fireAt = zonedTimeToUtc(year, month, day, hour, minute, 'America/New_York');
    const delay = fireAt.getTime() - now;
    if (delay <= 0) continue; // window already passed today — skip, covered again tomorrow

    const timeout = setTimeout(() => {
      postRandomToolTweet().catch(err => console.error('❌ Scheduled tool-promo tweet error:', err.message));
    }, delay);
    scheduledTimeouts.push(timeout);
    console.log(`📅 Tool-promo tweet scheduled for ${fireAt.toISOString()} (${hour}:${String(minute).padStart(2, '0')} ET)`);
  }
}

let dailyPlannerJob = null;

function startToolPromoScheduler() {
  scheduleTodaysPosts(); // cover the remainder of today right away
  if (dailyPlannerJob) dailyPlannerJob.stop();
  // Re-plan just after midnight ET every day, in the correct timezone
  // regardless of the server's own local time or DST shifts.
  dailyPlannerJob = cron.schedule('5 0 * * *', scheduleTodaysPosts, { timezone: 'America/New_York' });
  console.log('🐦 Tool-promo Twitter scheduler started (3 random posts/day in US peak windows)');
}

function stopToolPromoScheduler() {
  clearScheduledTimeouts();
  if (dailyPlannerJob) { dailyPlannerJob.stop(); dailyPlannerJob = null; }
}

module.exports = {
  TOOL_BASE_SLUGS,
  urlMatchesToolSlug,
  fetchToolPageUrls,
  pickUnpostedUrl,
  buildTweetFromPage,
  postRandomToolTweet,
  startToolPromoScheduler,
  stopToolPromoScheduler,
};
