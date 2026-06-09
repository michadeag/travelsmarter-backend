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
