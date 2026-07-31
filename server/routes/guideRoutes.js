const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const guideController = require('../controllers/guideController');

// Memory storage only — this platform's container disk is ephemeral, so a
// PDF written to it would vanish on the next deploy (same lesson already
// paid for with tool og:images). The buffer goes straight into Postgres.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are accepted'));
    cb(null, true);
  },
});

// Admin
router.get('/admin', protectWithAdminFallback, guideController.listGuidesAdmin);
router.post('/admin', protectWithAdminFallback, upload.single('pdf'), guideController.createGuide);
router.put('/admin/:id', protectWithAdminFallback, upload.single('pdf'), guideController.updateGuide);
router.post('/admin/:id/publish', protectWithAdminFallback, guideController.togglePublish);
router.delete('/admin/:id', protectWithAdminFallback, guideController.deleteGuide);

// Public
router.get('/public/:slug', guideController.getGuidePublic);
router.get('/public', guideController.listGuidesByCountry);
router.post('/checkout', guideController.createGuideCheckout);
router.post('/checkout-bundle', guideController.createBundleCheckout);

module.exports = router;
