const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

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

// Generates the structured content for one long-tail Q&A page. Returns
// {answer, context, tip, faqs, metaDescription} — kept as structured JSON
// (not raw HTML) so longtailPageRenderer.js controls all markup/escaping,
// and so a page can be re-rendered later without a second LLM call.
async function generateLongtailContent(template, country) {
  const question = template.question(country);
  const topicPrompt = template.prompt(country);

  const prompt = `You are writing one page for a travel website answering a specific, narrow question for someone about to visit a country. Be accurate, concise, and honest — if the honest answer is "this follows the same general pattern as most places, nothing unusual here," say exactly that rather than inventing a distinctive quirk that doesn't really exist. Never state something as a firm universal rule if it genuinely varies by region/generation/setting within the country — a brief acknowledgment of that is fine.

Topic to cover: ${topicPrompt}

Respond with ONLY valid JSON (no markdown fences, no commentary before or after), in exactly this shape:
{
  "answer": "1-2 sentence direct, specific answer to the question, safe to use as a page subtitle/badge",
  "context": "2-4 sentences of useful explanation/reasoning/nuance beyond the direct answer",
  "tip": "1 short, concrete, practical tip a visitor could actually use",
  "metaDescription": "under 155 characters, includes the country name, written for a search results snippet",
  "faqs": [
    {"q": "a natural follow-up question a real visitor might ask", "a": "2-3 sentence answer"},
    {"q": "a second distinct follow-up question", "a": "2-3 sentence answer"},
    {"q": "a third distinct follow-up question", "a": "2-3 sentence answer"}
  ]
}`;

  const anthropic = await getAnthropicClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', // matches every other content-generation service in this codebase — see commit message for why
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  // Find the first text block rather than assuming content[0] is text —
  // some responses can lead with a non-text block (e.g. thinking), which
  // silently broke this exact naive content[0].text access on first
  // live run.
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

  if (!parsed.answer || !parsed.context || !Array.isArray(parsed.faqs) || parsed.faqs.length === 0) {
    throw new Error('Generated content missing required fields');
  }

  return {
    question,
    answer: parsed.answer,
    context: parsed.context,
    tip: parsed.tip || '',
    metaDescription: (parsed.metaDescription || parsed.answer).slice(0, 160),
    faqs: parsed.faqs.slice(0, 4),
  };
}

module.exports = { generateLongtailContent };
