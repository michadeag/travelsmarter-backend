const express = require('express');
const router = express.Router();
const etiquetteController = require('../controllers/etiquetteController');

router.post('/etiquette-checker/calculate', etiquetteController.calculateEtiquette);
router.post('/etiquette-checker/pdf', etiquetteController.generateEtiquettePdf);

module.exports = router;
