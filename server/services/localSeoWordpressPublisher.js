/**
 * Generic WordPress REST-API publish mechanics, extracted from
 * wordpressService.js but parametrized by credentials instead of reading
 * singleton instance state. This lets Local SEO publish to its own,
 * separate WordPress site (different niche, different settings keys —
 * local_seo_wordpress_*) without touching wordpressService.js or its
 * TravelSmarter site at all.
 */

const axios = require('axios');
const FormData = require('form-data');

function authHeader({ username, appPassword }) {
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`;
}

function normalizeSiteUrl(siteUrl) {
  return siteUrl.replace(/\/$/, '');
}

async function testConnection({ siteUrl, username, appPassword }) {
  const res = await axios.get(`${normalizeSiteUrl(siteUrl)}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: authHeader({ username, appPassword }) },
  });
  return { id: res.data.id, name: res.data.name, url: siteUrl };
}

// @desc Downloads imageUrl and uploads it as WordPress media, returning the
// media ID to use as a post's featured_media. Not currently called by the
// distribution orchestrator (content generation doesn't produce an image
// yet) but kept as a ready-to-use mechanic for when it does.
async function uploadImage({ siteUrl, username, appPassword }, imageUrl, filenameHint) {
  const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(imgRes.data);
  const filename = `${(filenameHint || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}.jpg`;

  const form = new FormData();
  form.append('file', buffer, { filename, contentType: 'image/jpeg' });

  const res = await axios.post(`${normalizeSiteUrl(siteUrl)}/wp-json/wp/v2/media`, form, {
    headers: { Authorization: authHeader({ username, appPassword }), ...form.getHeaders() },
  });
  return res.data.id;
}

async function publishPost({ siteUrl, username, appPassword }, { title, body, featuredMediaId = null }) {
  const payload = { title, content: body, status: 'publish' };
  if (featuredMediaId) payload.featured_media = featuredMediaId;

  const res = await axios.post(`${normalizeSiteUrl(siteUrl)}/wp-json/wp/v2/posts`, payload, {
    headers: { Authorization: authHeader({ username, appPassword }), 'Content-Type': 'application/json' },
  });

  return { id: String(res.data.id), url: res.data.link };
}

module.exports = { testConnection, uploadImage, publishPost };
