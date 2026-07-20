/**
 * Generic Blogger API publish mechanics, extracted from bloggerService.js
 * but parametrized by credentials/blogId instead of singleton instance
 * state. Lets Local SEO publish to its own Blogger blog (potentially a
 * different Google account than TravelSmarter's) without touching
 * bloggerService.js or its blog at all.
 *
 * Reuses the same Google OAuth2 client (google_client_id/google_client_secret)
 * already registered for bloggerService.js — only the redirect URI used
 * here is new (see routes/localSeoRoutes.js's /blogger/callback), which
 * needs to be added to that OAuth client's Authorized redirect URIs in
 * Google Cloud Console once (a client can have multiple redirect URIs).
 */

const axios = require('axios');

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return response.data.access_token;
}

function getAuthUrl({ clientId, redirectUri }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/blogger',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForToken({ clientId, clientSecret, redirectUri, code }) {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const { refresh_token, access_token } = response.data;
  if (!refresh_token) throw new Error('No refresh_token returned — ensure access_type=offline and prompt=consent.');
  return { refresh_token, access_token };
}

async function fetchBlogs(accessToken) {
  const response = await axios.get('https://www.googleapis.com/blogger/v3/users/self/blogs', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const blogs = response.data.items || [];
  if (blogs.length === 0) throw new Error('No Blogger blogs found for this Google account.');
  return blogs.map((b) => ({ id: b.id, name: b.name, url: b.url }));
}

async function publishPost({ blogId, accessToken }, { title, body, labels = [] }) {
  const response = await axios.post(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`,
    { title, content: body, labels },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return { id: response.data.id, url: response.data.url };
}

module.exports = { getAccessToken, getAuthUrl, exchangeCodeForToken, fetchBlogs, publishPost };
