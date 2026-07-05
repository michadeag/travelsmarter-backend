const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const webhookController = require('../controllers/webhookController');

// SendGrid POSTs event batches here directly — no auth header available.
router.post('/sendgrid', webhookController.handleSendGridEvent);

// Admin-only view of aggregated open/click stats per sequence email.
router.get('/sendgrid/stats', protectWithAdminFallback, webhookController.getEmailEngagementStats);

module.exports = router;
