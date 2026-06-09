const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const {
  getAllPromos,
  getPromoByCode,
  createPromo,
  updatePromo,
  deletePromo,
  validatePromo
} = require('../controllers/promoController');

// Routes with specific paths FIRST (before parameter routes)
router.get('/:code/validate', validatePromo);

// Public routes
router.get('/', getAllPromos);
router.get('/:code', getPromoByCode);

// Admin routes (create, update, delete) - Protected with admin fallback
router.post('/', protectWithAdminFallback, createPromo);
router.put('/:id', protectWithAdminFallback, updatePromo);
router.delete('/:id', protectWithAdminFallback, deletePromo);

module.exports = router;
