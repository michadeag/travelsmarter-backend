const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Minimum connection times (minutes) per airport, by connection type:
// domestic = both legs domestic; mixed = one leg international (requires
// immigration/customs or security re-clear); international = both legs
// international. These are general guidance, not official MCTs — always
// confirm with your airline for your specific itinerary.
const AIRPORTS = {
  atl: { name: 'Atlanta (ATL)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'The world\'s busiest airport, but its train system between concourses is fast and reliable — connections are generally smooth if you make the train.' },
  ord: { name: 'Chicago O\'Hare (ORD)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Large, sprawling terminals — allow extra time if your connection changes terminals, especially to/from Terminal 5 (international).' },
  dfw: { name: 'Dallas/Fort Worth (DFW)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'The Skylink train connects terminals efficiently, but the airport is physically huge — don\'t cut it too close.' },
  den: { name: 'Denver (DEN)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Generally efficient connections with a train between concourses.' },
  lax: { name: 'Los Angeles (LAX)', mctDomestic: 60, mctMixed: 120, mctIntl: 90, notes: 'Sprawling terminal layout often requires walking outside or taking a shuttle between terminals — build in extra buffer here.' },
  jfk: { name: 'New York JFK (JFK)', mctDomestic: 60, mctMixed: 120, mctIntl: 90, notes: 'Different airlines use different terminals with no fast inter-terminal transfer — allow generous time, especially for international connections.' },
  ewr: { name: 'Newark (EWR)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Generally manageable, though AirTrain transfers between terminals take real time.' },
  iah: { name: 'Houston (IAH)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'A major United hub with generally smooth connections within the same terminal complex.' },
  phx: { name: 'Phoenix (PHX)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Compact and generally easy to navigate for connections.' },
  sfo: { name: 'San Francisco (SFO)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Recently renovated international terminal has improved connection flow, but confirm your specific terminal change.' },
  sea: { name: 'Seattle (SEA)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Generally efficient, with a satellite terminal train for some international gates.' },
  mia: { name: 'Miami (MIA)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Can get congested, especially with heavy Latin America/Caribbean connecting traffic — build in extra buffer during peak hours.' },
  clt: { name: 'Charlotte (CLT)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'A major American Airlines hub, generally efficient for connections within the same concourse.' },
  mco: { name: 'Orlando (MCO)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Straightforward layout, generally manageable connections.' },
  las: { name: 'Las Vegas (LAS)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Compact and generally easy to navigate for connections.' },
  msp: { name: 'Minneapolis-St. Paul (MSP)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'A major Delta hub, generally smooth for same-terminal connections.' },
  dtw: { name: 'Detroit (DTW)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'A major Delta hub with an efficient tram between concourses.' },
  phl: { name: 'Philadelphia (PHL)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Generally manageable, though terminal changes add walking time.' },
  bos: { name: 'Boston (BOS)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Generally manageable, with a shuttle bus connecting some terminals.' },
  fll: { name: 'Fort Lauderdale (FLL)', mctDomestic: 45, mctMixed: 90, mctIntl: 75, notes: 'Compact and generally easy to navigate for connections.' },
  lhr: { name: 'London Heathrow (LHR)', mctDomestic: 60, mctMixed: 90, mctIntl: 90, notes: 'Officially allows 75-minute minimum connections, but security re-screening between some terminals makes 90+ minutes a safer bet.' },
  cdg: { name: 'Paris Charles de Gaulle (CDG)', mctDomestic: 60, mctMixed: 90, mctIntl: 90, notes: 'Terminal 2\'s sprawling layout and occasional bus transfers between satellite gates can eat up your buffer — don\'t cut it close.' },
  ams: { name: 'Amsterdam Schiphol (AMS)', mctDomestic: 45, mctMixed: 60, mctIntl: 60, notes: 'Widely regarded as one of the most efficient connecting airports in Europe — a single-terminal layout keeps things simple.' },
  fra: { name: 'Frankfurt (FRA)', mctDomestic: 45, mctMixed: 75, mctIntl: 60, notes: 'Generally efficient, though connections between Terminal 1 and Terminal 2 require a shuttle bus.' },
  dxb: { name: 'Dubai (DXB)', mctDomestic: 60, mctMixed: 75, mctIntl: 75, notes: 'Huge but well-organized with moving walkways and trains — Emirates/flydubai connections within the same terminal are usually smooth.' },
  doh: { name: 'Doha (DOH)', mctDomestic: 60, mctMixed: 75, mctIntl: 60, notes: 'A modern, efficiently designed hub built for fast connections.' },
  hnd: { name: 'Tokyo Haneda (HND)', mctDomestic: 60, mctMixed: 90, mctIntl: 75, notes: 'Domestic and international terminals are physically separate, connected by a shuttle bus — factor in extra time if switching between them.' },
  icn: { name: 'Seoul Incheon (ICN)', mctDomestic: 60, mctMixed: 75, mctIntl: 60, notes: 'A large but highly efficient hub, often cited as one of the best airports for smooth connections.' },
  sin: { name: 'Singapore Changi (SIN)', mctDomestic: 60, mctMixed: 75, mctIntl: 60, notes: 'Consistently rated among the world\'s best airports for connections — fast, well-signed, and often has a fast-track option for tight transfers.' },
  hkg: { name: 'Hong Kong (HKG)', mctDomestic: 60, mctMixed: 75, mctIntl: 75, notes: 'Generally efficient single-terminal layout with clear signage.' },
  syd: { name: 'Sydney (SYD)', mctDomestic: 60, mctMixed: 120, mctIntl: 90, notes: 'Domestic and international terminals are physically separate, requiring a shuttle bus or train — build in significant extra time for domestic-international connections.' },
};

function computeResult({ airport, connectionType, availableMinutes }) {
  const data = AIRPORTS[airport];
  if (!data) throw new Error('Unknown airport');
  const minutes = Number(availableMinutes);
  if (!Number.isFinite(minutes) || minutes < 0) throw new Error('availableMinutes must be a non-negative number');

  const mctKey = connectionType === 'domestic' ? 'mctDomestic' : connectionType === 'international' ? 'mctIntl' : 'mctMixed';
  const mct = data[mctKey];
  const comfortableBuffer = mct + 30;

  let status, headline;
  if (minutes < mct) {
    status = 'too_short';
    headline = `${minutes} minutes at ${data.name} is below the typical minimum connection time of ${mct} minutes for this connection type — risky, talk to your airline about rebooking if possible.`;
  } else if (minutes < comfortableBuffer) {
    status = 'tight_but_workable';
    headline = `${minutes} minutes at ${data.name} clears the ${mct}-minute minimum, but it's tight — go straight to your gate and skip anything optional.`;
  } else {
    status = 'comfortable';
    headline = `${minutes} minutes at ${data.name} is a comfortable connection for this type — you should have time to spare.`;
  }

  return {
    airport, airportName: data.name, connectionType, availableMinutes: minutes,
    mct, comfortableBuffer, notes: data.notes, status, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/layover-checker/calculate
// @access Public
exports.calculateLayover = (req, res) => {
  try {
    const { airport, connectionType, availableMinutes } = req.body;
    if (!airport || !connectionType || availableMinutes === undefined) {
      return res.status(400).json({ success: false, error: 'airport, connectionType, and availableMinutes are required' });
    }
    const result = computeResult({ airport, connectionType, availableMinutes });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/layover-checker/pdf
// @access Public
exports.generateLayoverPdf = async (req, res) => {
  try {
    const { email, firstName, airport, connectionType, availableMinutes } = req.body;
    if (!email || !airport || !connectionType || availableMinutes === undefined) {
      return res.status(400).json({ success: false, error: 'email, airport, connectionType, and availableMinutes are required' });
    }

    const result = computeResult({ airport, connectionType, availableMinutes });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['layover-checker', firstName || null, 'layover-checker',
        JSON.stringify({ airport, connectionType, availableMinutes }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.airportName} Layover Report`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="layover-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.notes);

    pdfService.highlightBox(doc, `Your layover: ${result.availableMinutes} min · Typical minimum: ${result.mct} min · Comfortable: ${result.comfortableBuffer}+ min`);

    pdfService.heading(doc, 'If your connection is tight');
    pdfService.bulletList(doc, [
      'Check in for your connecting flight and get your boarding pass before you land if possible (many airlines allow this).',
      'If you only have a carry-on, head straight to your gate rather than stopping for food or shopping.',
      'If you have checked bags on a tight international-to-domestic connection, ask a flight attendant or gate agent about priority deplaning.',
      'If you miss the connection, go straight to your airline\'s transfer desk or app rather than the general check-in line — they can usually rebook you faster.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛫 Your ${result.airportName} layover check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your layover check for ${result.airportName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond layover math? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send layover-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLayoverPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRPORTS = AIRPORTS;
