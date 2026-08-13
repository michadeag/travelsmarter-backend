const axios = require('axios');
const pool = require('../config/database');

// Commits generated static pages (guide landing pages, bundle pages)
// directly to the frontend repo via GitHub's Contents API, so a guide
// going live in the admin dashboard and its page actually existing happen
// in the same step — previously this required manually running
// scripts/generate-guide-page.js and pushing by hand after every publish.
const API_BASE = 'https://api.github.com';

async function getSettings() {
  const { rows } = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('github_token', 'github_repo')`
  );
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    token: map.github_token || null,
    repo: map.github_repo || 'michadeag/travelsmarter-frontend',
  };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'travelsmarter-backend',
  };
}

// Creates or updates a file in the frontend repo. Looks up the current sha
// first (required by GitHub's API for updates; omitted for new files) —
// a 404 on that lookup just means the file doesn't exist yet, not an error.
async function commitFile(filePath, content, message) {
  const { token, repo } = await getSettings();
  if (!token) {
    throw new Error('GitHub token not configured — add one in the PDF Guides tab settings to enable auto-publishing pages.');
  }

  const url = `${API_BASE}/repos/${repo}/contents/${filePath}`;
  let sha;
  let existingContent = null;
  try {
    const existing = await axios.get(url, { headers: headers(token) });
    sha = existing.data.sha;
    if (existing.data.content && existing.data.encoding === 'base64') {
      existingContent = Buffer.from(existing.data.content, 'base64').toString('utf8');
    }
  } catch (err) {
    if (err.response?.status !== 404) throw err;
    sha = undefined;
  }

  // Nothing changed — skip the write so a publish that regenerates every
  // country page doesn't produce a churn of identical commits.
  if (existingContent !== null && existingContent === content) {
    return { committed: false, unchanged: true };
  }

  await axios.put(url, {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: 'main',
    ...(sha ? { sha } : {}),
  }, { headers: headers(token) });

  return { committed: true, unchanged: false };
}

module.exports = { commitFile, getSettings };
