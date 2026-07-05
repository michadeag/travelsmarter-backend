const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const client = new Anthropic();

// Flexible auth — accepts both user and admin tokens, or no token (free preview)
async function flexAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'admin') {
      req.user = { id: decoded.id, email: decoded.email, subscription_tier: 'elite', isAdmin: true };
      return next();
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      req.user = null;
    } else {
      req.user = result.rows[0];
    }
    next();
  } catch (_) {
    req.user = null;
    next();
  }
}

function getTier(req) {
  if (!req.user) return 'free';
  if (req.user.isAdmin) return 'elite';
  return (req.user.subscription_tier || 'free').toLowerCase();
}

// POST /api/travel-ai/generate
router.post('/generate', flexAuth, async (req, res) => {
  const { destination, dates, budget, style, interests, requirements } = req.body;

  if (!destination) {
    return res.status(400).json({ success: false, error: 'Destination is required' });
  }

  const tier = getTier(req);
  const isPaid = tier === 'smart_traveler' || tier === 'elite';

  // Build prompt based on tier
  const systemPrompt = `You are TravelSmarter AI, an expert travel advisor specializing in practical, actionable travel hacks.
You help travelers save money, reduce stress, and have better experiences.
Always be specific, practical, and honest. Format your response using clear sections with emoji headers.
${isPaid ? 'Provide a comprehensive, detailed analysis.' : 'Provide a useful but brief overview (3-4 key tips only). Mention that paid members get the full 10-section report.'}`;

  const userDetails = [
    `Destination: ${destination}`,
    dates ? `Travel dates: ${dates}` : null,
    budget ? `Budget: ${budget}` : null,
    style ? `Travel style: ${style}` : null,
    interests ? `Interests: ${interests}` : null,
    requirements ? `Special requirements: ${requirements}` : null,
  ].filter(Boolean).join('\n');

  const userPrompt = isPaid
    ? `Create a full personalized travel hacks report for this trip:\n\n${userDetails}\n\nInclude these sections:\n1. ✈️ Flight & Booking Strategy\n2. 🏨 Accommodation Hacks\n3. 💰 Money & Budget Tips\n4. 🎒 Packing Checklist (destination-specific)\n5. 🛫 Airport & Transit Tips\n6. 🗺️ Destination-Specific Hacks\n7. 🍜 Food & Local Dining Tips\n8. 🚌 Local Transportation\n9. 🧭 Cultural & Safety Tips\n10. 🚨 Emergency Preparedness\n\nBe specific to the destination and their travel style. Include concrete numbers (savings, timeframes) where possible.`
    : `Give me 3-4 of the most important travel hacks for this trip:\n\n${userDetails}\n\nFocus on the highest-impact tips. Keep it concise.`;

  try {
    // Use streaming for better UX
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: isPaid ? 2000 : 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, tier, isPaid })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[TravelAI] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
