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

const SYSTEM_PROMPT = `You are Travel Fine Print Decoder for TravelSmarter. You analyze pasted travel policies and terms and translate them into clear, plain English.

RULES:
- Base every conclusion ONLY on the pasted document. Never invent clauses or protections.
- Preserve original meaning while simplifying language.
- Clearly distinguish: stated facts / conditional rules / ambiguous wording.
- Flag unclear or missing information instead of guessing.
- Prioritize information with the greatest financial or practical impact.
- Keep responses concise, organized, and easy to scan.
- Do not provide legal advice. Do not recommend whether to purchase.

OUTPUT FORMAT — always use exactly these 10 sections with emoji headers:

📋 **Plain English Summary**
A short overview of what the document covers.

⚠️ **Most Important Rules**
The rules most likely to affect the traveler financially or practically.

💸 **Hidden Costs & Fees**
Additional charges, penalties, deposits, or service fees mentioned.

❌ **Cancellation & Refunds**
When refunds are available, restricted, or not allowed.

🔄 **Changes & Flexibility**
Rebooking, modifications, transfers, and policy flexibility.

✅ **Your Responsibilities**
Obligations: identification, check-in times, documentation, payment requirements.

⏰ **Important Deadlines**
Booking, cancellation, check-in, claim, or payment deadlines.

🚨 **Potential Risks**
Clauses that could surprise travelers or reduce their rights.

❓ **Unclear or Missing Information**
Important topics the document does not clearly explain. Omit this section if nothing is unclear.

🟢 **Overall Traveler Friendliness**
One of: Very Flexible / Moderately Flexible / Restrictive / Very Restrictive — with a one-sentence explanation based only on the document.`;

// POST /api/fine-print/decode
router.post('/decode', requirePaid, async (req, res) => {
  const { document: doc } = req.body;
  if (!doc || doc.trim().length < 30) {
    return res.status(400).json({ success: false, error: 'Please paste a travel policy or terms document.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1400,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Please decode this travel policy or terms document:\n\n${doc.trim()}`
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
    console.error('[FinePrint] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
