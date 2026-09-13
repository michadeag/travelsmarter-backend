const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

// Generates copy-paste-ready Etsy digital-download listing copy (title,
// description, tags) for a Trip Brief PDF — used by the admin "Etsy Batch
// Export" section so each of the 33 destination PDFs can be listed with
// genuinely SEO-optimized, non-templated text instead of the same copy
// reworded 33 times (which would itself look spammy to Etsy's own search).

let anthropicClient = null;
async function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return anthropicClient;
  }
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'anthropic_api_key'`).catch(() => ({ rows: [] }));
  const key = r.rows[0]?.value;
  if (!key) throw new Error('Anthropic API key not configured');
  anthropicClient = new Anthropic({ apiKey: key });
  return anthropicClient;
}

async function generateEtsyListingCopy(destinationName, toolCount) {
  const prompt = `You are writing an Etsy digital-download listing for a travel checklist PDF.

Product: "${destinationName} Trip Brief" — a ${toolCount}-point digital travel checklist covering practical, real questions travelers actually have about ${destinationName} (money/tipping, safety, local customs & etiquette, transport, entry basics, connectivity, and more), delivered as an instant-download PDF. It is NOT a photo guide or itinerary — it's a practical fact-checklist.

Write genuinely Etsy-SEO-optimized listing copy: front-load the most-searched keywords, sound like a real independent shop wrote it, not corporate marketing. Avoid generic filler ("amazing", "must-have") and avoid overclaiming.

Respond with ONLY valid JSON (no markdown fences, no commentary before or after), in exactly this shape:
{
  "title": "Etsy title, MAX 140 characters. Keyword-front-loaded, pipe-separated phrases are fine, e.g. '${destinationName} Travel Checklist PDF | Digital Trip Planner | Printable Travel Guide | Instant Download'. Must literally fit in 140 characters.",
  "description": "Full Etsy description as plain text (no markdown headers/asterisks). Structure: (1) a 2-3 sentence hook — this is what shows in Etsy search results, make it count; (2) a blank line, then 'WHAT'S INCLUDED:' followed by 5-8 short bullet lines starting with a check-mark character, listing real categories covered; (3) a blank line, then a short 'INSTANT DOWNLOAD' note (PDF, no shipping, available right after purchase); (4) a blank line, then one honest disclaimer sentence that travel rules can change and anything critical (visas, entry rules, health requirements) should be verified against an official source close to the travel date.",
  "tags": ["exactly 13 tags as an array of strings, each 20 characters or fewer, lowercase, real Etsy-searchable phrases — mix broad terms (e.g. 'travel printable') with destination-specific ones (e.g. '${destinationName.toLowerCase()} travel')"]
}`;

  const anthropic = await getAnthropicClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Model response contained no text block');

  const raw = textBlock.text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Model did not return valid JSON: ${err.message}`);
  }

  if (!parsed.title || !parsed.description || !Array.isArray(parsed.tags) || parsed.tags.length === 0) {
    throw new Error('Generated listing copy missing required fields');
  }

  // Enforce Etsy's hard limits server-side rather than trusting the model —
  // a listing that's a character over won't save on Etsy's own form.
  return {
    title: String(parsed.title).slice(0, 140),
    description: String(parsed.description).trim(),
    tags: parsed.tags.slice(0, 13).map(t => String(t).trim().slice(0, 20)),
  };
}

module.exports = { generateEtsyListingCopy };
