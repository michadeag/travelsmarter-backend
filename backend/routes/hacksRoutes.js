const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
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
} = require('../controllers/hacksController');

// Public routes - SPECIFIC routes BEFORE parameter routes
router.get('/modules', protect, getAllModules);

// Private routes - SPECIFIC routes BEFORE parameter routes
router.post('/save', protect, saveHack);
router.get('/saved', protect, getSavedHacks);

// Admin routes
router.get('/', protect, getHacks);
router.post('/', protect, createHack);

// Module hacks - parameter route
router.get('/module/:moduleId', getHacksByModule);

// Parameter routes LAST
router.delete('/:hackId/remove', protect, removeHack);
router.get('/:hackId/is-saved', protect, isHackSaved);
router.put('/:id', protect, updateHack);
router.delete('/:id', protect, deleteHack);

module.exports = router;
