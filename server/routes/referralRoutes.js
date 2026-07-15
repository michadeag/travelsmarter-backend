const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// Public — self-service "become a partner" application form
router.post('/apply', referralController.applyAsPartner);

// Public — referral link redirect, logs the click
router.get('/go/:code', referralController.trackClick);

// Admin — partner review and conversion/payout management
router.get('/admin/partners', protectWithAdminFallback, referralController.getAllPartners);
router.put('/admin/partners/:id', protectWithAdminFallback, referralController.updatePartnerStatus);
router.get('/admin/conversions', protectWithAdminFallback, referralController.getAllConversions);
router.post('/admin/conversions/:id/mark-paid', protectWithAdminFallback, referralController.markConversionPaid);

module.exports = router;
