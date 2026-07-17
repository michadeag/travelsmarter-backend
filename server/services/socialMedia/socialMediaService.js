/**
 * Social Media Service
 * Orchestrates posting across all platforms
 */

const TwitterAdapter = require('./adapters/twitterAdapter');
const RedditAdapter = require('./adapters/redditAdapter');
const PinterestAdapter = require('./adapters/pinterestAdapter');
const InstagramAdapter = require('./adapters/instagramAdapter');
const LinkedInAdapter = require('./adapters/linkedinAdapter');
const pool = require('../../config/database');

class SocialMediaService {
  constructor() {
    this.adapters = {
      twitter: new TwitterAdapter(),
      reddit: new RedditAdapter(),
      pinterest: new PinterestAdapter(),
      instagram: new InstagramAdapter(),
      linkedin: new LinkedInAdapter()
    };
  }

  /**
   * Get adapter for a specific platform
   */
  getAdapter(platform) {
    if (!this.adapters[platform]) {
      throw new Error(`Unknown platform: ${platform}`);
    }
    return this.adapters[platform];
  }

  /**
   * Initialize adapter with credentials from database
   */
  async initializeAdapter(platform) {
    try {
      const result = await pool.query(
        'SELECT * FROM social_media_accounts WHERE platform = $1 AND is_active = true LIMIT 1',
        [platform]
      );

      if (result.rows.length === 0) {
        console.warn(`⚠️ No active account found for ${platform}`);
        return false;
      }

      const account = result.rows[0];
      const credentials = {
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        ...account.account_data // Platform-specific data
      };

      const adapter = this.getAdapter(platform);
      const success = await adapter.authenticate(credentials);

      if (success) {
        console.log(`✅ ${platform} adapter initialized`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Failed to initialize ${platform} adapter:`, error.message);
      return false;
    }
  }

  /**
   * Validates and actually posts content to a platform, updating the
   * post_platforms row with the resulting platform post id. Throws on
   * failure — callers decide how to log that (insert a new row for an
   * immediate post, or update an existing scheduled_posts row).
   */
  async executePost(post, platform) {
    const adapter = this.getAdapter(platform);

    const validation = await adapter.validateContent(post);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const result = await adapter.postContent(post);

    await pool.query(
      `UPDATE post_platforms SET media_ids = $1 WHERE post_id = $2 AND platform = $3`,
      [JSON.stringify({ [platform]: result.platform_post_id }), post.id, platform]
    );

    return result;
  }

  /**
   * Post to a single platform right now, logging a new scheduled_posts row
   * with the outcome ('posted' or 'failed').
   */
  async postToSinglePlatform(post, platform, accountId) {
    try {
      const result = await this.executePost(post, platform);

      await pool.query(
        `INSERT INTO scheduled_posts (post_id, account_id, platform, scheduled_at, posted_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [post.id, accountId, platform, new Date(), new Date(), 'posted']
      );

      return {
        success: true,
        platform,
        postId: result.platform_post_id,
        url: result.url
      };
    } catch (error) {
      console.error(`❌ Failed to post to ${platform}:`, error.message);

      await pool.query(
        `INSERT INTO scheduled_posts (post_id, account_id, platform, scheduled_at, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [post.id, accountId, platform, new Date(), 'failed', error.message]
      );

      return {
        success: false,
        platform,
        error: error.message
      };
    }
  }

  /**
   * Queues a post for a future time instead of posting immediately —
   * inserted as 'pending', picked up later by processDueScheduledPosts().
   */
  async scheduleSinglePlatform(post, platform, accountId, scheduledAt) {
    await pool.query(
      `INSERT INTO scheduled_posts (post_id, account_id, platform, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [post.id, accountId, platform, scheduledAt]
    );
    return { success: true, platform, scheduled: true, scheduledAt };
  }

  /**
   * Post to multiple platforms — immediately, or queued for scheduledAt if
   * it's a future timestamp.
   */
  async postToMultiplePlatforms(post, platforms, accountIds = {}, scheduledAt = null) {
    try {
      const results = [];
      const isFutureSchedule = scheduledAt && new Date(scheduledAt).getTime() > Date.now();

      // Each platform posts its own tailored text (from post_platforms),
      // not the shared base content — otherwise the AI-generated,
      // per-platform versions would never actually get used.
      const platformContentResult = await pool.query(
        `SELECT platform, platform_content FROM post_platforms WHERE post_id = $1`,
        [post.id]
      );
      const platformContentMap = {};
      for (const row of platformContentResult.rows) {
        platformContentMap[row.platform] = row.platform_content;
      }

      for (const platform of platforms) {
        // Get account for this platform
        const accountId = accountIds[platform] ||
          await this.getActiveAccountId(platform);

        if (!accountId) {
          results.push({
            success: false,
            platform,
            error: 'No active account configured'
          });
          continue;
        }

        const platformPost = { ...post, platform_content: platformContentMap[platform] || post.content };

        const result = isFutureSchedule
          ? await this.scheduleSinglePlatform(platformPost, platform, accountId, scheduledAt)
          : await this.postToSinglePlatform(platformPost, platform, accountId);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('❌ Multi-platform posting failed:', error.message);
      throw error;
    }
  }

  /**
   * Posts everything that's due (status='pending' and scheduled_at has
   * passed), updating each row's own status rather than inserting a new
   * one. Safe to call anytime — durable against redeploys since it's
   * gated on each row's own scheduled_at, not an in-memory timer.
   */
  async processDueScheduledPosts() {
    const dueResult = await pool.query(
      `SELECT sp.id AS scheduled_post_id, sp.platform, sp.post_id,
              p.title, p.content, p.image_url, p.post_type,
              pp.platform_content
       FROM scheduled_posts sp
       JOIN social_media_posts p ON p.id = sp.post_id
       LEFT JOIN post_platforms pp ON pp.post_id = sp.post_id AND pp.platform = sp.platform
       WHERE sp.status = 'pending' AND sp.scheduled_at <= NOW()`
    );

    let sent = 0;
    let failed = 0;

    for (const row of dueResult.rows) {
      const post = {
        id: row.post_id,
        title: row.title,
        content: row.content,
        image_url: row.image_url,
        post_type: row.post_type,
        platform_content: row.platform_content,
      };

      try {
        await this.executePost(post, row.platform);
        await pool.query(
          `UPDATE scheduled_posts SET status = 'posted', posted_at = NOW() WHERE id = $1`,
          [row.scheduled_post_id]
        );
        sent++;
      } catch (error) {
        console.error(`❌ Scheduled post failed (${row.platform}):`, error.message);
        await pool.query(
          `UPDATE scheduled_posts SET status = 'failed', error_message = $1 WHERE id = $2`,
          [error.message, row.scheduled_post_id]
        );
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Get active account ID for a platform
   */
  async getActiveAccountId(platform) {
    try {
      const result = await pool.query(
        'SELECT id FROM social_media_accounts WHERE platform = $1 AND is_active = true LIMIT 1',
        [platform]
      );

      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error('Error getting active account:', error.message);
      return null;
    }
  }

  /**
   * Get all connected accounts
   */
  async getConnectedAccounts() {
    try {
      const result = await pool.query(
        'SELECT id, platform, account_name, is_active, created_at FROM social_media_accounts ORDER BY platform, created_at'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching accounts:', error.message);
      return [];
    }
  }

  /**
   * Add new account
   */
  async addAccount(platform, accountName, accessToken, accountData = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO social_media_accounts (platform, account_name, access_token, account_data)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [platform, accountName, accessToken, JSON.stringify(accountData)]
      );

      // Try to initialize the adapter
      await this.initializeAdapter(platform);

      return {
        success: true,
        accountId: result.rows[0].id
      };
    } catch (error) {
      console.error('Error adding account:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove account
   */
  async removeAccount(accountId) {
    try {
      await pool.query(
        'UPDATE social_media_accounts SET is_active = false WHERE id = $1',
        [accountId]
      );

      return { success: true };
    } catch (error) {
      console.error('Error removing account:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get platform configuration
   */
  async getPlatformConfig(platform) {
    try {
      const result = await pool.query(
        'SELECT * FROM social_media_config WHERE platform = $1',
        [platform]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching config:', error.message);
      return null;
    }
  }

  /**
   * Update platform configuration
   */
  async updatePlatformConfig(platform, config) {
    try {
      await pool.query(
        `UPDATE social_media_config
         SET posting_frequency = $1, posting_hours = $2, max_daily_posts = $3,
             content_mix = $4, hashtag_strategy = $5, timezone = $6
         WHERE platform = $7`,
        [
          config.posting_frequency,
          config.posting_hours,
          config.max_daily_posts,
          JSON.stringify(config.content_mix),
          JSON.stringify(config.hashtag_strategy),
          config.timezone,
          platform
        ]
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating config:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all active platforms status
   */
  async getStatus() {
    try {
      const accounts = await this.getConnectedAccounts();
      const status = {};

      for (const platform of Object.keys(this.adapters)) {
        const platformAccounts = accounts.filter(a => a.platform === platform && a.is_active);
        status[platform] = {
          connected: platformAccounts.length > 0,
          accounts: platformAccounts.length,
          configured: this.adapters[platform].isAuthenticated
        };
      }

      return status;
    } catch (error) {
      console.error('Error getting status:', error.message);
      return {};
    }
  }
}

module.exports = new SocialMediaService();
