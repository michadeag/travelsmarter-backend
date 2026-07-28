const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Overweight/oversized checked-bag penalty fees per airline, reused from
// the shared 13-airline list (baggageFeeController.js / seatPitchController.js
// / delayCompensationController.js). Distinct from baggageFeeController.js,
// which covers the standard first/second-bag fee — this is specifically
// about the penalty for exceeding the weight or linear-size allowance,
// which is a separate, often much larger fee that catches travelers by
// surprise at check-in. weightLimitLb is the standard included weight
// limit before the first overweight tier kicks in. Fees are typical,
// approximate, and change often — always verify on the airline's site
// before you fly.
const AIRLINES = {
  delta: { name: 'Delta Air Lines', weightLimitLb: 50, overweightFee: '51-70 lb: $100 (domestic) to $200 (international) extra, per bag.', severeOverweightFee: '71-100 lb: $200-400 extra — most routes cap checked bags at 100 lb entirely.', oversizeFee: 'Over 62 linear inches (length + width + height): $150-200 extra, per bag.', note: 'Weighing your bag at home with a luggage scale before you leave is the single easiest way to avoid this fee entirely.' },
  united: { name: 'United Airlines', weightLimitLb: 50, overweightFee: '51-70 lb: $100-200 extra, per bag.', severeOverweightFee: '71-100 lb: $200-400 extra — most routes cap checked bags at 100 lb entirely.', oversizeFee: 'Over 62 linear inches: around $200 extra, per bag.', note: 'Weighing your bag at home with a luggage scale before you leave is the single easiest way to avoid this fee entirely.' },
  american: { name: 'American Airlines', weightLimitLb: 50, overweightFee: '51-70 lb: $100-200 extra, per bag.', severeOverweightFee: '71-100 lb: $200-400 extra — most routes cap checked bags at 100 lb entirely.', oversizeFee: 'Over 62 linear inches: around $200 extra, per bag.', note: 'Weighing your bag at home with a luggage scale before you leave is the single easiest way to avoid this fee entirely.' },
  southwest: { name: 'Southwest Airlines', weightLimitLb: 50, overweightFee: '51-70 lb: $75-105 extra, per bag — applies even though your first two bags are free.', severeOverweightFee: '71-100 lb: $150-200 extra — checked bags are capped at 100 lb entirely.', oversizeFee: 'Over 62 linear inches: $75-100 extra, per bag.', note: "Southwest's free-bag policy doesn't cover overweight or oversized fees — those still apply on top." },
  jetblue: { name: 'JetBlue Airways', weightLimitLb: 50, overweightFee: '51-70 lb: around $150 extra, per bag.', severeOverweightFee: '71-100 lb: around $200 extra — checked bags are capped at 100 lb entirely.', oversizeFee: 'Over 62 linear inches: around $150 extra, per bag.', note: 'Weighing your bag at home with a luggage scale before you leave is the single easiest way to avoid this fee entirely.' },
  alaska: { name: 'Alaska Airlines', weightLimitLb: 50, overweightFee: '51-70 lb: around $100 extra, per bag.', severeOverweightFee: '71-100 lb: around $200 extra — checked bags are capped at 100 lb entirely.', oversizeFee: 'Over 62 linear inches: around $100 extra, per bag.', note: 'Weighing your bag at home with a luggage scale before you leave is the single easiest way to avoid this fee entirely.' },
  hawaiian: { name: 'Hawaiian Airlines', weightLimitLb: 50, overweightFee: '51-70 lb: $100-150 extra, per bag.', severeOverweightFee: '71-100 lb: around $200 extra — checked bags are capped at 100 lb entirely.', oversizeFee: 'Over 62 linear inches: around $150 extra, per bag.', note: 'Weighing your bag at home with a luggage scale before you leave is the single easiest way to avoid this fee entirely.' },
  spirit: { name: 'Spirit Airlines', weightLimitLb: 40, overweightFee: '41-50 lb: $50-90 extra, per bag.', severeOverweightFee: 'Over 50 lb: often refused outright at check-in, or a steep gate fee if accepted — don\'t count on it.', oversizeFee: 'Over 62 linear inches: an additional oversize fee applies, and it\'s notably steeper if paid at the gate rather than online.', note: 'Spirit\'s standard weight limit is lower than legacy carriers (40 lb, not 50) — a bag that\'s fine on Delta can already be overweight here.' },
  frontier: { name: 'Frontier Airlines', weightLimitLb: 40, overweightFee: '41-50 lb: $50-90 extra, per bag.', severeOverweightFee: 'Over 50 lb: often refused outright at check-in, or a steep gate fee if accepted.', oversizeFee: 'Over 62 linear inches: an additional oversize fee applies.', note: "Frontier's standard weight limit is lower than legacy carriers (40 lb, not 50) — a bag that's fine on Delta can already be overweight here." },
  allegiant: { name: 'Allegiant Air', weightLimitLb: 40, overweightFee: '41-70 lb: $50-75 extra, per bag.', severeOverweightFee: 'Over 70 lb: not accepted at all — repacking into a second bag is your only option at the airport.', oversizeFee: 'Over 62 linear inches: an additional oversize fee applies.', note: "Allegiant's standard weight limit is lower than legacy carriers (40 lb, not 50) — a bag that's fine on Delta can already be overweight here." },
  ryanair: { name: 'Ryanair', weightLimitLb: 44, overweightFee: 'Over the 20kg (44lb) allowance: charged per kilo, often €10-12/kg if paid at the gate — one of the steepest overage rates of any major carrier.', severeOverweightFee: 'Over 32kg (70lb): not accepted at all by most ground handlers, for baggage-handling safety reasons.', oversizeFee: 'Oversized or odd-shaped items (sports equipment, musical instruments) need a separate special-item booking, not just an oversize fee.', note: 'Pre-booking extra weight online is dramatically cheaper than paying the per-kilo gate rate — do it before you travel, not at check-in.' },
  easyjet: { name: 'easyJet', weightLimitLb: 51, overweightFee: 'Over the 23kg (51lb) allowance: charged per kilo — noticeably cheaper if pre-booked online than paid at the gate.', severeOverweightFee: 'Over 32kg (70lb): not accepted at all, for baggage-handling safety reasons.', oversizeFee: 'Oversized bags need a separate large-bag booking — cheaper pre-booked than added at the airport.', note: 'Pre-booking extra weight online is dramatically cheaper than paying the per-kilo gate rate — do it before you travel, not at check-in.' },
  wizzair: { name: 'Wizz Air', weightLimitLb: 44, overweightFee: 'Over the 20-23kg allowance (depending on fare): charged per kilo, steep if paid at the gate.', severeOverweightFee: 'Over 32kg (70lb): not accepted at all, for baggage-handling safety reasons.', oversizeFee: 'Oversized bags need a separate large-bag booking, cheaper pre-booked than added at the airport.', note: 'Pre-booking extra weight online is dramatically cheaper than paying the per-kilo gate rate — do it before you travel, not at check-in.' },
};

function computeResult({ airline }) {
  const data = AIRLINES[airline];
  if (!data) throw new Error('Unknown airline');

  const headline = `${data.name}: standard limit is ${data.weightLimitLb} lb per bag — overweight or oversized bags cost extra on top of the regular baggage fee.`;

  return {
    airline, airlineName: data.name, weightLimitLb: data.weightLimitLb,
    overweightFee: data.overweightFee, severeOverweightFee: data.severeOverweightFee,
    oversizeFee: data.oversizeFee, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/overweight-baggage-checker/calculate
// @access Public
exports.calculateOverweightBaggage = (req, res) => {
  try {
    const { airline } = req.body;
    if (!airline) return res.status(400).json({ success: false, error: 'airline is required' });
    const result = computeResult({ airline });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/overweight-baggage-checker/pdf
// @access Public
exports.generateOverweightBaggagePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airline } = req.body;
    if (!email || !airline) {
      return res.status(400).json({ success: false, error: 'email and airline are required' });
    }

    const result = computeResult({ airline });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'overweight-baggage-checker',
        JSON.stringify({ airline }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Overweight & Oversized Baggage Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="overweight-baggage-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.highlightBox(doc, `Standard limit: ${result.weightLimitLb} lb per bag`);

    pdfService.heading(doc, 'Overweight fees');
    pdfService.paragraph(doc, result.overweightFee);
    pdfService.paragraph(doc, result.severeOverweightFee);

    pdfService.heading(doc, 'Oversized fees');
    pdfService.paragraph(doc, result.oversizeFee);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.note,
      'A cheap luggage scale (often under $15) pays for itself the first time it saves you an overweight fee.',
      'Fees quoted here are typical estimates — always check the airline\'s current baggage page before you fly, since these change often.',
      'If you\'re close to the limit, moving a few heavy items into your carry-on or personal item is usually free, unlike the overweight fee.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your ${result.airlineName} overweight baggage guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the overweight/oversized baggage check for ${result.airlineName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond packing? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send overweight-baggage-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateOverweightBaggagePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
exports.computeResult = computeResult;
