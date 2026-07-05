const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const broadcastController = require('../controllers/broadcastController');

router.get('/templates', protectWithAdminFallback, broadcastController.getTemplates);
router.get('/subscribers', protectWithAdminFallback, broadcastController.getSubscribers);
router.post('/send', protectWithAdminFallback, broadcastController.sendBroadcast);

module.exports = router;
