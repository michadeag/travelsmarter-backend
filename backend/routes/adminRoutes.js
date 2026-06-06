const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');

/**
 * Admin Settings Routes
 * All routes are public for now (add authentication middleware if needed)
 */

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

// Public endpoint to get Stripe publishable key (for checkout page)
router.get('/config/stripe-key', async (req, res) => {
  try {
    const result = await require('../config/database').query(
      'SELECT value FROM settings WHERE key = $1',
      ['stripe_publishable_key']
    );

    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.status(404).json({
        success: false,
        error: 'Stripe key not configured'
      });
    }

    res.status(200).json({
      success: true,
      stripepublishableKey: result.rows[0].value
    });
  } catch (error) {
    console.error('Get Stripe key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Stripe configuration'
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
