const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Estimated travel insurance cost as a percentage of prepaid, non-refundable
// trip cost — based on typical industry rules of thumb (rate rises with
// traveler age and trip length; comprehensive and "cancel for any reason"
// (CFAR) plans cost proportionally more than a basic policy). This is an
// estimate for planning purposes, not a quote — always compare real quotes
// before buying.
const AGE_BASE_RATES = {
  'under-35': 5.0,
  '35-59': 6.5,
  '60-69': 9.0,
  '70-plus': 12.5,
};

const DESTINATION_LABELS = {
  domestic: 'Domestic trip',
  international: 'International trip',
  adventure: 'International trip with adventure activities',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeResult({ tripCostUSD, ageBand, tripLengthDays, destinationType }) {
  const cost = Number(tripCostUSD);
  const days = Number(tripLengthDays);
  if (!cost || cost <= 0) throw new Error('tripCostUSD must be a positive number');
  if (!days || days <= 0) throw new Error('tripLengthDays must be a positive number');
  if (!AGE_BASE_RATES[ageBand]) throw new Error('Unknown ageBand');
  if (!DESTINATION_LABELS[destinationType]) throw new Error('Unknown destinationType');

  let basicRatePercent = AGE_BASE_RATES[ageBand];
  if (days > 21) basicRatePercent += 1.0;
  if (destinationType === 'adventure') basicRatePercent += 1.5;
  if (destinationType === 'domestic') basicRatePercent -= 1.0;
  basicRatePercent = clamp(basicRatePercent, 3.0, 18.0);

  const comprehensiveRatePercent = clamp(basicRatePercent * 1.3, 3.0, 22.0);
  const cfarRatePercent = clamp(basicRatePercent * 1.5, 3.0, 26.0);

  const basicCostUSD = Math.round(cost * (basicRatePercent / 100));
  const comprehensiveCostUSD = Math.round(cost * (comprehensiveRatePercent / 100));
  const cfarCostUSD = Math.round(cost * (cfarRatePercent / 100));

  const recommendations = [];
  if (ageBand === '60-69' || ageBand === '70-plus') {
    recommendations.push('Prioritize comprehensive coverage with strong emergency medical and evacuation limits — this is where age-related claims are most common and most expensive.');
  }
  if (destinationType === 'adventure') {
    recommendations.push('Confirm your policy explicitly names your planned activities — many standard policies exclude adventure sports like skiing, scuba diving, or trekking above a certain altitude unless you add a rider.');
  }
  if (cost >= 5000) {
    recommendations.push('With a trip this expensive, cancel-for-any-reason (CFAR) coverage is worth pricing out — it must typically be purchased within 14-21 days of your first trip deposit, so decide early.');
  }
  if (destinationType === 'domestic' && cost < 1500 && (ageBand === 'under-35' || ageBand === '35-59')) {
    recommendations.push('For a shorter, lower-cost domestic trip, a basic policy focused on trip cancellation may be all you need — your existing health insurance likely covers emergency medical care.');
  }
  if (recommendations.length === 0) {
    recommendations.push('A standard comprehensive policy covering trip cancellation, emergency medical, and baggage delay is a reasonable default for most trips like this.');
  }

  const headline = `Estimated travel insurance: $${basicCostUSD}-$${comprehensiveCostUSD} for your $${cost.toLocaleString('en-US')} trip (${basicRatePercent.toFixed(1)}%-${comprehensiveRatePercent.toFixed(1)}% of trip cost).`;

  return {
    tripCostUSD: cost, ageBand, tripLengthDays: days, destinationType, destinationLabel: DESTINATION_LABELS[destinationType],
    basicRatePercent: Number(basicRatePercent.toFixed(1)), comprehensiveRatePercent: Number(comprehensiveRatePercent.toFixed(1)), cfarRatePercent: Number(cfarRatePercent.toFixed(1)),
    basicCostUSD, comprehensiveCostUSD, cfarCostUSD,
    recommendation: recommendations.join(' '), headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/insurance-cost-estimator/calculate
// @access Public
exports.calculateInsurance = (req, res) => {
  try {
    const { tripCostUSD, ageBand, tripLengthDays, destinationType } = req.body;
    const result = computeResult({ tripCostUSD, ageBand, tripLengthDays, destinationType });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/insurance-cost-estimator/pdf
// @access Public
exports.generateInsurancePdf = async (req, res) => {
  try {
    const { email, firstName, tripCostUSD, ageBand, tripLengthDays, destinationType } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const result = computeResult({ tripCostUSD, ageBand, tripLengthDays, destinationType });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['insurance-cost-estimator', firstName || null, 'insurance-cost-estimator',
        JSON.stringify({ tripCostUSD, ageBand, tripLengthDays, destinationType }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc('Your Travel Insurance Cost Estimate');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="insurance-cost-estimator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.recommendation);

    pdfService.highlightBox(doc, `Basic: $${result.basicCostUSD} · Comprehensive: $${result.comprehensiveCostUSD} · CFAR: $${result.cfarCostUSD}`);

    pdfService.heading(doc, 'Before you buy');
    pdfService.bulletList(doc, [
      'This is an estimate for planning purposes — get real quotes from a comparison site before you buy, since actual pricing varies by provider and specific coverage limits.',
      'Buy within a few days of your first trip deposit if you want pre-existing condition coverage or cancel-for-any-reason (CFAR) — most insurers require this for those benefits.',
      'Check whether your credit card already includes some trip protection — it\'s often more limited than a standalone policy, but can reduce what you need to buy separately.',
      'Read the emergency medical evacuation limit carefully — this is the single most expensive real-world claim category, and default limits are sometimes lower than you\'d expect.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your travel insurance cost estimate`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your travel insurance estimate:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond insurance? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send insurance-cost-estimator confirmation email:', err.message));

  } catch (error) {
    console.error('generateInsurancePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AGE_BASE_RATES = AGE_BASE_RATES;
exports.DESTINATION_LABELS = DESTINATION_LABELS;
