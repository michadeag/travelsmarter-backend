const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  saveHack,
  removeHack,
  getSavedHacks,
  isHackSaved,
  getHacksByModule,
  getAllModules,
  getHacks,
  createHack,
  updateHack,
  deleteHack,
  listHacks,
} = require('../controllers/hacksController');

// Public routes - SPECIFIC routes BEFORE parameter routes
router.get('/modules', optionalAuth, getAllModules);

// Private routes - SPECIFIC routes BEFORE parameter routes
router.post('/save', protect, saveHack);
router.get('/saved', protect, getSavedHacks);

// Admin routes
router.get('/admin/hacks', protect, listHacks);
router.post('/admin/hacks', protect, createHack);
router.put('/admin/hacks/:id', protect, updateHack);
router.delete('/admin/hacks/:id', protect, deleteHack);

// Legacy routes (kept for compatibility)
router.get('/', protect, getHacks);
router.post('/', protect, createHack);

// Module hacks - parameter route (optional auth)
router.get('/module/:moduleId', optionalAuth, getHacksByModule);

// Parameter routes LAST
router.delete('/:hackId/remove', protect, removeHack);
router.get('/:hackId/is-saved', protect, isHackSaved);
router.put('/:id', protect, updateHack);
router.delete('/:id', protect, deleteHack);

module.exports = router;
