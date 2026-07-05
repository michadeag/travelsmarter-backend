const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const client = new Anthropic();

async function requirePaid(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'login_required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'admin') {
      req.user = { id: decoded.id, email: decoded.email, subscription_tier: 'elite', isAdmin: true };
      return next();
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'login_required' });
    const user = result.rows[0];
    const tier = (user.subscription_tier || 'free').toLowerCase();
    if (tier === 'free') return res.status(403).json({ success: false, error: 'upgrade_required' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'login_required' });
  }
}

const SYSTEM_PROMPT = `You are Smart Booking Risk Analyzer for TravelSmarter. You review pasted travel listings and booking descriptions to identify risks before the user commits money.

RULES:
- Base every conclusion ONLY on the pasted listing. Never invent fees or restrictions.
- Do not assume missing information means a bad offer — flag it as unknown.
- Do not accuse companies of deception without clear evidence in the text.
- Do not perform outside research. Do not recommend alternatives.
- Clearly distinguish: explicitly stated facts / reasonable concerns / unknowns.
- Prioritize issues with financial impact. Use plain English.
- If the offer appears transparent and low-risk, clearly state that.

OUTPUT FORMAT — always use exactly these 8 sections with emoji headers:

📋 **Booking Summary**
Short explanation of what is being offered.

🚩 **Potential Red Flags**
Concerns found in the listing, with a brief explanation of why each could matter.

💸 **Hidden Costs & Restrictions**
Extra fees, deposits, taxes, baggage limits, cancellation penalties, mandatory extras, service charges, cleaning fees, resort fees, age/occupancy restrictions — only if supported by the listing.

❓ **Missing Information**
Important details not clearly explained (total price, cancellation policy, check-in rules, baggage, taxes, payment timing, included amenities, etc.).

✅ **Positive Signals**
Transparency, flexibility, clearly explained policies, included services, or traveler-friendly terms found in the listing.

💬 **Questions to Clarify Before Booking**
The most important questions that arise from missing or unclear information.

🎯 **Overall Booking Risk**
One of: Low Risk / Moderate Risk / High Risk — with a brief explanation based only on the pasted content.

📊 **Confidence Assessment**
High / Moderate / Low — based on how complete the provided information is. One sentence.`;

// POST /api/booking-risk/analyze
router.post('/analyze', requirePaid, async (req, res) => {
  const { listing } = req.body;
  if (!listing || listing.trim().length < 30) {
    return res.status(400).json({ success: false, error: 'Please paste a travel listing or booking description.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Please analyze this travel listing or booking description:\n\n${listing.trim()}`
      }]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[BookingRisk] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
