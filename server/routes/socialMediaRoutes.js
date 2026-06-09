/**
 * Social Media Routes
 * API endpoints for social media management
 */

const express = require('express');
const router = express.Router();
const { verifyAdminToken, requireAdminRole } = require('../middleware/adminAuth');
const SocialMediaController = require('../controllers/socialMediaController');

// Public endpoints (no auth required)
router.get('/status', SocialMediaController.getStatus);

// Protected endpoints (admin only)
router.post('/posts', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.createPost);
router.post('/posts/:id/publish', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.publishPost);
router.get('/posts', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.listPosts);

// Account management
router.get('/accounts', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.getAccounts);
router.post('/accounts', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.addAccount);
router.delete('/accounts/:id', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.removeAccount);

// Analytics
router.get('/analytics', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.getAnalytics);

// Configuration
router.get('/config/:platform', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.getConfig);
router.put('/config/:platform', verifyAdminToken, requireAdminRole(['admin']), SocialMediaController.updateConfig);

module.exports = router;
