const express = require('express');
const router = express.Router();
const categoryBundleController = require('../controllers/categoryBundleController');

router.post('/category-bundle/preview', categoryBundleController.previewCategoryBundle);
router.post('/category-bundle/pdf', categoryBundleController.generateCategoryBundlePdf);

module.exports = router;
