const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { verifyAdminToken, requireAdminRole } = require('../middleware/adminAuth');

/**
 * Admin Authentication Routes
 */

// Public routes (no authentication required)
router.post('/login', adminAuthController.login);
router.post('/verify-token', verifyAdminToken, adminAuthController.verifyToken);
router.post('/logout', adminAuthController.logout);

// Initialize first admin (only works if no admins exist)
router.post('/init', async (req, res) => {
  try {
    const pool = require('../config/database');

    // Create admin_users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'moderator',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
      CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
    `);

    console.log('✅ Admin tables created/verified');

    // Check if any admins exist
    const result = await pool.query('SELECT COUNT(*) as count FROM admin_users');
    const adminCount = parseInt(result.rows[0].count);

    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Admin users already exist. Use /create endpoint instead.'
      });
    }

    // Create first admin
    await adminAuthController.createAdmin(req, res);
  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({
      success: false,
      message: 'Initialization failed',
      error: error.message
    });
  }
});

// Admin creation (protected - only admin role can create other admins)
router.post('/create', verifyAdminToken, requireAdminRole(['admin']), adminAuthController.createAdmin);

module.exports = router;
