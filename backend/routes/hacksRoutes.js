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
} = require('../controllers/hacksController');

// Public routes
router.get('/modules', getAllModules);
router.get('/module/:moduleId', getHacksByModule);

// Private routes
router.post('/save', protect, saveHack);
router.delete('/:hackId/remove', protect, removeHack);
router.get('/saved', protect, getSavedHacks);
router.get('/:hackId/is-saved', protect, isHackSaved);

module.exports = router;
