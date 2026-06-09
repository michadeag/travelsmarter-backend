/**
 * Social Media Controller
 * Handles REST API endpoints for social media management
 */

const socialMediaService = require('../services/socialMedia/socialMediaService');
const pool = require('../config/database');

class SocialMediaController {
  /**
   * GET /api/social/status
   * Get status of all connected platforms
   */
  static async getStatus(req, res) {
    try {
      const status = await socialMediaService.getStatus();
      const accounts = await socialMediaService.getConnectedAccounts();

      res.json({
        success: true,
        status,
        accountCount: accounts.length,
        accounts: accounts.map(a => ({
          id: a.id,
          platform: a.platform,
          account_name: a.account_name,
          is_active: a.is_active
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching status',
        error: error.message
      });
    }
  }

  /**
   * POST /api/social/posts
   * Create a new post
   */
  static async createPost(req, res) {
    try {
      const { title, content, post_type, image_url, platforms } = req.body;
      const userId = req.user.id;

      // Create main post
      const postResult = await pool.query(
        `INSERT INTO social_media_posts (title, content, post_type, image_url, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [title, content, post_type || 'travel_tip', image_url, userId]
      );

      const postId = postResult.rows[0].id;

      // Create platform-specific versions
      if (platforms && platforms.length > 0) {
        for (const platform of platforms) {
          await pool.query(
            `INSERT INTO post_platforms (post_id, platform, platform_content)
             VALUES ($1, $2, $3)`,
            [postId, platform, content]
          );
        }
      }

      res.status(201).json({
        success: true,
        postId,
        message: 'Post created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating post',
        error: error.message
      });
    }
  }

  /**
   * POST /api/social/posts/:id/publish
   * Publish a post to specified platforms
   */
  static async publishPost(req, res) {
    try {
      const { postId } = req.params;
      const { platforms, accountIds } = req.body;

      // Get post details
      const postResult = await pool.query(
        'SELECT * FROM social_media_posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      const post = postResult.rows[0];

      // Publish to platforms
      const results = await socialMediaService.postToMultiplePlatforms(
        post,
        platforms,
        accountIds
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: successful.length > 0,
        results,
        summary: {
          successful: successful.length,
          failed: failed.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error publishing post',
        error: error.message
      });
    }
  }

  /**
   * GET /api/social/posts
   * List all posts
   */
  static async listPosts(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const result = await pool.query(
        `SELECT id, title, content, post_type, image_url, created_at
         FROM social_media_posts
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      res.json({
        success: true,
        posts: result.rows,
        total: result.rowCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching posts',
        error: error.message
      });
    }
  }

  /**
   * GET /api/social/accounts
   * Get all connected accounts
   */
  static async getAccounts(req, res) {
    try {
      const accounts = await socialMediaService.getConnectedAccounts();

      res.json({
        success: true,
        accounts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching accounts',
        error: error.message
      });
    }
  }

  /**
   * POST /api/social/accounts
   * Add new account
   */
  static async addAccount(req, res) {
    try {
      const { platform, account_name, access_token, account_data } = req.body;

      if (!platform || !account_name || !access_token) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const result = await socialMediaService.addAccount(
        platform,
        account_name,
        access_token,
        account_data
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding account',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/social/accounts/:id
   * Remove account
   */
  static async removeAccount(req, res) {
    try {
      const { id } = req.params;

      const result = await socialMediaService.removeAccount(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error removing account',
        error: error.message
      });
    }
  }

  /**
   * GET /api/social/analytics
   * Get engagement analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { from, to, platform } = req.query;

      let query = 'SELECT * FROM post_analytics WHERE 1=1';
      const params = [];

      if (from) {
        query += ` AND created_at >= $${params.length + 1}`;
        params.push(from);
      }

      if (to) {
        query += ` AND created_at <= $${params.length + 1}`;
        params.push(to);
      }

      if (platform) {
        query += ` AND platform = $${params.length + 1}`;
        params.push(platform);
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        analytics: result.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching analytics',
        error: error.message
      });
    }
  }

  /**
   * GET /api/social/config/:platform
   * Get platform configuration
   */
  static async getConfig(req, res) {
    try {
      const { platform } = req.params;

      const config = await socialMediaService.getPlatformConfig(platform);

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching config',
        error: error.message
      });
    }
  }

  /**
   * PUT /api/social/config/:platform
   * Update platform configuration
   */
  static async updateConfig(req, res) {
    try {
      const { platform } = req.params;
      const config = { ...req.body, platform };

      const result = await socialMediaService.updatePlatformConfig(platform, config);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating config',
        error: error.message
      });
    }
  }
}

module.exports = SocialMediaController;
