const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  getDeals,
  getDeal,
  createDeal,
  upvoteDeal,
  saveDeal,
  getSavedDeals,
  getDealsByCategory,
  getTrendingDeals,
  searchDeals,
} = require('../controllers/dealsController');

// Public routes
router.get('/', getDeals);
router.get('/trending', getTrendingDeals);
router.get('/search', searchDeals);
router.get('/stats/by-category', getDealsByCategory);
router.get('/:id', getDeal);

// Private routes
router.post('/', protect, createDeal);
router.post('/:id/upvote', protect, upvoteDeal);
router.post('/:id/save', protect, saveDeal);
router.get('/saved', protect, getSavedDeals);

module.exports = router;
