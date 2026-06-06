const express = require('express');
const router = express.Router();
const {
  getAllPromos,
  getPromoByCode,
  createPromo,
  updatePromo,
  deletePromo,
  validatePromo
} = require('../controllers/promoController');

// Public routes
router.get('/', getAllPromos);
router.get('/:code/validate', validatePromo);
router.get('/:code', getPromoByCode);

// Admin routes (create, update, delete)
// In production, add authentication middleware here
router.post('/', createPromo);
router.put('/:id', updatePromo);
router.delete('/:id', deletePromo);

module.exports = router;
