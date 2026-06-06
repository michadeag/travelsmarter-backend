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

// Public routes
router.get('/modules', getAllModules);
router.get('/module/:moduleId', getHacksByModule);

// Admin routes (hacks management)
router.get('/', protect, getHacks);
router.post('/', protect, createHack);
router.put('/:id', protect, updateHack);
router.delete('/:id', protect, deleteHack);

// Private routes (user saving hacks)
router.post('/save', protect, saveHack);
router.delete('/:hackId/remove', protect, removeHack);
router.get('/saved', protect, getSavedHacks);
router.get('/:hackId/is-saved', protect, isHackSaved);

module.exports = router;
