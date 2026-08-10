const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminAuth');
const { searchVideos, generateComment, dailyTopic } = require('../controllers/youtubeController');

router.get('/search', verifyAdminToken, searchVideos);
router.get('/daily-topic', verifyAdminToken, dailyTopic);
router.post('/generate-comment', verifyAdminToken, generateComment);

module.exports = router;
