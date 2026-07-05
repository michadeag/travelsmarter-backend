const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const affiliateController = require('../controllers/affiliateController');

// Public — content links to this directly (Partner Deals, hack content, emails)
router.get('/go/:slug', affiliateController.redirectToPartner);

// Admin — manage the partner link registry
router.get('/admin', protectWithAdminFallback, affiliateController.getAllPartners);
router.post('/admin', protectWithAdminFallback, affiliateController.createPartner);
router.put('/admin/:id', protectWithAdminFallback, affiliateController.updatePartner);
router.delete('/admin/:id', protectWithAdminFallback, affiliateController.deletePartner);

module.exports = router;
