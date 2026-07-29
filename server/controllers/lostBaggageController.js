const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Lost/delayed/damaged checked-bag compensation, reused from the shared
// 13-airline list. Distinct from delayCompensationController.js (flight
// delays/cancellations) and overweightBaggageController.js (excess-weight
// fees) — this is about what you're actually owed if the airline loses,
// damages, or seriously delays your bag. Every airline maps to a
// regulatory regime: 'US_DOT' for US carriers (domestic liability cap set
// by 14 CFR 254.5) or 'MONTREAL' for the Montreal Convention limit that
// applies internationally to every carrier here, including US ones on
// international itineraries. Outcomes are defined once per regime;
// per-airline notes cover the actual claims process, which does vary.
const AIRLINES = {
  delta: { name: 'Delta Air Lines', regime: 'US_DOT', note: "File at the Baggage Service Office before leaving the airport, or online through Delta's baggage claim portal — you can track a delayed bag in real time using your file reference number." },
  united: { name: 'United Airlines', regime: 'US_DOT', note: "United's baggage tracking tool lets you follow a delayed bag in real time. File a formal damage claim within 24 hours if at all possible — waiting longer can weaken your claim." },
  american: { name: 'American Airlines', regime: 'US_DOT', note: "Report a delayed, damaged, or lost bag at the Baggage Service Office before leaving the airport when you can — American's online claim system is the backup if you've already left." },
  southwest: { name: 'Southwest Airlines', regime: 'US_DOT', note: "Southwest has one of the better on-time-baggage records among major US carriers, but claims still go through the Baggage Service Office at your arrival airport, same as everyone else." },
  jetblue: { name: 'JetBlue Airways', regime: 'US_DOT', note: "File at the airport Baggage Service Office when possible, or through JetBlue's online claim form — keep your claim reference number to track status." },
  alaska: { name: 'Alaska Airlines', regime: 'US_DOT', note: "Alaska's baggage claim process runs through the airport counter or its online portal — report damage before you leave the airport whenever you can." },
  hawaiian: { name: 'Hawaiian Airlines', regime: 'US_DOT', note: "Inter-island and long-haul Pacific routes mean a lost bag can take longer to trace here than on mainland-only routes — file immediately and keep your claim reference handy." },
  spirit: { name: 'Spirit Airlines', regime: 'US_DOT', note: "As a budget carrier, Spirit's baggage claims are strictly by the book — file at the airport counter and keep every receipt for reimbursed essentials, since documentation matters more with low-cost carriers." },
  frontier: { name: 'Frontier Airlines', regime: 'US_DOT', note: "File at the airport Baggage Service Office and keep every receipt for anything you buy to replace essentials — budget carriers tend to scrutinize claims more closely." },
  allegiant: { name: 'Allegiant Air', regime: 'US_DOT', note: "Allegiant flies fewer daily rotations on many routes, which can mean a slower turnaround tracing a delayed bag — file immediately rather than waiting to see if it turns up." },
  ryanair: { name: 'Ryanair', regime: 'MONTREAL', note: "Ryanair routes all baggage claims through its online claims portal. The Montreal Convention sets tight deadlines — 7 days to report damage, 21 days for a delayed bag — so file promptly to keep your claim valid." },
  easyjet: { name: 'easyJet', regime: 'MONTREAL', note: "File through easyJet's online baggage claim portal. The Montreal Convention sets tight deadlines — 7 days to report damage, 21 days for a delayed bag — so file promptly to keep your claim valid." },
  wizzair: { name: 'Wizz Air', regime: 'MONTREAL', note: "File through Wizz Air's online baggage claim portal. The Montreal Convention sets tight deadlines — 7 days to report damage, 21 days for a delayed bag — so file promptly to keep your claim valid." },
};

const REGIME_LABELS = { US_DOT: 'US DOT liability rules apply', MONTREAL: 'Montreal Convention liability limits apply' };

const STATUS_LABELS = {
  delayed: 'Bag delayed (arrived late)',
  lost: 'Bag lost (never recovered)',
  damaged: 'Bag or contents damaged',
};

const OUTCOMES = {
  US_DOT: {
    delayed: { amount: 'Reasonable reimbursement for essential items you had to buy (toiletries, a change of clothes)', note: "No fixed dollar amount is set by law for a delayed bag — airlines set their own delayed-bag policies, but you're generally entitled to reasonable reimbursement for essentials. Keep every receipt." },
    lost: { amount: 'Up to $3,800 per passenger (the current US DOT-set liability cap for domestic itineraries)', note: "This is the maximum a US airline can limit its liability to — many pay less, based on your bag and contents' actual documented value. A bag is usually only officially declared \"lost\" after 5-14 days of not turning up, but file your claim as soon as you suspect it, don't wait for that declaration." },
    damaged: { amount: 'Up to $3,800 per passenger (the same liability cap that covers loss)', note: "Airlines will often repair or replace the bag itself rather than pay cash. Report damage before you leave the airport if at all possible — most airlines require this within 24 hours, and some only accept claims filed at the airport counter." },
  },
  MONTREAL: {
    delayed: { amount: 'Reasonable reimbursement for essential items you had to buy (toiletries, a change of clothes)', note: "No fixed amount is set for a delayed bag, but you're generally entitled to reasonable reimbursement for essentials under the Montreal Convention. Keep every receipt, and file your claim within 21 days of the bag being returned to you." },
    lost: { amount: 'Up to about 1,288 SDR (roughly $1,700-$1,800, fluctuating with exchange rates)', note: "This is the Montreal Convention liability limit for international carriage, which applies to every carrier here. It's a cap, not a guarantee — the airline can pay less based on your bag and contents' documented value." },
    damaged: { amount: 'Up to about 1,288 SDR (roughly $1,700-$1,800, fluctuating with exchange rates)', note: "Same Montreal Convention cap applies to damage as to loss. You must report damage within 7 days of receiving the bag to preserve your claim — this deadline is much stricter than for a delayed or lost bag." },
  },
};

function computeResult({ airline, bagStatus }) {
  const airlineData = AIRLINES[airline];
  if (!airlineData) throw new Error('Unknown airline');
  const outcome = OUTCOMES[airlineData.regime][bagStatus];
  if (!outcome) throw new Error('Unknown bag status');

  const statusLabel = STATUS_LABELS[bagStatus];
  const headline = `${airlineData.name}, ${statusLabel.toLowerCase()}: you may be owed ${outcome.amount.toLowerCase()}.`;

  return {
    airline, airlineName: airlineData.name, regime: airlineData.regime, regimeLabel: REGIME_LABELS[airlineData.regime],
    bagStatus, statusLabel, amount: outcome.amount, note: outcome.note, claimProcess: airlineData.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/lost-baggage-checker/calculate
// @access Public
exports.calculateLostBaggage = (req, res) => {
  try {
    const { airline, bagStatus } = req.body;
    if (!airline || !bagStatus) return res.status(400).json({ success: false, error: 'airline and bagStatus are required' });
    const result = computeResult({ airline, bagStatus });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/lost-baggage-checker/pdf
// @access Public
exports.generateLostBaggagePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airline, bagStatus } = req.body;
    if (!email || !airline || !bagStatus) {
      return res.status(400).json({ success: false, error: 'email, airline, and bagStatus are required' });
    }

    const result = computeResult({ airline, bagStatus });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'lost-baggage-checker',
        JSON.stringify({ airline, bagStatus }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Lost & Damaged Baggage Compensation Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="lost-baggage-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.regimeLabel} — potential compensation: ${result.amount}`);

    pdfService.heading(doc, `${result.airlineName}'s claims process`);
    pdfService.paragraph(doc, result.claimProcess);

    pdfService.heading(doc, 'How to actually claim it');
    pdfService.bulletList(doc, [
      'Report the issue at the airport before you leave whenever possible — this is the strongest version of your claim.',
      'Keep your baggage claim tag, boarding pass, and receipts for anything you buy to replace essential items.',
      'File your written claim promptly — Montreal Convention deadlines are strict (7 days for damage, 21 days for a delayed bag), and US carriers can also require prompt notice.',
      "If the airline denies or lowballs your claim, you can escalate: EU/UK travelers to their national aviation authority, US travelers to the DOT.",
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your ${result.airlineName} lost baggage compensation check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your baggage compensation check for ${result.airlineName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond claiming compensation? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send lost-baggage-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLostBaggagePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
exports.STATUS_LABELS = STATUS_LABELS;
exports.computeResult = computeResult;
