const express = require('express');
const router = express.Router();
const { verifyAdminToken, requireAdminRole } = require('../middleware/adminAuth');
const twitterService = require('../services/twitterService');
const twitterScheduler = require('../services/twitterScheduler');
const travelTips = require('../services/travelTips');

/**
 * GET /api/twitter/status
 * Check if Twitter is configured and get scheduler status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: twitterService.isConfigured(),
    scheduledJobs: twitterScheduler.getScheduledJobs().length,
    jobs: twitterScheduler.getScheduledJobs().map(job => ({
      type: job.type,
      time: job.time || 'N/A'
    }))
  });
});

/**
 * POST /api/twitter/reload-settings
 * Reload Twitter settings from database and reinitialize service
 * Admin only
 */
router.post('/reload-settings', verifyAdminToken, requireAdminRole(['admin', 'moderator']), async (req, res) => {
  try {
    const pool = require('../config/database');

    // Fetch Twitter settings from database
    const result = await pool.query(`
      SELECT key, value FROM settings
      WHERE key LIKE 'twitter_%'
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    if (!settings.twitter_api_key || !settings.twitter_api_secret) {
      return res.status(400).json({
        success: false,
        message: 'Twitter credentials not found in settings'
      });
    }

    // Reinitialize Twitter service with settings
    const success = twitterService.reinitializeWithSettings(settings);

    if (success) {
      res.json({
        success: true,
        message: 'Twitter service reinitialized with database credentials',
        configured: twitterService.isConfigured()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to initialize Twitter service with provided credentials'
      });
    }
  } catch (error) {
    console.error('Error reloading Twitter settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error reloading Twitter settings',
      error: error.message
    });
  }
});

/**
 * POST /api/twitter/post-random
 * Post a random travel tip
 * Admin only
 */
router.post('/post-random', verifyAdminToken, requireAdminRole(['admin', 'moderator']), async (req, res) => {
  if (!twitterService.isConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'Twitter API not configured'
    });
  }

  try {
    const result = await twitterService.postRandomTip();

    if (result.success) {
      res.json({
        success: true,
        message: 'Tweet posted successfully',
        tweetId: result.tweetId,
        text: result.text
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post tweet',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error posting tweet',
      error: error.message
    });
  }
});

/**
 * POST /api/twitter/post-category
 * Post tip from specific category
 * Admin only
 */
router.post('/post-category', verifyAdminToken, requireAdminRole(['admin', 'moderator']), async (req, res) => {
  const { category } = req.body;

  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Category is required'
    });
  }

  if (!twitterService.isConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'Twitter API not configured'
    });
  }

  try {
    const result = await twitterService.postTipByCategory(category);

    if (result.success) {
      res.json({
        success: true,
        message: `${category} tweet posted successfully`,
        tweetId: result.tweetId,
        text: result.text
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post tweet',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error posting tweet',
      error: error.message
    });
  }
});

/**
 * POST /api/twitter/post-custom
 * Post custom tweet
 * Admin only
 */
router.post('/post-custom', verifyAdminToken, requireAdminRole(['admin']), async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      message: 'Tweet text is required'
    });
  }

  if (text.length > 280) {
    return res.status(400).json({
      success: false,
      message: 'Tweet exceeds 280 character limit'
    });
  }

  if (!twitterService.isConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'Twitter API not configured'
    });
  }

  try {
    const result = await twitterService.postTweet(text);

    if (result.success) {
      res.json({
        success: true,
        message: 'Custom tweet posted successfully',
        tweetId: result.tweetId,
        text: result.text
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to post tweet',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error posting tweet',
      error: error.message
    });
  }
});

/**
 * GET /api/twitter/tips
 * Get all available tips
 */
router.get('/tips', (req, res) => {
  const { category } = req.query;
  let tips;

  if (category) {
    tips = travelTips.getTipsByCategory(category);
  } else {
    tips = travelTips.getAllTips();
  }

  res.json({
    success: true,
    count: tips.length,
    category: category || 'all',
    tips
  });
});

/**
 * GET /api/twitter/tips/random
 * Get a random tip
 */
router.get('/tips/random', (req, res) => {
  const tip = travelTips.getRandomTip();

  res.json({
    success: true,
    tip
  });
});

/**
 * GET /api/twitter/tips/categories
 * Get all available categories
 */
router.get('/tips/categories', (req, res) => {
  const tips = travelTips.getAllTips();
  const categories = [...new Set(tips.map(t => t.category))];

  res.json({
    success: true,
    categories,
    count: categories.length
  });
});

/**
 * POST /api/twitter/scheduler/start
 * Start scheduler with specific configuration
 * Admin only
 */
router.post('/scheduler/start', verifyAdminToken, requireAdminRole(['admin']), (req, res) => {
  const { schedule = 'recommended', times } = req.body;

  if (!twitterService.isConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'Twitter API not configured'
    });
  }

  try {
    switch (schedule) {
      case 'daily':
        const time = times?.[0] || '09:00';
        twitterScheduler.startDailyPosting(time);
        res.json({
          success: true,
          message: `Daily posting started at ${time}`,
          schedule,
          time
        });
        break;

      case 'multiple':
        if (!times || times.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Times array is required for multiple posting'
          });
        }
        twitterScheduler.startMultipleDailyPostings(times);
        res.json({
          success: true,
          message: `Multiple daily postings started`,
          schedule,
          times
        });
        break;

      case 'hourly':
        twitterScheduler.startHourlyPosting();
        res.json({
          success: true,
          message: 'Hourly posting started',
          schedule
        });
        break;

      case 'recommended':
        twitterScheduler.startRecommendedSchedule();
        res.json({
          success: true,
          message: 'Recommended schedule started (3 posts daily)',
          schedule
        });
        break;

      default:
        res.status(400).json({
          success: false,
          message: `Unknown schedule: ${schedule}`
        });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting scheduler',
      error: error.message
    });
  }
});

/**
 * POST /api/twitter/scheduler/stop
 * Stop all scheduled jobs
 * Admin only
 */
router.post('/scheduler/stop', verifyAdminToken, requireAdminRole(['admin']), (req, res) => {
  try {
    twitterScheduler.stopAllJobs();

    res.json({
      success: true,
      message: 'All scheduled jobs stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error stopping scheduler',
      error: error.message
    });
  }
});

module.exports = router;
