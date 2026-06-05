const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createCheckoutSession,
  handleWebhook,
  getCurrentSubscription,
  cancelSubscription,
  getPricing,
} = require('../controllers/subscriptionController');

// Public routes
router.get('/pricing', getPricing);

// Webhook route (should be handled specially - no body parsing)
router.post('/webhook', handleWebhook);

// Private routes
router.post('/checkout', protect, createCheckoutSession);
router.get('/current', protect, getCurrentSubscription);
router.post('/cancel', protect, cancelSubscription);

module.exports = router;
