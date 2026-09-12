const cron = require('node-cron');
const pool = require('../config/database');
const githubService = require('./githubService');
const { generateLongtailContent } = require('./longtailContentService');
const { renderLongtailPage } = require('./longtailPageRenderer');
const { TEMPLATES, COUNTRIES, TOOLS, slugify } = require('./longtailTopicCatalog');

// Duplicated from guideController.js (SINGLE_PRICE_CENTS / BUNDLE_PRICE_CENTS)
// rather than imported, same reasoning as elsewhere in this file — this is
// only needed to decide whether the bundle page actually exists for a
// country (guideController.js skips publishing it if $29 isn't cheaper than
// the guides bought separately) before linking to it.
const GUIDE_BUNDLE_PRICE_CENTS = 2900;

// Publishes 1-2 new long-tail Q&A pages/day, fully automatically: picks
// the next (template, country) pair not yet published, generates content,
// renders + commits the static page via GitHub, appends it to
// sitemap.xml, and records it in longtail_pages for dedup tracking.
//
// PAGES_PER_DAY is a plain constant, not an auto-ramp — deliberately kept
// dumb and manually adjustable (bump this number to speed up later)
// rather than adding ramp-schedule logic that would need its own testing.
const PAGES_PER_DAY = 1;
const PUBLISH_CRON = '20 11 * * *'; // 11:20 AM ET daily — offset from the other tool-promo/social cron times to avoid a pile-up

// Deterministic (not truly random) shuffle of every possible
// (template, country) pair, so the publish order looks varied — not
// "every France page then every Austria page" — without needing to
// persist queue state anywhere. Same seed always produces the same
// order, so this is safe to recompute on every run.
function seededShuffle(arr, seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function allPairs() {
  const pairs = [];
  for (const template of TEMPLATES) {
    for (const country of COUNTRIES) {
      pairs.push({ template, country });
    }
  }
  return seededShuffle(pairs, 'longtail-v1');
}

async function getPublishedKeys() {
  const { rows } = await pool.query(`SELECT template_key, country_slug FROM longtail_pages`);
  return new Set(rows.map(r => `${r.template_key}::${r.country_slug}`));
}

async function pickNextCandidates(n) {
  const published = await getPublishedKeys();
  const candidates = [];
  for (const pair of allPairs()) {
    const key = `${pair.template.key}::${pair.country.slug}`;
    if (published.has(key)) continue;
    candidates.push(pair);
    if (candidates.length >= n) break;
  }
  return candidates;
}

function pageSlugFor(templateKey, countrySlug) {
  return `${templateKey}-${countrySlug}`;
}

// Appends new <url> entries to sitemap.xml — appending at the end (right
// before </urlset>) rather than trying to keep alphabetical order like
// the free-tool pages do; sitemaps don't require any particular order,
// and an append is far simpler/safer to automate than the manual
// alphabetical-splice approach used earlier in this project.
async function appendToSitemap(newSlugs) {
  const current = await githubService.getFileContent('sitemap.xml');
  if (!current) throw new Error('sitemap.xml not found in repo');

  const today = new Date().toISOString().slice(0, 10);
  const newUrls = newSlugs.map(slug => `  <url>
    <loc>https://travelsmarterapp.com/${slug}.html</loc>
    <lastmod>${today}</lastmod>
    <priority>0.6</priority>
  </url>`).join('\n');

  if (!current.includes('</urlset>')) throw new Error('sitemap.xml missing </urlset> — refusing to touch it');
  const updated = current.replace('</urlset>', `${newUrls}\n</urlset>`);

  await githubService.commitFile('sitemap.xml', updated, `Add ${newSlugs.length} long-tail page(s) to sitemap`);
}

// Decides what to pitch on a long-tail page for this country: an existing
// PDF guide (or the bundle, if it's actually cheaper than buying the guides
// separately — same $29 threshold guideController.js uses to decide whether
// to publish the bundle page at all) takes priority since it's a real,
// already-paid-for product; otherwise falls back to the template's closest-
// matching free tool, or a generic hub link if no tool is a good fit.
async function buildPitch(template, country) {
  const { rows: guideRows } = await pool.query(
    `SELECT slug, title, price_cents FROM guides WHERE country_slug = $1 AND published = true ORDER BY title`,
    [country.slug]
  );

  if (guideRows.length > 0) {
    const singleTotalCents = guideRows.reduce((sum, g) => sum + g.price_cents, 0);
    const bundleAvailable = guideRows.length > 1 && GUIDE_BUNDLE_PRICE_CENTS < singleTotalCents;
    return {
      type: 'guides',
      countryName: country.name,
      countrySlug: country.slug,
      count: guideRows.length,
      featured: guideRows.slice(0, 3).map(g => ({ slug: g.slug, title: g.title })),
      bundleAvailable,
    };
  }

  if (template.toolSlug && TOOLS[template.toolSlug]) {
    return { type: 'tool', slug: template.toolSlug, ...TOOLS[template.toolSlug] };
  }

  return { type: 'hub' };
}

async function publishOne(template, country) {
  const slug = pageSlugFor(template.key, country.slug);
  const content = await generateLongtailContent(template, country);
  const title = template.question(country);
  const pitch = await buildPitch(template, country);

  const { rows: siblingRows } = await pool.query(
    `SELECT country_slug, country_name FROM longtail_pages WHERE template_key = $1`,
    [template.key]
  );
  const siblings = siblingRows.map(s => ({
    pageSlug: pageSlugFor(template.key, s.country_slug),
    countrySlug: s.country_slug,
    name: s.country_name,
  }));
  siblings.push({ pageSlug: slug, countrySlug: country.slug, name: country.name });
  siblings.sort((a, b) => a.name.localeCompare(b.name));

  const html = renderLongtailPage({
    title, question: content.question, countryName: country.name,
    content, slug, templateKey: template.key, countrySlug: country.slug, pitch,
  }, siblings);

  await githubService.commitFile(`${slug}.html`, html, `Publish long-tail page: ${title}`);

  await pool.query(
    `INSERT INTO longtail_pages (slug, template_key, country_slug, country_name, question, title, meta_description, body_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [slug, template.key, country.slug, country.name, content.question, title, content.metaDescription, JSON.stringify(content)]
  );

  return slug;
}

async function publishDailyBatch() {
  const candidates = await pickNextCandidates(PAGES_PER_DAY);
  if (candidates.length === 0) {
    console.log('📄 Long-tail pipeline: catalog exhausted, nothing left to publish');
    return { published: [], errors: [] };
  }

  const published = [];
  const errors = [];
  for (const { template, country } of candidates) {
    try {
      const slug = await publishOne(template, country);
      published.push(slug);
      console.log(`✅ Long-tail page published: ${slug}`);
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`❌ Long-tail page failed (${template.key}/${country.slug}):`, detail);
      errors.push({ candidate: `${template.key}/${country.slug}`, error: detail });
    }
  }

  if (published.length > 0) {
    try {
      await appendToSitemap(published);
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('❌ Long-tail sitemap update failed:', detail);
      errors.push({ candidate: 'sitemap.xml', error: detail });
    }
  }

  return { published, errors };
}

let schedulerJob = null;

function startLongtailScheduler() {
  if (schedulerJob) return;
  schedulerJob = cron.schedule(PUBLISH_CRON, () => {
    publishDailyBatch().catch(err => console.error('❌ Long-tail daily batch error:', err.message));
  }, { timezone: 'America/New_York' });
  console.log(`📄 Long-tail Q&A page scheduler started (${PAGES_PER_DAY}/day, 11:20 AM ET)`);
}

function stopLongtailScheduler() {
  if (schedulerJob) { schedulerJob.stop(); schedulerJob = null; }
}

module.exports = {
  publishDailyBatch,
  publishOne,
  pickNextCandidates,
  startLongtailScheduler,
  stopLongtailScheduler,
};
