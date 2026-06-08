const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');

/**
 * Admin Settings Routes
 * All routes are public for now (add authentication middleware if needed)
 */

// Health check for admin routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin routes are working'
  });
});

// Get all settings
router.get('/settings', SettingsController.getAllSettings);

// Get single setting
router.get('/settings/:key', SettingsController.getSetting);

// Update single setting
router.post('/settings', SettingsController.updateSetting);

// Update multiple settings at once
router.post('/settings/batch/update', SettingsController.updateMultipleSettings);

// Delete setting
router.delete('/settings/:key', SettingsController.deleteSetting);

// Get recent activities for dashboard
router.get('/activities', async (req, res) => {
  try {
    const pool = require('../config/database');
    const { limit = 10 } = req.query;

    // Get recent user signups and activities
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.first_name,
        u.created_at,
        'signup' as activity_type
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT $1`,
      [parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      activities: result.rows.map(row => ({
        id: row.id,
        user: row.first_name || row.email,
        email: row.email,
        activity: 'New user signup',
        timestamp: row.created_at
      }))
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
});

// Public endpoint to get Stripe publishable key (for checkout page)
router.get('/config/stripe-key', async (req, res) => {
  try {
    const pool = require('../config/database');

    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['stripe_publishable_key']
    );

    console.log('Stripe key query result:', result.rows);

    if (!result.rows || result.rows.length === 0) {
      console.warn('Stripe key not found in database');
      return res.status(200).json({
        success: false,
        stripepublishableKey: null,
        error: 'Stripe key not configured in database'
      });
    }

    const stripeKey = result.rows[0].value;

    if (!stripeKey) {
      console.warn('Stripe key value is empty');
      return res.status(200).json({
        success: false,
        stripepublishableKey: null,
        error: 'Stripe key is empty'
      });
    }

    res.status(200).json({
      success: true,
      stripepublishableKey: stripeKey
    });
  } catch (error) {
    console.error('Get Stripe key error:', error);
    res.status(200).json({
      success: false,
      stripepublishableKey: null,
      error: 'Failed to retrieve Stripe key: ' + error.message
    });
  }
});

// Public endpoint to get SendGrid key
router.get('/config/sendgrid-key', async (req, res) => {
  try {
    const result = await require('../config/database').query(
      'SELECT value FROM settings WHERE key = $1',
      ['sendgrid_api_key']
    );

    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.status(404).json({
        success: false,
        error: 'SendGrid key not configured'
      });
    }

    res.status(200).json({
      success: true,
      sendgridApiKey: result.rows[0].value
    });
  } catch (error) {
    console.error('Get SendGrid key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve SendGrid configuration'
    });
  }
});

module.exports = router;
