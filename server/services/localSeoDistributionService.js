/**
 * Local SEO Distribution Service
 * Orchestrates Step 6 of the Local SEO pipeline: for one combination,
 * generate ranking-boost content (localSeoContentGenerationService) and
 * publish it to that combination's own WordPress/Blogger presence
 * (localSeoWordpressPublisher / localSeoBloggerPublisher), or save it as a
 * draft for Pinterest/Google Sites, which are manual copy-paste workflows
 * (no mature automated-publish API for either, matching the existing
 * Pinterest copy-paste pattern already used for TravelSmarter's own
 * Pinterest content). Every attempt — published, draft, or failed — is
 * logged to local_seo_distribution_posts, kept entirely separate from
 * wordpress_posts/blogger_posts/pinterest_posts (TravelSmarter's own
 * content engine tables).
 */

const pool = require('../config/database');
const contentService = require('./localSeoContentGenerationService');
const wordpressPublisher = require('./localSeoWordpressPublisher');
const bloggerPublisher = require('./localSeoBloggerPublisher');

const AUTO_PUBLISH_PLATFORMS = new Set(['wordpress', 'blogger']);
const DRAFT_ONLY_PLATFORMS = new Set(['pinterest', 'google_sites']);
const ALL_PLATFORMS = new Set([...AUTO_PUBLISH_PLATFORMS, ...DRAFT_ONLY_PLATFORMS]);

async function loadSettings(keys) {
  const result = await pool.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [keys]);
  const map = {};
  result.rows.forEach((row) => {
    map[row.key] = row.value;
  });
  return map;
}

async function getCombination(combinationId) {
  const result = await pool.query(`SELECT * FROM local_seo_combinations WHERE id = $1`, [combinationId]);
  if (result.rows.length === 0) throw new Error('Combination not found');
  return result.rows[0];
}

async function logAttempt({ combinationId, platform, title, body, externalPostId = null, externalUrl = null, status, errorMessage = null }) {
  const result = await pool.query(
    `INSERT INTO local_seo_distribution_posts
       (combination_id, platform, title, body, external_post_id, external_url, status, error_message, posted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      combinationId,
      platform,
      title,
      body,
      externalPostId,
      externalUrl,
      status,
      errorMessage,
      status === 'published' ? new Date() : null,
    ]
  );
  return result.rows[0].id;
}

async function publishToWordpress({ combinationId, content }) {
  const settings = await loadSettings(['local_seo_wordpress_site_url', 'local_seo_wordpress_username', 'local_seo_wordpress_app_password']);
  const siteUrl = settings.local_seo_wordpress_site_url;
  const username = settings.local_seo_wordpress_username;
  const appPassword = settings.local_seo_wordpress_app_password;

  if (!siteUrl || !username || !appPassword) {
    throw new Error('Local SEO WordPress not configured — set local_seo_wordpress_site_url/username/app_password in Settings.');
  }

  const { id, url } = await wordpressPublisher.publishPost({ siteUrl, username, appPassword }, content.wordpress);
  return { externalPostId: id, externalUrl: url };
}

async function publishToBlogger({ combinationId, content }) {
  const settings = await loadSettings([
    'google_client_id',
    'google_client_secret',
    'local_seo_blogger_refresh_token',
    'local_seo_blogger_blog_id',
  ]);
  const clientId = settings.google_client_id;
  const clientSecret = settings.google_client_secret;
  const refreshToken = settings.local_seo_blogger_refresh_token;
  const blogId = settings.local_seo_blogger_blog_id;

  if (!clientId || !clientSecret || !refreshToken || !blogId) {
    throw new Error('Local SEO Blogger not configured — connect the Google account and set local_seo_blogger_blog_id in Settings.');
  }

  const accessToken = await bloggerPublisher.getAccessToken({ clientId, clientSecret, refreshToken });
  const { id, url } = await bloggerPublisher.publishPost({ blogId, accessToken }, content.blogger);
  return { externalPostId: id, externalUrl: url };
}

/**
 * Runs distribution for one combination across the given platforms.
 * wordpress/blogger publish live and log 'published' or 'failed';
 * pinterest/google_sites always log 'draft' — the admin dashboard shows
 * the generated content for the admin to paste in manually. A failure on
 * one platform never aborts the others.
 */
async function distributeCombination(combinationId, platforms) {
  const requested = platforms.filter((p) => ALL_PLATFORMS.has(p));
  if (requested.length === 0) throw new Error(`No valid platforms requested. Valid platforms: ${[...ALL_PLATFORMS].join(', ')}`);

  const combination = await getCombination(combinationId);
  const content = await contentService.generateDistributionContent(combination);

  const results = [];

  for (const platform of requested) {
    const platformContent = content[platform];
    try {
      if (platform === 'wordpress') {
        const { externalPostId, externalUrl } = await publishToWordpress({ combinationId, content });
        const id = await logAttempt({
          combinationId,
          platform,
          title: platformContent.title,
          body: platformContent.body,
          externalPostId,
          externalUrl,
          status: 'published',
        });
        results.push({ platform, status: 'published', externalUrl, id });
      } else if (platform === 'blogger') {
        const { externalPostId, externalUrl } = await publishToBlogger({ combinationId, content });
        const id = await logAttempt({
          combinationId,
          platform,
          title: platformContent.title,
          body: platformContent.body,
          externalPostId,
          externalUrl,
          status: 'published',
        });
        results.push({ platform, status: 'published', externalUrl, id });
      } else {
        // pinterest / google_sites — copy-paste workflow, no live publish call
        const body = platform === 'pinterest' ? platformContent.description : platformContent.body;
        const id = await logAttempt({
          combinationId,
          platform,
          title: platformContent.title,
          body,
          status: 'draft',
        });
        results.push({ platform, status: 'draft', content: platformContent, id });
      }
    } catch (error) {
      console.error(`❌ Local SEO distribution failed (${platform}, combination ${combinationId}):`, error.message);
      const id = await logAttempt({
        combinationId,
        platform,
        title: platformContent?.title || content.title,
        body: platformContent?.body || platformContent?.description || null,
        status: 'failed',
        errorMessage: error.message,
      });
      results.push({ platform, status: 'failed', error: error.message, id });
    }
  }

  return results;
}

async function getDistributionHistory(combinationId) {
  const result = await pool.query(
    `SELECT id, platform, title, body, external_post_id, external_url, status, error_message, created_at, posted_at
     FROM local_seo_distribution_posts
     WHERE combination_id = $1
     ORDER BY created_at DESC`,
    [combinationId]
  );
  return result.rows;
}

module.exports = { distributeCombination, getDistributionHistory, ALL_PLATFORMS };
