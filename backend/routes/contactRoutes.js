const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');

/**
 * Contact form routes
 */

// POST /api/contact/send - Send contact form email
router.post('/send', sendContactEmail);

module.exports = router;
