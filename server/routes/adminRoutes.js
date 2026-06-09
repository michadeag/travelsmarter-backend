const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');
const { verifyAdminToken } = require('../middleware/adminAuth');
const pool = require('../config/database');

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

// Debug endpoint - check all settings in database
router.get('/debug/settings', async (req, res) => {
  try {
    const pool = require('../config/database');
    const result = await pool.query('SELECT key, value, type, description FROM settings ORDER BY key');

    res.status(200).json({
      success: true,
      message: `Found ${result.rows.length} settings in database`,
      settings: result.rows.map(row => ({
        key: row.key,
        value: row.value ? `${row.value.substring(0, 20)}...` : '(empty)',
        type: row.type,
        description: row.description
      })),
      allSettings: result.rows // Full data for debugging
    });
  } catch (error) {
    console.error('Debug settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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

// ============================================
// ADMIN MANAGEMENT ENDPOINTS (Protected by admin auth)
// ============================================

// Update user (admin only)
router.put('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, subscriptionTier } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET email = $1, first_name = $2, last_name = $3, subscription_tier = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, first_name, last_name, subscription_tier, created_at, updated_at`,
      [email, firstName || null, lastName || null, subscriptionTier || 'free', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// Proxy admin endpoints - redirect to existing endpoints via database queries
// This is simpler than trying to make admins work with user-only middleware

// Get subscriptions (admin)
router.get('/subscriptions', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.email FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC`
    );
    res.status(200).json({
      success: true,
      subscriptions: result.rows
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
});

// Update subscription (admin)
router.put('/subscriptions/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, status } = req.body;

    const result = await pool.query(
      `UPDATE subscriptions
       SET tier = COALESCE($1, tier),
           status = COALESCE($2, status)
       WHERE id = $3
       RETURNING *`,
      [tier, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: result.rows[0]
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription',
      error: error.message
    });
  }
});

// Delete subscription (admin)
router.delete('/subscriptions/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM subscriptions WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subscription',
      error: error.message
    });
  }
});

// Get promos (admin)
router.get('/promos', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM promos ORDER BY created_at DESC`
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get promos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching promos',
      error: error.message
    });
  }
});

// Create promo (admin)
router.post('/promos', verifyAdminToken, async (req, res) => {
  try {
    const { code, discount_percent, discount_amount, max_uses, valid_until } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }

    const result = await pool.query(
      `INSERT INTO promos (code, discount_percent, discount_amount, max_uses, valid_until, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING *`,
      [code.toUpperCase(), discount_percent || null, discount_amount || null, max_uses || null, valid_until || null]
    );

    res.status(201).json({
      success: true,
      message: 'Promo created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating promo',
      error: error.message
    });
  }
});

// Update promo (admin)
router.put('/promos/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discount_percent, discount_amount, max_uses, valid_until, is_active } = req.body;

    const result = await pool.query(
      `UPDATE promos
       SET code = COALESCE($1, code),
           discount_percent = COALESCE($2, discount_percent),
           discount_amount = COALESCE($3, discount_amount),
           max_uses = COALESCE($4, max_uses),
           valid_until = COALESCE($5, valid_until),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [code ? code.toUpperCase() : null, discount_percent, discount_amount, max_uses, valid_until, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promo updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating promo',
      error: error.message
    });
  }
});

// Delete promo (admin)
router.delete('/promos/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM promos WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promo deleted successfully'
    });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting promo',
      error: error.message
    });
  }
});

// Get email templates sequences (admin)
router.get('/email-templates/sequences', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM email_sequences ORDER BY created_at DESC`
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get sequences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sequences',
      error: error.message
    });
  }
});

// Get deals (admin)
router.get('/deals', verifyAdminToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT * FROM deals ORDER BY created_at DESC LIMIT $1`,
      [parseInt(limit)]
    );
    res.status(200).json({
      success: true,
      deals: result.rows
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deals',
      error: error.message
    });
  }
});

// Create deal (admin)
router.post('/deals', verifyAdminToken, async (req, res) => {
  try {
    const { title, description, category, deal_type, value_amount, value_currency } = req.body;

    if (!title || !value_amount) {
      return res.status(400).json({
        success: false,
        message: 'Title and value are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO deals (title, description, category, deal_type, value_amount, value_currency, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [title, description || null, category || null, deal_type || 'featured', value_amount, value_currency || 'EUR']
    );

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      deal: result.rows[0]
    });
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating deal',
      error: error.message
    });
  }
});

// Update deal (admin)
router.put('/deals/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, value_amount } = req.body;

    const result = await pool.query(
      `UPDATE deals
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           value_amount = COALESCE($4, value_amount)
       WHERE id = $5
       RETURNING *`,
      [title, description, category, value_amount, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      deal: result.rows[0]
    });
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating deal',
      error: error.message
    });
  }
});

// Delete deal (admin)
router.delete('/deals/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM deals WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting deal',
      error: error.message
    });
  }
});

// Get hacks (admin)
router.get('/hacks', verifyAdminToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM hacks ORDER BY created_at DESC`
    );
    res.status(200).json({
      success: true,
      hacks: result.rows
    });
  } catch (error) {
    console.error('Get hacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hacks',
      error: error.message
    });
  }
});

// Create hack (admin)
router.post('/hacks', verifyAdminToken, async (req, res) => {
  try {
    const { module_id, title, description, category, difficulty } = req.body;

    if (!module_id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Module ID, title, and description are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO hacks (module_id, title, description, category, difficulty, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [module_id, title, description, category || null, difficulty || 'medium']
    );

    res.status(201).json({
      success: true,
      message: 'Hack created successfully',
      hack: result.rows[0]
    });
  } catch (error) {
    console.error('Create hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating hack',
      error: error.message
    });
  }
});

// Update hack (admin)
router.put('/hacks/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, difficulty } = req.body;

    const result = await pool.query(
      `UPDATE hacks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           difficulty = COALESCE($4, difficulty)
       WHERE id = $5
       RETURNING *`,
      [title, description, category, difficulty, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hack not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hack updated successfully',
      hack: result.rows[0]
    });
  } catch (error) {
    console.error('Update hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hack',
      error: error.message
    });
  }
});

// Delete hack (admin)
router.delete('/hacks/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM hacks WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hack not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hack deleted successfully'
    });
  } catch (error) {
    console.error('Delete hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting hack',
      error: error.message
    });
  }
});

// Get users for dashboard (replaces activities endpoint)
router.get('/activities', verifyAdminToken, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    // Get all users with subscription info for dashboard
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.subscription_tier,
        u.created_at,
        u.updated_at,
        u.last_login,
        'signup' as action,
        'success' as status,
        u.created_at as created_at_activity
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT $1`,
      [parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      activities: result.rows
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
