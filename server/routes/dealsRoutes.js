const express = require('express');
const router = express.Router();
const { protect, optionalAuth, protectWithAdminFallback } = require('../middleware/auth');
const {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  upvoteDeal,
  saveDeal,
  getSavedDeals,
  getDealsByCategory,
  getTrendingDeals,
  searchDeals,
  getDealCount,
} = require('../controllers/dealsController');

// Public routes - SPECIFIC routes BEFORE parameter routes
router.get('/count', getDealCount);
router.get('/trending', getTrendingDeals);
router.get('/search', searchDeals);
router.get('/stats/by-category', getDealsByCategory);
router.get('/', getDeals);

// Private routes - SPECIFIC routes BEFORE parameter routes
router.get('/saved', protect, getSavedDeals);
router.post('/:id/upvote', protect, upvoteDeal);
router.post('/:id/save', protect, saveDeal);

// Parameter routes LAST
router.get('/:id', getDeal);
router.post('/', protectWithAdminFallback, createDeal);
router.put('/:id', protectWithAdminFallback, updateDeal);
router.delete('/:id', protectWithAdminFallback, deleteDeal);

module.exports = router;
