const express = require('express');
const router = express.Router();
const packingListController = require('../controllers/packingListController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/packing-list/calculate', packingListController.calculatePackingList);
router.post('/packing-list/pdf', packingListController.generatePackingListPdf);

module.exports = router;
