const express = require('express');
const router = express.Router();
const sportsEquipmentController = require('../controllers/sportsEquipmentController');

router.post('/sports-equipment-checker/calculate', sportsEquipmentController.calculateSportsEquipment);
router.post('/sports-equipment-checker/pdf', sportsEquipmentController.generateSportsEquipmentPdf);

module.exports = router;
