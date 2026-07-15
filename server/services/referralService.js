const pool = require('../config/database');

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24);
}

async function generateUniqueReferralCode(name) {
  const base = slugify(name) || 'partner';
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${base}-${suffix}`;
    const existing = await pool.query(
      'SELECT 1 FROM referral_partners WHERE referral_code = $1',
      [code]
    );
    if (existing.rows.length === 0) return code;
  }
  throw new Error('Could not generate a unique referral code');
}

// @desc Attribute a one-time commission (100% of the first month's actual
// charge, per business decision) to the approved partner who referred this
// newly converted paying user. Only called from checkout.session.completed —
// not on renewal invoices — since the commission is one-time, not recurring.
async function recordConversion({ userId, userEmail, referralCode, tier, chargeAmount, paymentIntentId }) {
  if (!referralCode) return null;

  const partnerResult = await pool.query(
    `SELECT id, email FROM referral_partners WHERE referral_code = $1 AND status = 'approved'`,
    [referralCode]
  );
  if (partnerResult.rows.length === 0) return null;

  const partner = partnerResult.rows[0];
  if (partner.email.toLowerCase() === (userEmail || '').toLowerCase()) {
    console.warn(`Referral self-attribution blocked for partner ${partner.id}`);
    return null;
  }

  // ON CONFLICT guards against double-counting if the webhook ever retries —
  // (partner_id, user_id) is unique, so a referred user only ever pays out once.
  const result = await pool.query(
    `INSERT INTO referral_conversions
       (partner_id, user_id, tier, commission_amount, stripe_payment_intent_id, eligible_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '14 days')
     ON CONFLICT (partner_id, user_id) DO NOTHING
     RETURNING id`,
    [partner.id, userId, tier, chargeAmount, paymentIntentId || null]
  );

  return result.rows[0] || null;
}

// @desc Flip conversions whose 14-day refund/chargeback hold has passed from
// 'pending' to 'eligible', so the admin dashboard can list what's payable.
async function processEligibility() {
  const result = await pool.query(
    `UPDATE referral_conversions
     SET status = 'eligible'
     WHERE status = 'pending' AND eligible_at <= NOW()
     RETURNING id`
  );
  return result.rows.length;
}

module.exports = { generateUniqueReferralCode, recordConversion, processEligibility };
