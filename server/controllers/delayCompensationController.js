const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Flight delay/cancellation compensation rules per airline, reused from
// Tool #2's airline list. Every airline is mapped to a regulatory regime
// ('EU261' for EU-based carriers, 'US_DOT' for US carriers), and outcomes
// per situation are defined once per regime rather than per airline.
const AIRLINES = {
  delta: { name: 'Delta Air Lines', regime: 'US_DOT' },
  united: { name: 'United Airlines', regime: 'US_DOT' },
  american: { name: 'American Airlines', regime: 'US_DOT' },
  southwest: { name: 'Southwest Airlines', regime: 'US_DOT' },
  jetblue: { name: 'JetBlue Airways', regime: 'US_DOT' },
  alaska: { name: 'Alaska Airlines', regime: 'US_DOT' },
  hawaiian: { name: 'Hawaiian Airlines', regime: 'US_DOT' },
  spirit: { name: 'Spirit Airlines', regime: 'US_DOT' },
  frontier: { name: 'Frontier Airlines', regime: 'US_DOT' },
  allegiant: { name: 'Allegiant Air', regime: 'US_DOT' },
  ryanair: { name: 'Ryanair', regime: 'EU261' },
  easyjet: { name: 'easyJet', regime: 'EU261' },
  wizzair: { name: 'Wizz Air', regime: 'EU261' },
};

const REGIME_LABELS = { EU261: 'EU261 applies', US_DOT: 'US DOT rules apply' };

const SITUATION_LABELS = {
  delay_2_3: 'Delayed 2–3 hours',
  delay_3plus: 'Delayed 3+ hours',
  cancelled_short_notice: "Cancelled with less than 14 days' notice",
  denied_boarding: 'Denied boarding (bumped from an oversold flight)',
};

const OUTCOMES = {
  EU261: {
    delay_2_3: { compensation: false, amount: null, note: "EU261 cash compensation only kicks in once your arrival delay reaches 3 hours or more — under that, the airline must still offer free meals, drinks, and two phone calls or emails after roughly a 2-hour wait, but no cash payment yet." },
    delay_3plus: { compensation: true, amount: '€250–€600 depending on flight distance (€250 under 1,500km, €400 for 1,500-3,500km, €600 over 3,500km)', note: "This applies unless the airline can prove 'extraordinary circumstances' — severe weather, air traffic control strikes, or security risks are common exemptions; a technical fault or crew scheduling issue usually isn't." },
    cancelled_short_notice: { compensation: true, amount: '€250–€600 depending on flight distance (€250 under 1,500km, €400 for 1,500-3,500km, €600 over 3,500km)', note: "You're also entitled to a free choice between a full refund or rerouting to your destination, on top of any compensation owed." },
    denied_boarding: { compensation: true, amount: '€250–€600 depending on flight distance (€250 under 1,500km, €400 for 1,500-3,500km, €600 over 3,500km)', note: 'Involuntary denied boarding entitles you to the same fixed compensation as a long delay, plus your choice of a refund or rerouting — and the airline must ask for volunteers first.' },
  },
  US_DOT: {
    delay_2_3: { compensation: false, amount: null, note: "US rules don't require any cash payment for a delay this short — but most major US carriers have voluntarily committed to free rebooking, and meal vouchers if the cause was within the airline's control." },
    delay_3plus: { compensation: false, amount: null, note: "Even at 3+ hours, US rules don't mandate cash compensation for delays — though if the cause was within the airline's control (a maintenance issue, not weather), most major carriers commit to free rebooking, meals, and hotel or ground transport under DOT customer service plans." },
    cancelled_short_notice: { compensation: false, amount: null, note: "If your flight is cancelled, you're legally entitled to a full, automatic cash refund for the unused portion of your ticket if you choose not to travel, plus free rebooking — but there's no extra compensation payment like in the EU." },
    denied_boarding: { compensation: true, amount: 'up to 400% of your one-way fare (capped, doubled if you\'re rebooked very late)', note: "This is the one case where US rules do require cash compensation — if you're involuntarily bumped from an oversold flight, not for ordinary delays or cancellations." },
  },
};

function computeResult({ airline, situation }) {
  const airlineData = AIRLINES[airline];
  if (!airlineData) throw new Error('Unknown airline');
  const outcome = OUTCOMES[airlineData.regime][situation];
  if (!outcome) throw new Error('Unknown situation');

  const situationLabel = SITUATION_LABELS[situation];
  const headline = `${airlineData.name}, ${situationLabel.toLowerCase()}: ${outcome.compensation ? `you may be owed ${outcome.amount}` : 'no fixed cash compensation applies'}.`;

  return {
    airline, airlineName: airlineData.name, regime: airlineData.regime, regimeLabel: REGIME_LABELS[airlineData.regime],
    situation, situationLabel, compensation: outcome.compensation, amount: outcome.amount, note: outcome.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/delay-compensation-checker/calculate
// @access Public
exports.calculateDelayCompensation = (req, res) => {
  try {
    const { airline, situation } = req.body;
    if (!airline || !situation) return res.status(400).json({ success: false, error: 'airline and situation are required' });
    const result = computeResult({ airline, situation });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/delay-compensation-checker/pdf
// @access Public
exports.generateDelayCompensationPdf = async (req, res) => {
  try {
    const { email, firstName, airline, situation } = req.body;
    if (!email || !airline || !situation) {
      return res.status(400).json({ success: false, error: 'email, airline, and situation are required' });
    }

    const result = computeResult({ airline, situation });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [email, firstName || null, 'delay-compensation-checker',
        JSON.stringify({ airline, situation }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Delay & Cancellation Compensation Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="delay-compensation-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `${result.regimeLabel}${result.compensation ? ` — potential compensation: ${result.amount}` : ''}`);

    pdfService.heading(doc, 'How to actually claim it');
    pdfService.bulletList(doc, [
      'Keep your boarding pass, booking confirmation, and any written notice of the delay or cancellation — you\'ll need these as proof.',
      'File your claim directly with the airline first, in writing, referencing the specific regulation (EU261 or DOT rules) that applies.',
      'If the airline denies or ignores your claim, EU travelers can escalate to their National Enforcement Body; US travelers can file a complaint with the DOT.',
      'Third-party claim services can handle the process for a cut of the payout — useful if the airline is stonewalling, but you can always file for free yourself.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `✈️ Your ${result.airlineName} compensation check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your compensation check for ${result.airlineName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond claiming compensation? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send delay-compensation-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDelayCompensationPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
exports.SITUATION_LABELS = SITUATION_LABELS;
