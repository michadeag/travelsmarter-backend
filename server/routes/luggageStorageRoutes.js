const express = require('express');
const router = express.Router();
const luggageStorageController = require('../controllers/luggageStorageController');

router.post('/luggage-storage-checker/calculate', luggageStorageController.calculateLuggageStorage);
router.post('/luggage-storage-checker/pdf', luggageStorageController.generateLuggageStoragePdf);

module.exports = router;
