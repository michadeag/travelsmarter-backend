const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Checked-bag fee structure per airline, reused from Tool #2's airline
// list. Fees are typical domestic economy fares in USD, approximate and
// subject to frequent change — always verify on the airline's site
// before booking. weightLimitLb applies per bag before an overweight fee.
const AIRLINES = {
  delta: { name: 'Delta Air Lines', firstBagFee: 35, secondBagFee: 45, weightLimitLb: 50, overweightFee: '51-70lb: ~$100-200 extra, depending on route', freeBags: 0 },
  united: { name: 'United Airlines', firstBagFee: 35, secondBagFee: 45, weightLimitLb: 50, overweightFee: '51-70lb: ~$100-200 extra, depending on route', freeBags: 0 },
  american: { name: 'American Airlines', firstBagFee: 35, secondBagFee: 45, weightLimitLb: 50, overweightFee: '51-70lb: ~$100-200 extra, depending on route', freeBags: 0 },
  southwest: { name: 'Southwest Airlines', firstBagFee: 0, secondBagFee: 0, weightLimitLb: 50, overweightFee: '51-70lb: ~$75-100 extra', freeBags: 2 },
  jetblue: { name: 'JetBlue Airways', firstBagFee: 35, secondBagFee: 45, weightLimitLb: 50, overweightFee: '51-70lb: ~$150 extra', freeBags: 0 },
  alaska: { name: 'Alaska Airlines', firstBagFee: 30, secondBagFee: 40, weightLimitLb: 50, overweightFee: '51-70lb: ~$100 extra', freeBags: 0 },
  hawaiian: { name: 'Hawaiian Airlines', firstBagFee: 35, secondBagFee: 45, weightLimitLb: 50, overweightFee: '51-70lb: ~$100-150 extra', freeBags: 0 },
  spirit: { name: 'Spirit Airlines', firstBagFee: 40, secondBagFee: 50, weightLimitLb: 40, overweightFee: '41-50lb: ~$50-90 extra; over 50lb often not accepted', freeBags: 0 },
  frontier: { name: 'Frontier Airlines', firstBagFee: 40, secondBagFee: 50, weightLimitLb: 40, overweightFee: '41-50lb: ~$50-90 extra', freeBags: 0 },
  allegiant: { name: 'Allegiant Air', firstBagFee: 35, secondBagFee: 45, weightLimitLb: 40, overweightFee: '41-70lb: ~$50-75 extra', freeBags: 0 },
  ryanair: { name: 'Ryanair', firstBagFee: 30, secondBagFee: 45, weightLimitLb: 44, overweightFee: 'Over 20-23kg allowance: charged per kg, often steep at the gate', freeBags: 0 },
  easyjet: { name: 'easyJet', firstBagFee: 32, secondBagFee: 45, weightLimitLb: 51, overweightFee: 'Over 23kg allowance: charged per kg, cheaper if pre-booked online', freeBags: 0 },
  wizzair: { name: 'Wizz Air', firstBagFee: 28, secondBagFee: 40, weightLimitLb: 44, overweightFee: 'Over 20-23kg allowance: charged per kg, steep at the gate', freeBags: 0 },
};

function computeResult({ airline, numBags, tripType }) {
  const data = AIRLINES[airline];
  if (!data) throw new Error('Unknown airline');
  const bags = Math.max(1, Math.min(6, Number(numBags) || 1));
  const type = tripType === 'international' ? 'international' : 'domestic';

  const bagFees = [];
  for (let i = 1; i <= bags; i++) {
    let fee;
    if (i <= data.freeBags) {
      fee = 0;
    } else if (i === 1) {
      fee = data.firstBagFee;
    } else if (i === 2) {
      fee = data.secondBagFee;
    } else {
      // 3rd+ bags typically cost more than the 2nd on most airlines.
      fee = Math.round(data.secondBagFee * 1.5);
    }
    bagFees.push(fee);
  }
  const totalFee = bagFees.reduce((a, b) => a + b, 0);

  let headline;
  if (data.freeBags >= bags) {
    headline = `${data.name} includes ${bags} checked bag${bags === 1 ? '' : 's'} free on every fare — no fee.`;
  } else {
    headline = `${bags} checked bag${bags === 1 ? '' : 's'} on ${data.name} costs approximately $${totalFee} total.`;
  }

  return {
    airline, airlineName: data.name, numBags: bags, tripType: type,
    bagFees, totalFee, weightLimitLb: data.weightLimitLb, overweightFee: data.overweightFee,
    freeBags: data.freeBags, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/baggage-fee-calculator/calculate
// @access Public
exports.calculateBaggageFee = (req, res) => {
  try {
    const { airline, numBags, tripType } = req.body;
    if (!airline) return res.status(400).json({ success: false, error: 'airline is required' });
    const result = computeResult({ airline, numBags, tripType });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/baggage-fee-calculator/pdf
// @access Public
exports.generateBaggageFeePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airline, numBags, tripType } = req.body;
    if (!email || !airline) {
      return res.status(400).json({ success: false, error: 'email and airline are required' });
    }

    const result = computeResult({ airline, numBags, tripType });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'baggage-fee-calculator',
        JSON.stringify({ airline, numBags, tripType }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Checked Baggage Fee Report`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="baggage-fee-calculator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `Weight limit: ${result.weightLimitLb}lb per bag. ${result.overweightFee}. These are approximate, typical fees — airlines change baggage pricing frequently, so always confirm on the airline's website before booking.`);

    pdfService.highlightBox(doc, `Total for ${result.numBags} bag${result.numBags === 1 ? '' : 's'}: $${result.totalFee}`);

    pdfService.heading(doc, 'Per-bag breakdown');
    pdfService.bulletList(doc, result.bagFees.map((fee, i) => `Bag ${i + 1}: ${fee === 0 ? 'Free' : '$' + fee}`));

    pdfService.heading(doc, 'Ways to avoid or reduce baggage fees');
    pdfService.bulletList(doc, [
      'Add checked bags during booking rather than at the airport — airport/gate fees are almost always higher.',
      'Check if your fare bundle, elite status, or co-branded credit card includes a free checked bag.',
      'Weigh your bag at home before you leave — overweight fees can cost more than the bag fee itself.',
      'If you\'re close to two bags\' worth of stuff, compare the cost of a second checked bag against shipping items ahead.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your ${result.airlineName} baggage fee report`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your checked baggage fee estimate:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond baggage fees? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send baggage-fee-calculator confirmation email:', err.message));

  } catch (error) {
    console.error('generateBaggageFeePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
