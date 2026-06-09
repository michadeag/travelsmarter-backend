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

// Admin creation (protected - only admin role can create other admins)
router.post('/create', verifyAdminToken, requireAdminRole(['admin']), adminAuthController.createAdmin);

module.exports = router;
