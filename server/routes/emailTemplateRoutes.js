const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const emailTemplateController = require('../controllers/emailTemplateController');

// All routes require authentication - works with both user and admin tokens

// Sequence routes
router.get('/sequences', protectWithAdminFallback, emailTemplateController.getSequences);
router.get('/sequences/:sequenceId', protectWithAdminFallback, emailTemplateController.getSequenceWithTemplates);
router.post('/sequences', protectWithAdminFallback, emailTemplateController.createSequence);
router.put('/sequences/:sequenceId', protectWithAdminFallback, emailTemplateController.updateSequence);

// Template routes
router.get('/templates', protectWithAdminFallback, emailTemplateController.getTemplates);
router.get('/templates/:templateId', protectWithAdminFallback, emailTemplateController.getTemplateById);
router.post('/templates', protectWithAdminFallback, emailTemplateController.createTemplate);
router.post('/templates/:templateId/send-test', protectWithAdminFallback, emailTemplateController.sendTestEmail);
router.put('/templates/:templateId', protectWithAdminFallback, emailTemplateController.updateTemplate);
router.delete('/templates/:templateId', protectWithAdminFallback, emailTemplateController.deleteTemplate);

// Scheduled emails view
router.get('/scheduled', protectWithAdminFallback, emailTemplateController.getScheduledEmails);

module.exports = router;
