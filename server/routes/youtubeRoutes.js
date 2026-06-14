const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminAuth');
const { searchVideos, generateComment } = require('../controllers/youtubeController');

router.get('/search', verifyAdminToken, searchVideos);
router.post('/generate-comment', verifyAdminToken, generateComment);

module.exports = router;
