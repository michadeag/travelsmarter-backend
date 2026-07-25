const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Airport-to-downtown transfer options, reused from Tool #9's airport list.
// Fare ranges are typical, approximate figures in USD — always subject to
// surge pricing, traffic, and airline/city changes; not a live quote.
const AIRPORTS = {
  atl: { name: 'Atlanta (ATL)', taxiLow: 30, taxiHigh: 45, rideshareLow: 25, rideshareHigh: 40, transitOption: 'MARTA train', transitCost: 2.5, transitMinutes: 20, taxiMinutes: 25 },
  ord: { name: 'Chicago O\'Hare (ORD)', taxiLow: 45, taxiHigh: 65, rideshareLow: 35, rideshareHigh: 55, transitOption: 'CTA Blue Line train', transitCost: 5, transitMinutes: 45, taxiMinutes: 40 },
  dfw: { name: 'Dallas/Fort Worth (DFW)', taxiLow: 45, taxiHigh: 60, rideshareLow: 35, rideshareHigh: 50, transitOption: 'TEXRail/DART train', transitCost: 2.5, transitMinutes: 45, taxiMinutes: 30 },
  den: { name: 'Denver (DEN)', taxiLow: 60, taxiHigh: 75, rideshareLow: 45, rideshareHigh: 60, transitOption: 'A Line train', transitCost: 10.5, transitMinutes: 37, taxiMinutes: 45 },
  lax: { name: 'Los Angeles (LAX)', taxiLow: 50, taxiHigh: 75, rideshareLow: 35, rideshareHigh: 60, transitOption: 'LAX FlyAway bus', transitCost: 9.75, transitMinutes: 45, taxiMinutes: 40 },
  jfk: { name: 'New York JFK (JFK)', taxiLow: 70, taxiHigh: 70, rideshareLow: 45, rideshareHigh: 70, transitOption: 'AirTrain + subway', transitCost: 10.75, transitMinutes: 60, taxiMinutes: 50 },
  ewr: { name: 'Newark (EWR)', taxiLow: 60, taxiHigh: 80, rideshareLow: 40, rideshareHigh: 65, transitOption: 'AirTrain + NJ Transit', transitCost: 15.25, transitMinutes: 45, taxiMinutes: 40 },
  iah: { name: 'Houston (IAH)', taxiLow: 45, taxiHigh: 60, rideshareLow: 30, rideshareHigh: 45, transitOption: 'Airport shuttle bus', transitCost: 5, transitMinutes: 50, taxiMinutes: 35 },
  phx: { name: 'Phoenix (PHX)', taxiLow: 25, taxiHigh: 35, rideshareLow: 18, rideshareHigh: 30, transitOption: 'PHX Sky Train + light rail', transitCost: 2, transitMinutes: 30, taxiMinutes: 20 },
  sfo: { name: 'San Francisco (SFO)', taxiLow: 60, taxiHigh: 75, rideshareLow: 40, rideshareHigh: 60, transitOption: 'BART train', transitCost: 10.5, transitMinutes: 30, taxiMinutes: 30 },
  sea: { name: 'Seattle (SEA)', taxiLow: 45, taxiHigh: 55, rideshareLow: 30, rideshareHigh: 45, transitOption: 'Link light rail', transitCost: 3, transitMinutes: 40, taxiMinutes: 30 },
  mia: { name: 'Miami (MIA)', taxiLow: 35, taxiHigh: 45, rideshareLow: 20, rideshareHigh: 35, transitOption: 'Metrorail (Orange Line)', transitCost: 2.25, transitMinutes: 35, taxiMinutes: 25 },
  clt: { name: 'Charlotte (CLT)', taxiLow: 25, taxiHigh: 35, rideshareLow: 18, rideshareHigh: 28, transitOption: 'CATS bus', transitCost: 2.2, transitMinutes: 30, taxiMinutes: 20 },
  mco: { name: 'Orlando (MCO)', taxiLow: 40, taxiHigh: 55, rideshareLow: 25, rideshareHigh: 40, transitOption: 'Lynx bus', transitCost: 2, transitMinutes: 50, taxiMinutes: 25 },
  las: { name: 'Las Vegas (LAS)', taxiLow: 20, taxiHigh: 30, rideshareLow: 15, rideshareHigh: 25, transitOption: 'RTC bus (The Deuce)', transitCost: 6, transitMinutes: 25, taxiMinutes: 15 },
  msp: { name: 'Minneapolis-St. Paul (MSP)', taxiLow: 35, taxiHigh: 45, rideshareLow: 20, rideshareHigh: 35, transitOption: 'METRO Blue Line', transitCost: 2.5, transitMinutes: 25, taxiMinutes: 20 },
  dtw: { name: 'Detroit (DTW)', taxiLow: 55, taxiHigh: 70, rideshareLow: 35, rideshareHigh: 55, transitOption: 'No direct rail — shuttle/taxi only', transitCost: null, transitMinutes: null, taxiMinutes: 30 },
  phl: { name: 'Philadelphia (PHL)', taxiLow: 30, taxiHigh: 40, rideshareLow: 20, rideshareHigh: 32, transitOption: 'SEPTA Airport Line train', transitCost: 6.75, transitMinutes: 25, taxiMinutes: 20 },
  bos: { name: 'Boston (BOS)', taxiLow: 30, taxiHigh: 45, rideshareLow: 20, rideshareHigh: 35, transitOption: 'Silver Line bus + subway', transitCost: 2.4, transitMinutes: 30, taxiMinutes: 20 },
  fll: { name: 'Fort Lauderdale (FLL)', taxiLow: 20, taxiHigh: 30, rideshareLow: 15, rideshareHigh: 25, transitOption: 'Sun Trolley/local bus', transitCost: 2, transitMinutes: 30, taxiMinutes: 15 },
  lhr: { name: 'London Heathrow (LHR)', taxiLow: 90, taxiHigh: 120, rideshareLow: 60, rideshareHigh: 90, transitOption: 'Heathrow Express train', transitCost: 28, transitMinutes: 15, taxiMinutes: 45 },
  cdg: { name: 'Paris Charles de Gaulle (CDG)', taxiLow: 55, taxiHigh: 65, rideshareLow: 40, rideshareHigh: 55, transitOption: 'RER B train', transitCost: 12, transitMinutes: 35, taxiMinutes: 45 },
  ams: { name: 'Amsterdam Schiphol (AMS)', taxiLow: 45, taxiHigh: 60, rideshareLow: 30, rideshareHigh: 45, transitOption: 'NS direct train', transitCost: 6, transitMinutes: 15, taxiMinutes: 25 },
  fra: { name: 'Frankfurt (FRA)', taxiLow: 40, taxiHigh: 55, rideshareLow: 30, rideshareHigh: 45, transitOption: 'S-Bahn train', transitCost: 5.5, transitMinutes: 15, taxiMinutes: 25 },
  dxb: { name: 'Dubai (DXB)', taxiLow: 25, taxiHigh: 40, rideshareLow: 20, rideshareHigh: 35, transitOption: 'Dubai Metro', transitCost: 3, transitMinutes: 30, taxiMinutes: 25 },
  doh: { name: 'Doha (DOH)', taxiLow: 20, taxiHigh: 30, rideshareLow: 15, rideshareHigh: 25, transitOption: 'Doha Metro', transitCost: 2, transitMinutes: 25, taxiMinutes: 20 },
  hnd: { name: 'Tokyo Haneda (HND)', taxiLow: 60, taxiHigh: 90, rideshareLow: 50, rideshareHigh: 80, transitOption: 'Tokyo Monorail + train', transitCost: 6, transitMinutes: 40, taxiMinutes: 35 },
  icn: { name: 'Seoul Incheon (ICN)', taxiLow: 50, taxiHigh: 70, rideshareLow: 40, rideshareHigh: 60, transitOption: 'AREX express train', transitCost: 8, transitMinutes: 45, taxiMinutes: 60 },
  sin: { name: 'Singapore Changi (SIN)', taxiLow: 20, taxiHigh: 30, rideshareLow: 15, rideshareHigh: 25, transitOption: 'MRT train', transitCost: 1.7, transitMinutes: 30, taxiMinutes: 25 },
  hkg: { name: 'Hong Kong (HKG)', taxiLow: 35, taxiHigh: 50, rideshareLow: 25, rideshareHigh: 40, transitOption: 'Airport Express train', transitCost: 13.5, transitMinutes: 25, taxiMinutes: 40 },
  syd: { name: 'Sydney (SYD)', taxiLow: 40, taxiHigh: 55, rideshareLow: 30, rideshareHigh: 45, transitOption: 'Airport Link train', transitCost: 18, transitMinutes: 15, taxiMinutes: 30 },
};

function computeResult({ airport }) {
  const data = AIRPORTS[airport];
  if (!data) throw new Error('Unknown airport');

  const cheapestOption = data.transitCost !== null && data.transitCost < data.rideshareLow ? 'transit' : 'rideshare';
  const headline = `At ${data.name}, expect $${data.rideshareLow}-${data.rideshareHigh} for a rideshare (~${data.taxiMinutes} min) or $${data.taxiLow}-${data.taxiHigh} for a taxi to downtown.`;

  return {
    airport, airportName: data.name,
    taxiLow: data.taxiLow, taxiHigh: data.taxiHigh, taxiMinutes: data.taxiMinutes,
    rideshareLow: data.rideshareLow, rideshareHigh: data.rideshareHigh,
    transitOption: data.transitOption, transitCost: data.transitCost, transitMinutes: data.transitMinutes,
    cheapestOption, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/airport-transfer-calculator/calculate
// @access Public
exports.calculateTransfer = (req, res) => {
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
// @route POST /api/tools/airport-transfer-calculator/pdf
// @access Public
exports.generateTransferPdf = async (req, res) => {
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
      [email, firstName || null, 'airport-transfer-calculator',
        JSON.stringify({ airport }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airportName} Airport Transfer Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="airport-transfer-calculator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, 'These are typical, approximate fare ranges — actual prices vary with traffic, time of day, surge pricing, and your exact drop-off point. Not a live quote.');

    pdfService.highlightBox(doc, result.transitCost !== null
      ? `Cheapest option: ${result.transitOption}, about $${result.transitCost} (~${result.transitMinutes} min)`
      : `No direct rail/transit option — taxi or rideshare is the practical choice at ${result.airportName}`);

    pdfService.heading(doc, 'Your options');
    pdfService.bulletList(doc, [
      `Taxi: $${result.taxiLow}-${result.taxiHigh}, about ${result.taxiMinutes} minutes`,
      `Rideshare (Uber/Lyft or local equivalent): $${result.rideshareLow}-${result.rideshareHigh}`,
      result.transitCost !== null
        ? `${result.transitOption}: about $${result.transitCost}, about ${result.transitMinutes} minutes`
        : `${result.transitOption}`,
    ]);

    pdfService.heading(doc, 'Tips for a smoother transfer');
    pdfService.bulletList(doc, [
      'Book airport transfers or rideshares in advance during peak travel times to avoid surge pricing.',
      'Public transit is almost always the cheapest option if you\'re not carrying heavy luggage and your hotel is near a station.',
      'Confirm your rideshare pickup point before you land — many airports have designated pickup zones separate from the taxi stand.',
      'Ask your hotel if they offer an airport shuttle — sometimes free or cheaper than a taxi for groups.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚕 Your ${result.airportName} transfer guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your airport transfer guide for ${result.airportName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond ground transport? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send airport-transfer-calculator confirmation email:', err.message));

  } catch (error) {
    console.error('generateTransferPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRPORTS = AIRPORTS;
