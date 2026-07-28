const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Lounge access via Priority Pass per airport, reused from the shared
// 31-airport list (see airportArrivalTimeController.js / layoverController.js
// for the same roster). priorityPass: 'good' (multiple dedicated lounges
// accept Priority Pass) | 'moderate' (at least one option, sometimes
// restaurant/retail credit rather than a full lounge) | 'limited' (little
// to no Priority Pass coverage — access here is mainly via airline elite
// status or a co-branded credit card's own lounge network, e.g. Amex
// Centurion, Chase Sapphire Lounge, Capital One Lounge). Lounge network
// partnerships change over time, so this is general orientation — always
// verify the current specific lounge before you fly.
const AIRPORTS = {
  atl: { name: 'Atlanta (ATL)', priorityPass: 'limited', note: "Dominated by Delta Sky Clubs, which don't accept Priority Pass — Priority Pass Select gives a restaurant/retail credit instead of full lounge access here." },
  ord: { name: "Chicago O'Hare (ORD)", priorityPass: 'limited', note: "United Clubs dominate and don't accept Priority Pass — Priority Pass Select mainly gives restaurant credit rather than a dedicated lounge." },
  dfw: { name: 'Dallas/Fort Worth (DFW)', priorityPass: 'limited', note: "American's Admirals Clubs dominate and don't accept Priority Pass — Priority Pass Select mainly gives restaurant credit here." },
  den: { name: 'Denver (DEN)', priorityPass: 'moderate', note: 'A Priority Pass-accepting independent lounge is available alongside the United Club, giving more flexibility than most US hubs.' },
  lax: { name: 'Los Angeles (LAX)', priorityPass: 'moderate', note: "Several terminal-specific independent and Star Alliance lounges accept Priority Pass, though coverage varies a lot by which terminal you're departing from." },
  jfk: { name: 'New York JFK (JFK)', priorityPass: 'moderate', note: 'Priority Pass access exists in some terminals (notably around Terminal 4), but coverage is uneven across JFK\'s many separate terminals.' },
  ewr: { name: 'Newark (EWR)', priorityPass: 'limited', note: "United Clubs dominate and don't accept Priority Pass — options are mainly restaurant credit via Priority Pass Select." },
  iah: { name: 'Houston (IAH)', priorityPass: 'limited', note: "United Clubs dominate and don't accept Priority Pass — Priority Pass Select gives restaurant credit rather than a lounge here." },
  phx: { name: 'Phoenix (PHX)', priorityPass: 'limited', note: 'American Airlines Admirals Clubs dominate and limited independent lounge options accept Priority Pass here.' },
  sfo: { name: 'San Francisco (SFO)', priorityPass: 'good', note: 'Multiple independent lounges across terminals accept Priority Pass — one of the better US airports for this.' },
  sea: { name: 'Seattle (SEA)', priorityPass: 'limited', note: "Alaska and Delta lounges dominate and don't accept Priority Pass — Priority Pass Select mainly gives restaurant credit." },
  mia: { name: 'Miami (MIA)', priorityPass: 'good', note: 'A dedicated Priority Pass lounge is available, reflecting the airport\'s role as a major international gateway.' },
  clt: { name: 'Charlotte (CLT)', priorityPass: 'limited', note: "American's Admirals Clubs dominate and don't accept Priority Pass — options are limited to restaurant credit." },
  mco: { name: 'Orlando (MCO)', priorityPass: 'moderate', note: 'At least one Priority Pass-accepting lounge is available, which is notable for a primarily leisure-traffic airport.' },
  las: { name: 'Las Vegas (LAS)', priorityPass: 'moderate', note: 'A Priority Pass-accepting lounge is available in the airport.' },
  msp: { name: 'Minneapolis-St. Paul (MSP)', priorityPass: 'limited', note: "Delta Sky Clubs dominate and don't accept Priority Pass — Priority Pass Select mainly gives restaurant credit." },
  dtw: { name: 'Detroit (DTW)', priorityPass: 'limited', note: "Delta Sky Clubs dominate and don't accept Priority Pass — options are mainly restaurant credit." },
  phl: { name: 'Philadelphia (PHL)', priorityPass: 'limited', note: "American's Admirals Clubs dominate and don't accept Priority Pass — restaurant credit is the main Priority Pass option." },
  bos: { name: 'Boston (BOS)', priorityPass: 'moderate', note: 'Priority Pass access exists in the international terminal, though domestic terminal options are more limited.' },
  fll: { name: 'Fort Lauderdale (FLL)', priorityPass: 'moderate', note: 'A Priority Pass-accepting lounge is available, which is notable for a primarily leisure-traffic airport.' },
  lhr: { name: 'London Heathrow (LHR)', priorityPass: 'good', note: 'Multiple independent lounges accept Priority Pass across terminals — though the very top airline lounges (Concorde Room, Virgin Clubhouse) are status/business-class only, not Priority Pass.' },
  cdg: { name: 'Paris Charles de Gaulle (CDG)', priorityPass: 'good', note: 'Several independent and partner lounges accept Priority Pass across CDG\'s terminals.' },
  ams: { name: 'Amsterdam Schiphol (AMS)', priorityPass: 'good', note: 'A well-known independent lounge accepts Priority Pass in the single main terminal, making access straightforward.' },
  fra: { name: 'Frankfurt (FRA)', priorityPass: 'moderate', note: "Lufthansa's Senator lounges dominate and require elite status or business class — Priority Pass access is more limited to specific partner lounges." },
  dxb: { name: 'Dubai (DXB)', priorityPass: 'good', note: "Several independent lounges accept Priority Pass, though the flagship Emirates lounges are status/business-class only, not Priority Pass." },
  doh: { name: 'Doha (DOH)', priorityPass: 'moderate', note: 'Qatar Airways controls most premium lounges here (status or business/first class), with more limited independent Priority Pass options.' },
  hnd: { name: 'Tokyo Haneda (HND)', priorityPass: 'moderate', note: 'Priority Pass access exists via specific partner lounges, though the largest lounges are airline-status or class-of-service based.' },
  icn: { name: 'Seoul Incheon (ICN)', priorityPass: 'good', note: 'Multiple partner lounges accept Priority Pass at one of the world\'s most highly-rated airports for lounge quality generally.' },
  sin: { name: 'Singapore Changi (SIN)', priorityPass: 'good', note: 'Strong Priority Pass coverage across terminals, consistent with Changi\'s overall reputation for amenities.' },
  hkg: { name: 'Hong Kong (HKG)', priorityPass: 'good', note: 'Multiple partner lounges accept Priority Pass across the terminal.' },
  syd: { name: 'Sydney (SYD)', priorityPass: 'good', note: 'Priority Pass-accepting lounges are available in both the international and domestic terminals.' },
};

const PRIORITY_PASS_LABELS = {
  good: 'Good Priority Pass coverage',
  moderate: 'Moderate Priority Pass coverage',
  limited: 'Limited Priority Pass coverage',
};

function computeResult({ airport }) {
  const data = AIRPORTS[airport];
  if (!data) throw new Error('Unknown airport');

  const priorityPassLabel = PRIORITY_PASS_LABELS[data.priorityPass];
  const headline = `${data.name}: ${priorityPassLabel}.`;

  return {
    airport, airportName: data.name, priorityPass: data.priorityPass,
    priorityPassLabel, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/lounge-access-checker/calculate
// @access Public
exports.calculateLoungeAccess = (req, res) => {
  try {
    const { airport } = req.body;
    if (!airport) return res.status(400).json({ success: false, error: 'airport is required' });
    const result = computeResult({ airport });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/lounge-access-checker/pdf
// @access Public
exports.generateLoungeAccessPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airport } = req.body;
    if (!email || !airport) {
      return res.status(400).json({ success: false, error: 'email and airport are required' });
    }

    const result = computeResult({ airport });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'lounge-access-checker',
        JSON.stringify({ airport }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airportName} Lounge Access Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="lounge-access-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.priorityPassLabel);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      'Lounge partnerships change over time — always check the Priority Pass app or website for the current specific lounge at your terminal before you fly.',
      'A premium credit card (like Amex Platinum, Chase Sapphire Reserve, or Capital One Venture X) often includes Priority Pass Select membership as a benefit — check if you already have access through a card you hold.',
      "Even where a lounge accepts Priority Pass, some cap free visits per membership tier or charge a guest fee — check your specific membership's terms.",
      "If Priority Pass coverage is limited at your airport, a same-day paid day pass (via apps like LoungeBuddy or the airline directly) is often available as a fallback.",
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛋️ Your ${result.airportName} lounge access guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your lounge access check for ${result.airportName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond airport lounges? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send lounge-access-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLoungeAccessPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRPORTS = AIRPORTS;
exports.computeResult = computeResult;
