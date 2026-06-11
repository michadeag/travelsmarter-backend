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
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT)}&scope=w_member_social&state=travelsmarter`;
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
    console.log('LinkedIn OAuth - clientId:', clientId ? clientId.substring(0,8)+'...' : 'MISSING');
    console.log('LinkedIn OAuth - clientSecret:', clientSecret ? clientSecret.substring(0,8)+'...' : 'MISSING');

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', LINKEDIN_REDIRECT);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Get person URN via /v2/me
    let personUrn = '';
    try {
      const profileRes = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' }
      });
      personUrn = profileRes.data.id || '';
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

// Topics list for UI dropdown
router.get('/topics', async (req, res) => {
  try {
    const topics = linkedinService.TOPICS || [];
    const counter = linkedinService.postCounter || 0;
    const nextIdx = counter % topics.length;
    res.json({ success: true, topics: topics.map((t, i) => ({ index: i, title: t.topic.substring(0, 60), isNext: i === nextIdx })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate post text only (no posting)
router.post('/generate', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    const { topicIndex } = req.body;
    const topics = linkedinService.TOPICS;
    const idx = (topicIndex != null && topics[topicIndex]) ? topicIndex : Math.floor(Math.random() * topics.length);
    const topicEntry = topics[idx];

    linkedinService.postCounter = (linkedinService.postCounter || 0) + 1;
    const includeCTA = linkedinService.postCounter % 3 === 0;
    const post = await linkedinService.generatePost(topicEntry, includeCTA);

    // Save as draft in DB
    const r = await pool.query(
      `INSERT INTO linkedin_posts (body, category, included_cta, status, posted_at)
       VALUES ($1, $2, $3, 'draft', NOW()) RETURNING id`,
      [post.text, post.category, includeCTA]
    );
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('linkedin_post_counter', $1, 'text')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(linkedinService.postCounter)]
    );

    res.json({ success: true, text: post.text, category: post.category, includeCTA, dbId: r.rows[0].id });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.status(500).json({ success: false, error: detail });
  }
});

// Mark manually posted
router.post('/log-manual', async (req, res) => {
  try {
    const { dbId, text, category, linkedinUrl, includeCTA } = req.body;
    if (dbId) {
      await pool.query(
        `UPDATE linkedin_posts SET status='posted', linkedin_post_id=$1, posted_at=NOW() WHERE id=$2`,
        [linkedinUrl || null, dbId]
      );
    } else {
      await pool.query(
        `INSERT INTO linkedin_posts (body, category, included_cta, linkedin_post_id, status, posted_at)
         VALUES ($1, $2, $3, $4, 'posted', NOW())`,
        [text, category, includeCTA || false, linkedinUrl || null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
    const c = linkedinService.credentials;
    console.log('LinkedIn post - configured:', linkedinService.isConfigured);
    console.log('LinkedIn post - hasToken:', !!c.accessToken);
    console.log('LinkedIn post - personUrn:', c.personUrn || 'NOT SET');
    console.log('LinkedIn post - orgId:', c.orgId || 'NOT SET');
    const result = await linkedinService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('LinkedIn post error:', detail);
    res.status(500).json({ success: false, error: detail });
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

// Fetch and save person URN from current access token
router.post('/fetch-urn', async (req, res) => {
  try {
    await linkedinService.loadSettings();
    const token = linkedinService.credentials.accessToken;
    if (!token) return res.status(400).json({ success: false, error: 'No access token saved' });

    let personId = null;
    const errors = [];

    // Try /v2/me
    try {
      const r = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' }
      });
      personId = r.data.id;
      console.log('💼 LinkedIn /v2/me →', personId, JSON.stringify(r.data));
    } catch (e) {
      errors.push('/v2/me: ' + (e.response?.status || e.message));
    }

    // Try token introspection — returns sub (member ID) using client credentials
    if (!personId) {
      try {
        const clientIdR = await pool.query(`SELECT value FROM settings WHERE key = 'linkedin_client_id'`);
        const clientSecR = await pool.query(`SELECT value FROM settings WHERE key = 'linkedin_client_secret'`);
        const clientId = clientIdR.rows[0]?.value;
        const clientSecret = clientSecR.rows[0]?.value;
        if (clientId && clientSecret) {
          const params = new URLSearchParams();
          params.append('token', token);
          params.append('client_id', clientId);
          params.append('client_secret', clientSecret);
          const r = await axios.post('https://www.linkedin.com/oauth/v2/introspectToken', params,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          console.log('💼 LinkedIn introspect →', JSON.stringify(r.data));
          // sub is the numeric member ID
          personId = r.data.sub || r.data.id || r.data.member_id;
        }
      } catch (e) {
        errors.push('introspect: ' + (e.response?.status + ' ' + JSON.stringify(e.response?.data) || e.message));
      }
    }

    // Try /v2/userinfo (OpenID Connect)
    if (!personId) {
      try {
        const r = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        personId = r.data.sub;
        console.log('💼 LinkedIn /v2/userinfo sub →', personId);
      } catch (e) {
        errors.push('/v2/userinfo: ' + (e.response?.status || e.message));
      }
    }

    if (!personId) {
      return res.status(400).json({ success: false, error: `Could not resolve member ID. Errors: ${errors.join(' | ')}` });
    }

    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('linkedin_person_urn', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [personId]
    );
    res.json({ success: true, personUrn: personId, tried: errors });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.status(500).json({ success: false, error: detail });
  }
});

module.exports = router;
