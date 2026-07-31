const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const toolOgImageService = require('../services/toolOgImageService');

// Kick off (or re-kick-off with force=true) OpenAI image generation for
// every free-tool category's branded thumbnail. Returns immediately —
// generation continues in the background; poll GET / to watch results fill in.
router.post('/generate', protectWithAdminFallback, async (req, res) => {
  try {
    const { force } = req.body || {};
    const result = await toolOgImageService.generateAllToolImages(!!force);
    res.json({ success: true, ...result, total: toolOgImageService.TOOL_THEMES.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public — these are meant to be embedded as public og:image URLs anyway.
router.get('/', async (req, res) => {
  try {
    const [images, failed] = await Promise.all([
      toolOgImageService.getAllToolImages(),
      toolOgImageService.getFailedToolImages(),
    ]);
    res.json({ success: true, total: toolOgImageService.TOOL_THEMES.length, images, failed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
