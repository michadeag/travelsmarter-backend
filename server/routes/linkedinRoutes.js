const express = require('express');
const router = express.Router();
const linkedinService = require('../services/linkedinService');
const axios = require('axios');
const pool = require('../config/database');

const LINKEDIN_REDIRECT = 'https://api.travelsmarterapp.com/api/linkedin/callback';

// Step 1: Generate OAuth URL
router.get('/auth-url', async (req, res) => {
  try {
    const r = await pool.query(`SELECT value FROM settings WHERE key = 'linkedin_client_id'`);
    const clientId = r.rows[0]?.value;
    if (!clientId) return res.status(400).json({ success: false, error: 'LinkedIn Client ID not set in Settings' });
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT)}&scope=openid%20profile%20w_member_social&state=travelsmarter`;
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Step 2: OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.send(`<h2>LinkedIn Auth Error: ${error}</h2>`);
    if (!code) return res.send('<h2>No code received</h2>');

    const clientIdR = await pool.query(`SELECT value FROM settings WHERE key = 'linkedin_client_id'`);
    const clientSecR = await pool.query(`SELECT value FROM settings WHERE key = 'linkedin_client_secret'`);
    const clientId = clientIdR.rows[0]?.value;
    const clientSecret = clientSecR.rows[0]?.value;

    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT)}&client_id=${clientId}&client_secret=${clientSecret}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Get person URN
    let personUrn = '';
    try {
      const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      personUrn = profileRes.data.sub || '';
    } catch (e) { console.warn('Could not fetch LinkedIn profile:', e.message); }

    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('linkedin_access_token', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [accessToken]
    );
    if (personUrn) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ('linkedin_person_urn', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [personUrn]
      );
    }

    res.send(`<h2>✅ LinkedIn connected!</h2><p>Access Token and Person URN saved. You can close this window.</p><script>setTimeout(()=>window.close(),3000)</script>`);
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.send(`<h2>❌ Error: ${detail}</h2>`);
  }
});

router.get('/status', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    const pool = require('../config/database');
    const r = await pool.query(`SELECT COUNT(*) AS total FROM linkedin_posts`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = linkedinService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    const configured = await linkedinService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/post-article', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    const result = await linkedinService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await linkedinService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    const result = linkedinService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = linkedinService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
