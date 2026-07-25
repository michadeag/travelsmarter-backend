const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// WiFi and amenity info per airport, reused from Tool #9's 31-airport
// list. loungeQuality: 'excellent' | 'good' | 'limited'.
const AIRPORTS = {
  atl: { name: 'Atlanta (ATL)', freeWifi: true, loungeQuality: 'good', topAmenity: 'The Delta Sky Club network here is one of the most extensive in the US.', note: "Free WiFi is unlimited and reliable — the airport's biggest challenge is sheer size, not connectivity." },
  ord: { name: "Chicago O'Hare (ORD)", freeWifi: true, loungeQuality: 'good', topAmenity: 'A rotating art program and a small aquarium exhibit sit right in Terminal 3.', note: 'Free WiFi is unlimited across all terminals.' },
  dfw: { name: 'Dallas/Fort Worth (DFW)', freeWifi: true, loungeQuality: 'good', topAmenity: 'The free Skylink train connects all five terminals quickly, so a layover here rarely feels stressful.', note: 'Free WiFi is unlimited across the airport.' },
  den: { name: 'Denver (DEN)', freeWifi: true, loungeQuality: 'good', topAmenity: 'A notable public art collection and an on-site yoga room in the Great Hall.', note: 'Free WiFi is unlimited across the airport.' },
  lax: { name: 'Los Angeles (LAX)', freeWifi: true, loungeQuality: 'good', topAmenity: 'Some of the best people-watching and celebrity-spotting odds of any US airport.', note: "Free WiFi is unlimited, but LAX's terminals are spread out — budget real time to walk or shuttle between them." },
  jfk: { name: 'New York JFK (JFK)', freeWifi: true, loungeQuality: 'good', topAmenity: "The TWA Hotel's rooftop pool and observation deck, next to Terminal 5, is open to non-hotel-guests via day passes.", note: 'Free WiFi is unlimited, and lounge quality varies significantly by terminal and airline.' },
  ewr: { name: 'Newark (EWR)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'The newer Terminal A (opened 2023) has noticeably better food and lounge options than the older terminals.', note: 'Free WiFi is unlimited, though older terminals still feel dated compared to Terminal A.' },
  iah: { name: 'Houston (IAH)', freeWifi: true, loungeQuality: 'good', topAmenity: 'United Club lounges are spread throughout, alongside a smooth inter-terminal train.', note: 'Free WiFi is unlimited across the airport.' },
  phx: { name: 'Phoenix (PHX)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'A dedicated yoga room and a small but well-reviewed rotating art program.', note: 'Free WiFi is unlimited across the airport.' },
  sfo: { name: 'San Francisco (SFO)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'A free aviation museum and rotating public art galleries throughout the terminals — genuinely worth a wander.', note: 'Free WiFi is unlimited across the airport.' },
  sea: { name: 'Seattle (SEA)', freeWifi: true, loungeQuality: 'good', topAmenity: 'A rooftop deck with mountain views right in the main terminal.', note: 'Free WiFi is unlimited across the airport.' },
  mia: { name: 'Miami (MIA)', freeWifi: true, loungeQuality: 'good', topAmenity: 'A wide variety of Latin American dining, reflecting the airport\'s role as a gateway to Latin America.', note: 'Free WiFi is unlimited across the airport.' },
  clt: { name: 'Charlotte (CLT)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'Rocking chairs scattered throughout the concourses are a low-key signature feature.', note: 'Free WiFi is unlimited across the airport.' },
  mco: { name: 'Orlando (MCO)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'A large, family-friendly food hall and play areas, reflecting its theme-park-heavy traffic.', note: 'Free WiFi is unlimited across the airport.' },
  las: { name: 'Las Vegas (LAS)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'Slot machines are scattered throughout the terminals if you want to gamble before or after your flight.', note: 'Free WiFi is unlimited across the airport.' },
  msp: { name: 'Minneapolis-St. Paul (MSP)', freeWifi: true, loungeQuality: 'good', topAmenity: 'A large, well-regarded shopping and dining concourse in Terminal 1.', note: 'Free WiFi is unlimited across the airport.' },
  dtw: { name: 'Detroit (DTW)', freeWifi: true, loungeQuality: 'good', topAmenity: "The McNamara Terminal's tram and light-tunnel moving walkway make it one of the more pleasant US terminals to walk.", note: 'Free WiFi is unlimited across the airport.' },
  phl: { name: 'Philadelphia (PHL)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'A rotating art and history exhibit program runs throughout the terminals.', note: 'Free WiFi is unlimited across the airport.' },
  bos: { name: 'Boston (BOS)', freeWifi: true, loungeQuality: 'good', topAmenity: 'Harborside views from some gates in Terminal E (international).', note: 'Free WiFi is unlimited across the airport.' },
  fll: { name: 'Fort Lauderdale (FLL)', freeWifi: true, loungeQuality: 'limited', topAmenity: 'Smaller and easier to navigate than Miami, with a notably more relaxed atmosphere.', note: 'Free WiFi is unlimited across the airport.' },
  lhr: { name: 'London Heathrow (LHR)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'Extensive luxury shopping in Terminal 5, plus some of the best airline lounges in the world (British Airways Concorde Room, Virgin Clubhouse).', note: 'Free WiFi requires a quick registration but is otherwise unlimited.' },
  cdg: { name: 'Paris Charles de Gaulle (CDG)', freeWifi: true, loungeQuality: 'good', topAmenity: 'Extensive duty-free shopping throughout, especially in Terminal 2E.', note: "Free WiFi is unlimited, but CDG's layout is notoriously confusing — allow extra time to find your gate." },
  ams: { name: 'Amsterdam Schiphol (AMS)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'A public library, a Rijksmuseum outpost art display, and even a small casino, all in the terminal.', note: 'Free WiFi is unlimited across the airport.' },
  fra: { name: 'Frankfurt (FRA)', freeWifi: true, loungeQuality: 'excellent', topAmenity: "An extensive Lufthansa lounge network and a shopping-mall feel throughout the terminals.", note: "Free WiFi is unlimited, but Frankfurt is large enough to require real walking time between some gates." },
  dxb: { name: 'Dubai (DXB)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'Round-the-clock shopping and dining, plus an indoor waterfall and rainforest display in Terminal 3.', note: 'Free WiFi is unlimited across the airport.' },
  doh: { name: 'Doha (DOH)', freeWifi: true, loungeQuality: 'excellent', topAmenity: "Qatar Airways' Al Mourjan lounge includes a full spa and pool — one of the most talked-about lounges anywhere.", note: 'Free WiFi is unlimited across the airport.' },
  hnd: { name: 'Tokyo Haneda (HND)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'An Edo-period-themed shopping street (Edo Koji) is built right into the terminal.', note: 'Free WiFi is unlimited across the airport.' },
  icn: { name: 'Seoul Incheon (ICN)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'Free shower and rest facilities, a spa, an ice rink, and even a small museum — consistently ranked among the world\'s best airports.', note: 'Free WiFi is unlimited across the airport.' },
  sin: { name: 'Singapore Changi (SIN)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'The Jewel complex has an indoor waterfall, a canopy park, and a hedge maze — genuinely worth arriving early for.', note: 'Free WiFi is unlimited across the airport.' },
  hkg: { name: 'Hong Kong (HKG)', freeWifi: true, loungeQuality: 'excellent', topAmenity: 'An IMAX theatre, a golf course, and a rooftop garden are all inside the terminal.', note: 'Free WiFi is unlimited across the airport.' },
  syd: { name: 'Sydney (SYD)', freeWifi: true, loungeQuality: 'good', topAmenity: 'A rooftop terrace with plane-spotting views in the international terminal.', note: 'Free WiFi is unlimited across the airport.' },
};

const LOUNGE_LABELS = { excellent: 'excellent', good: 'solid', limited: 'limited' };

function computeResult({ airport }) {
  const data = AIRPORTS[airport];
  if (!data) throw new Error('Unknown airport');

  const headline = `${data.name}: ${data.freeWifi ? 'free WiFi' : 'no reliably free WiFi'}, ${LOUNGE_LABELS[data.loungeQuality]} lounges.`;

  return {
    airport, airportName: data.name, freeWifi: data.freeWifi,
    loungeQuality: data.loungeQuality, loungeQualityLabel: LOUNGE_LABELS[data.loungeQuality],
    topAmenity: data.topAmenity, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/airport-amenities-checker/calculate
// @access Public
exports.calculateAirportAmenities = (req, res) => {
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
// @route POST /api/tools/airport-amenities-checker/pdf
// @access Public
exports.generateAirportAmenitiesPdf = async (req, res) => {
  try {
    const { email, firstName, airport } = req.body;
    if (!email || !airport) {
      return res.status(400).json({ success: false, error: 'email and airport are required' });
    }

    const result = computeResult({ airport });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['airport-amenities-checker', firstName || null, 'airport-amenities-checker',
        JSON.stringify({ airport }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.airportName} WiFi & Amenities Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="airport-amenities-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Don't miss: ${result.topAmenity}`);

    pdfService.heading(doc, 'Making the most of a long layover');
    pdfService.bulletList(doc, [
      'Connect to the airport WiFi as soon as you land — it\'s usually the fastest way to check gate changes and delays too.',
      result.loungeQuality === 'excellent' || result.loungeQuality === 'good'
        ? 'A day pass to an airline lounge (often purchasable even without status or a premium ticket) can be well worth it for a long layover here.'
        : 'Lounge options are limited here, so scope out a quiet gate area or a sit-down restaurant instead of counting on a day-pass lounge.',
      'Bring a portable charger — outlets are often in high demand near crowded gates.',
      'Check whether your layover is long enough to explore the amenity above; a quick gate-to-gate connection isn\'t the time to go looking for it.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛫 Your ${result.airportName} amenities guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your airport check for ${result.airportName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the layover? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send airport-amenities-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAirportAmenitiesPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRPORTS = AIRPORTS;
