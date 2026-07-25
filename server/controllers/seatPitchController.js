const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Seat pitch (legroom) per airline, reused from Tool #2's airline list.
// Figures are typical/approximate standard economy and premium-economy
// pitches in inches — always confirm on the airline's site before booking,
// since pitch varies by aircraft type and route.
const AIRLINES = {
  delta: { name: 'Delta Air Lines', standardPitchIn: 31, premiumName: 'Delta Comfort+', premiumPitchIn: 34, note: 'Comfort+ adds extra recline and priority boarding on top of the legroom — a reasonable upgrade for flights over 4 hours.' },
  united: { name: 'United Airlines', standardPitchIn: 31, premiumName: 'Economy Plus', premiumPitchIn: 34, note: "Economy Plus is one of the more consistently available upgrades across United's fleet, and often bookable at check-in for a relatively low fee." },
  american: { name: 'American Airlines', standardPitchIn: 31, premiumName: 'Main Cabin Extra', premiumPitchIn: 34, note: 'Main Cabin Extra adds a few extra inches and earlier boarding — worth it on longer domestic routes.' },
  southwest: { name: 'Southwest Airlines', standardPitchIn: 32, premiumName: null, premiumPitchIn: null, note: "Southwest doesn't sell extra-legroom seats, but its standard economy pitch is already above the industry average, and open seating means you can grab an exit row if you board early." },
  jetblue: { name: 'JetBlue Airways', standardPitchIn: 32, premiumName: 'Even More Space', premiumPitchIn: 38, note: 'Even More Space is one of the most generous legroom upgrades in the US industry — a strong pick for anyone over 6 feet tall.' },
  alaska: { name: 'Alaska Airlines', standardPitchIn: 31, premiumName: 'Premium Class', premiumPitchIn: 35, note: 'Premium Class adds solid extra legroom plus free drinks — a good value upgrade on longer routes.' },
  hawaiian: { name: 'Hawaiian Airlines', standardPitchIn: 31, premiumName: 'Extra Comfort', premiumPitchIn: 37, note: "Extra Comfort is especially worth it on Hawaiian's longer transpacific routes, given the extended flight times." },
  spirit: { name: 'Spirit Airlines', standardPitchIn: 28, premiumName: 'Big Front Seat', premiumPitchIn: 36, note: 'Standard seats here are among the tightest in the industry, but the Big Front Seat is a genuinely spacious leather recliner — often cheaper than economy on legacy carriers.' },
  frontier: { name: 'Frontier Airlines', standardPitchIn: 28, premiumName: 'Stretch Seating', premiumPitchIn: 36, note: 'Standard seats are tight, but Stretch Seating adds a meaningful amount of room for a relatively low fee.' },
  allegiant: { name: 'Allegiant Air', standardPitchIn: 30, premiumName: 'Exit row / preferred seating', premiumPitchIn: 32, note: "Allegiant doesn't offer a true premium cabin, but exit row and preferred seats add a couple of extra inches for a small fee." },
  ryanair: { name: 'Ryanair', standardPitchIn: 30, premiumName: 'Reserved seating (front/exit rows)', premiumPitchIn: 33, note: "Ryanair's standard pitch is tight — reserved seating in the front or exit rows adds some room, though not a true premium cabin." },
  easyjet: { name: 'easyJet', standardPitchIn: 29, premiumName: 'Up Front / Extra Legroom seating', premiumPitchIn: 34, note: "Up Front and Extra Legroom seats add a worthwhile amount of room on easyJet's otherwise tight standard pitch." },
  wizzair: { name: 'Wizz Air', standardPitchIn: 29, premiumName: 'WIZZ Priority + XL seating', premiumPitchIn: 32, note: 'Standard seats are tight — XL seating adds modest extra room, best paired with WIZZ Priority for boarding too.' },
};

function computeResult({ airline }) {
  const data = AIRLINES[airline];
  if (!data) throw new Error('Unknown airline');

  const headline = data.premiumName
    ? `${data.name}: standard pitch is ${data.standardPitchIn}", ${data.premiumName} offers ${data.premiumPitchIn}".`
    : `${data.name}: standard pitch is ${data.standardPitchIn}" — no separate premium-legroom cabin.`;

  return {
    airline, airlineName: data.name, standardPitchIn: data.standardPitchIn,
    premiumName: data.premiumName, premiumPitchIn: data.premiumPitchIn,
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/seat-pitch-checker/calculate
// @access Public
exports.calculateSeatPitch = (req, res) => {
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
// @route POST /api/tools/seat-pitch-checker/pdf
// @access Public
exports.generateSeatPitchPdf = async (req, res) => {
  try {
    const { email, firstName, airline } = req.body;
    if (!email || !airline) {
      return res.status(400).json({ success: false, error: 'email and airline are required' });
    }

    const result = computeResult({ airline });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['seat-pitch-checker', firstName || null, 'seat-pitch-checker',
        JSON.stringify({ airline }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Seat Pitch & Legroom Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="seat-pitch-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    if (result.premiumName) {
      pdfService.highlightBox(doc, `+${result.premiumPitchIn - result.standardPitchIn}" more legroom with ${result.premiumName}`);
    }

    pdfService.heading(doc, 'Getting the most legroom for your money');
    pdfService.bulletList(doc, [
      'Exit rows and bulkhead seats usually have the most legroom on any flight, often for the same fee as a standard extra-legroom seat — check the seat map, not just the fare class name.',
      'Seat pitch varies by aircraft type even within the same airline — use a seat-map site to confirm before you pay for an upgrade.',
      result.premiumName
        ? `${result.premiumName} is usually most worth it on flights over 3-4 hours — for a short hop, the standard seat is often fine.`
        : 'Without a paid premium option here, booking early to snag an exit row is your best bet for extra room.',
      'If you\'re tall or need extra room for medical reasons, call the airline directly — some hold back exit row seats for phone booking or day-of requests.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💺 Your ${result.airlineName} seat pitch guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your legroom check for ${result.airlineName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the seat map? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send seat-pitch-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSeatPitchPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
