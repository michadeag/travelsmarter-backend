const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const emailTemplateController = require('../controllers/emailTemplateController');

// All routes require authentication and admin access
// In a full app, add an isAdmin middleware check

// Sequence routes
router.get('/sequences', authenticate, emailTemplateController.getSequences);
router.get('/sequences/:sequenceId', authenticate, emailTemplateController.getSequenceWithTemplates);
router.post('/sequences', authenticate, emailTemplateController.createSequence);
router.put('/sequences/:sequenceId', authenticate, emailTemplateController.updateSequence);

// Template routes
router.post('/templates', authenticate, emailTemplateController.createTemplate);
router.put('/templates/:templateId', authenticate, emailTemplateController.updateTemplate);
router.delete('/templates/:templateId', authenticate, emailTemplateController.deleteTemplate);

// Scheduled emails view
router.get('/scheduled', authenticate, emailTemplateController.getScheduledEmails);

module.exports = router;
