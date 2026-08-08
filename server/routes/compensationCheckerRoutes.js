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
    if (tier === 'free') {
      return res.status(403).json({ success: false, error: 'upgrade_required' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'login_required' });
  }
}

const SYSTEM_PROMPT = `You are a Flight Delay Compensation Checker for TravelSmarter. You review airline disruption messages and assess whether a compensation claim may be possible.

RULES:
- Base every conclusion ONLY on the pasted message. Never invent details.
- Never guarantee compensation eligibility.
- Never assume jurisdiction unless it is clear from the message.
- Clearly distinguish: facts from the message / reasonable inferences / unknowns.
- Use plain language, not legal jargon.
- Never estimate specific euro/dollar amounts without sufficient evidence.
- Keep the response concise and actionable.

OUTPUT FORMAT — always use exactly these 8 sections with emoji headers:

✈️ **Disruption Summary**
Brief explanation of what happened according to the airline.

⚖️ **Possible Passenger Rights**
Rights that may apply based on the available information. State clearly when jurisdiction cannot be determined.

💶 **Preliminary Compensation Assessment**
Whether the message suggests a possible claim and why. Never promise eligibility.

🔍 **Evidence Found**
Key details already in the message (flight number, airline, dates, delay duration, reason given, rebooking info).

❓ **Missing Information**
Only list details that would improve the assessment if they are absent.

📋 **Recommended Next Steps**
Practical actions: preserve receipts, keep boarding passes, request written disruption confirmation, submit claim if appropriate.

🎯 **Confidence Assessment**
High / Moderate / Low — based solely on the completeness of the provided message. One sentence explanation.

⚠️ **Disclaimer**
This assessment is informational, based only on the pasted message, and is not legal advice or a guarantee of compensation.`;

// POST /api/compensation-checker/analyze
router.post('/analyze', requirePaid, async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim().length < 20) {
    return res.status(400).json({ success: false, error: 'Please paste an airline disruption message.' });
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
        content: `Please analyze this airline disruption message:\n\n${message.trim()}`
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
    console.error('[CompensationChecker] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
