const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Recommended arrival time before departure (minutes) per airport, for
// domestic vs. international flights, plus a security/check-in congestion
// level. Same 31-airport roster as layoverController.js/transferController
// for consistency across airport-based tools. General guidance based on
// typical security wait patterns — always check your airline's specific
// check-in cutoff too.
const AIRPORTS = {
  atl: { name: 'Atlanta (ATL)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: "Atlanta is the world's busiest airport — TSA lines can be long during the morning peak (5-9am). The train between concourses is fast, but checkpoints get backed up. Consider TSA PreCheck or CLEAR if you fly here often." },
  ord: { name: "Chicago O'Hare (ORD)", domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: "O'Hare's terminals are large and security lines vary widely by checkpoint — check the airport's live wait-time information if available." },
  dfw: { name: 'Dallas/Fort Worth (DFW)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: 'DFW is physically huge — factor in extra time to reach your gate even after clearing security, especially for far-flung gates.' },
  den: { name: 'Denver (DEN)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: "Denver's security checkpoints are generally efficient outside of peak morning hours." },
  lax: { name: 'Los Angeles (LAX)', domesticMinutes: 150, intlMinutes: 180, securityLevel: 'high', notes: 'LAX is notorious for TSA lines, especially at the Tom Bradley International Terminal — arrive on the earlier end of the range.' },
  jfk: { name: 'New York JFK (JFK)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: "Terminal-dependent — some JFK terminals have much longer security lines than others, so check your specific terminal's typical wait." },
  ewr: { name: 'Newark (EWR)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'moderate', notes: "Generally manageable, though the newer Terminal A facility has smoothed out historically long lines." },
  iah: { name: 'Houston (IAH)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: 'Generally efficient, though international lines can back up during peak arrival banks.' },
  phx: { name: 'Phoenix (PHX)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Phoenix Sky Harbor is compact and generally fast through security.' },
  sfo: { name: 'San Francisco (SFO)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'moderate', notes: 'International terminal lines can be lengthy during peak departure banks — the renovated terminal has helped.' },
  sea: { name: 'Seattle (SEA)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: 'Generally efficient, with occasional peak-time backups at the main checkpoint.' },
  mia: { name: 'Miami (MIA)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: 'Heavy Latin America/Caribbean traffic makes immigration and security lines unpredictable — err on the longer side.' },
  clt: { name: 'Charlotte (CLT)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Generally efficient for a major hub.' },
  mco: { name: 'Orlando (MCO)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'moderate', notes: 'Peak vacation season (school holidays, summer) brings noticeably longer lines — add buffer during those periods.' },
  las: { name: 'Las Vegas (LAS)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Generally efficient outside of major convention weeks.' },
  msp: { name: 'Minneapolis-St. Paul (MSP)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'A well-run hub with generally fast security lines.' },
  dtw: { name: 'Detroit (DTW)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Generally efficient, especially in the McNamara terminal.' },
  phl: { name: 'Philadelphia (PHL)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: 'Lines vary by terminal — generally manageable but not the fastest major US airport.' },
  bos: { name: 'Boston (BOS)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: 'Generally efficient, though the international terminal can back up during peak departure times.' },
  fll: { name: 'Fort Lauderdale (FLL)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Compact and generally fast through security.' },
  lhr: { name: 'London Heathrow (LHR)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: 'Heathrow security lines, especially at Terminal 5, can be long during peak hours — one of the busier international airports for security waits.' },
  cdg: { name: 'Paris Charles de Gaulle (CDG)', domesticMinutes: 120, intlMinutes: 180, securityLevel: 'high', notes: "Terminal 2's security checkpoints and occasional bus transfers to satellite gates eat into your buffer — don't cut it close." },
  ams: { name: 'Amsterdam Schiphol (AMS)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: "Schiphol's single, well-organized terminal keeps security lines moving efficiently most of the day." },
  fra: { name: 'Frankfurt (FRA)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: "Generally efficient, though it's worth checking which terminal (1 or 2) your flight departs from in advance." },
  dxb: { name: 'Dubai (DXB)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: "Huge but well-organized — security is generally efficient given the airport's size." },
  doh: { name: 'Doha (DOH)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'A modern, efficiently designed airport with generally fast security processing.' },
  hnd: { name: 'Tokyo Haneda (HND)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Efficient and well-organized — Japanese airports are known for smooth, predictable processing times.' },
  icn: { name: 'Seoul Incheon (ICN)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: "Consistently rated among the world's most efficient airports for security and processing." },
  sin: { name: 'Singapore Changi (SIN)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Changi is famously fast and well-organized — security lines rarely back up significantly.' },
  hkg: { name: 'Hong Kong (HKG)', domesticMinutes: 90, intlMinutes: 150, securityLevel: 'low', notes: 'Generally efficient with clear signage and fast-moving lines.' },
  syd: { name: 'Sydney (SYD)', domesticMinutes: 105, intlMinutes: 165, securityLevel: 'moderate', notes: 'Separate domestic and international terminals mean you need to be at the right one — factor in transfer time if connecting between them.' },
};

const SECURITY_LABELS = {
  low: 'low — security and check-in are generally fast, so you can lean toward the shorter end of the recommendation',
  moderate: 'moderate — build in your full recommended buffer, especially at peak times',
  high: 'high — this airport is known for slower lines, so err toward the longer end or add extra buffer',
};

function computeResult({ airport, flightType }) {
  const data = AIRPORTS[airport];
  if (!data) throw new Error('Unknown airport');
  if (flightType !== 'domestic' && flightType !== 'international') throw new Error('flightType must be domestic or international');

  const recommendedMinutes = flightType === 'domestic' ? data.domesticMinutes : data.intlMinutes;
  const flightTypeLabel = flightType === 'domestic' ? 'domestic' : 'international';
  const securityLevelLabel = SECURITY_LABELS[data.securityLevel];

  const headline = `Arrive at ${data.name} at least ${recommendedMinutes} minutes before a ${flightTypeLabel} flight. Security/check-in congestion here is ${securityLevelLabel}.`;

  return {
    airport, airportName: data.name, flightType, flightTypeLabel, recommendedMinutes,
    securityLevel: data.securityLevel, securityLevelLabel, notes: data.notes, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/airport-arrival-time-checker/calculate
// @access Public
exports.calculateAirportArrivalTime = (req, res) => {
  try {
    const { airport, flightType } = req.body;
    if (!airport || !flightType) {
      return res.status(400).json({ success: false, error: 'airport and flightType are required' });
    }
    const result = computeResult({ airport, flightType });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/airport-arrival-time-checker/pdf
// @access Public
exports.generateAirportArrivalTimePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airport, flightType } = req.body;
    if (!email || !airport || !flightType) {
      return res.status(400).json({ success: false, error: 'email, airport, and flightType are required' });
    }

    const result = computeResult({ airport, flightType });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'airport-arrival-time-checker',
        JSON.stringify({ airport, flightType }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airportName} Arrival Time Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="airport-arrival-time-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.notes);

    pdfService.highlightBox(doc, `Recommended arrival: ${result.recommendedMinutes} minutes before departure`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      'Checking a bag adds real time — bag-drop lines can run 15-30 minutes at busy airports, so lean toward the longer end of the range if you\'re not carry-on only.',
      'TSA PreCheck, Global Entry, or CLEAR can meaningfully cut security wait time at eligible airports — worth it if you fly several times a year.',
      'Check your airline\'s specific check-in and bag-drop cutoff times — some close 30-60 minutes before departure regardless of how early you arrive at the airport.',
      'This guide reflects general patterns — actual wait times swing with time of day, season, and current events, so build in extra buffer during peak travel periods.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛬 Your ${result.airportName} arrival time guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your arrival time check for ${result.airportName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond airport timing? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send airport-arrival-time-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAirportArrivalTimePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRPORTS = AIRPORTS;
