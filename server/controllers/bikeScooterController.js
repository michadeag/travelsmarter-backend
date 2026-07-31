const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Bike-share and e-scooter rental availability per destination — distinct
// from rideshareController.js (car-hailing apps like Uber) and
// transitController.js (public transit cards/passes, not self-ride
// options). availabilityLevel: 'widespread' (well-established, tourist-
// friendly app-based bike and/or scooter rental, easy to use on arrival) |
// 'limited' (real but patchy — available in the main city center, spotty
// or absent elsewhere) | 'rare' (little to no organized share system;
// traditional rental shops are the practical option) | 'restricted' (a
// notable legal restriction, most commonly on e-scooters specifically,
// on top of otherwise limited availability).
const COUNTRIES = {
  france: { name: 'France', availabilityLevel: 'widespread', note: "Paris's Vélib' bike-share and multiple e-scooter apps (Lime, Dott) are easy to use with a foreign card — most major French cities have some version of the same." },
  austria: { name: 'Austria', availabilityLevel: 'limited', note: "Vienna has bike-share (WienMobil Rad) and scooter apps in the city center — coverage thins out quickly outside the main tourist area." },
  'czech-republic': { name: 'Czech Republic', availabilityLevel: 'limited', note: 'Prague has bike-share (Rekola) and e-scooter apps (Bolt, Lime) in the city center, with coverage thinning outside it.' },
  denmark: { name: 'Denmark', availabilityLevel: 'widespread', note: "Copenhagen is built around cycling — Bycyklen bike-share and e-scooter apps are genuinely easy to use, and dedicated bike infrastructure makes it a practical way to get around, not just a novelty." },
  germany: { name: 'Germany', availabilityLevel: 'widespread', note: 'Nextbike (bike-share) and Lime/Tier (e-scooters) cover most major German cities with straightforward app-based rental.' },
  greece: { name: 'Greece', availabilityLevel: 'limited', note: 'Athens has some e-scooter coverage in the city center — availability is patchy and hillier neighborhoods make cycling less practical than in flatter European cities.' },
  hungary: { name: 'Hungary', availabilityLevel: 'limited', note: 'Budapest has bike-share (MOL Bubi) and e-scooter apps in the city center, with coverage thinning outside it.' },
  iceland: { name: 'Iceland', availabilityLevel: 'rare', note: 'Reykjavik has very limited organized bike/scooter share — most visitors rely on walking, a rental car, or tours instead.' },
  italy: { name: 'Italy', availabilityLevel: 'limited', note: 'Rome and Milan have e-scooter and bike-share apps, but programs come and go with local regulation changes — check what\'s currently active before you rely on one.' },
  netherlands: { name: 'Netherlands', availabilityLevel: 'widespread', note: 'The Netherlands is built around cycling — OV-fiets (train-linked bike rental) and traditional rental shops make bikes a genuinely practical way to get around almost everywhere.' },
  portugal: { name: 'Portugal', availabilityLevel: 'limited', note: 'Lisbon has bike-share (GIRA) and e-scooter apps in the city center — the city\'s hills are worth factoring in before relying on a bike.' },
  spain: { name: 'Spain', availabilityLevel: 'widespread', note: 'Madrid and Barcelona both have extensive, tourist-friendly bike-share and e-scooter networks with straightforward app-based rental.' },
  sweden: { name: 'Sweden', availabilityLevel: 'widespread', note: 'Stockholm has well-established e-scooter apps (Voi, Lime) and bike-share, easy to use with a foreign card.' },
  switzerland: { name: 'Switzerland', availabilityLevel: 'limited', note: 'Major Swiss cities have some bike-share coverage, though e-scooter availability and rules vary more by city than in neighboring countries.' },
  ireland: { name: 'Ireland', availabilityLevel: 'limited', note: 'Dublin has bike-share (dublinbikes) — e-scooter legal status has been evolving, so check current availability before relying on one.' },
  'united-kingdom': { name: 'United Kingdom', availabilityLevel: 'limited', note: "London has bike-share (Santander Cycles) and e-scooter trial zones with rentable scooters — coverage and legality vary meaningfully outside London." },
  turkey: { name: 'Turkey', availabilityLevel: 'limited', note: 'Istanbul has some bike-share and e-scooter coverage in central areas, with patchy availability elsewhere.' },
  japan: { name: 'Japan', availabilityLevel: 'rare', note: 'Bike-share exists in a handful of cities (Tokyo\'s Docomo Bike Share among them), and e-scooters are only recently legal with real restrictions — public transit remains the practical default.' },
  thailand: { name: 'Thailand', availabilityLevel: 'rare', note: 'Organized bike/scooter-share apps are limited — traditional motorbike and bicycle rental shops are the practical option, common in tourist areas.' },
  indonesia: { name: 'Indonesia', availabilityLevel: 'rare', note: "Gojek and Grab offer motorbike-taxi rides rather than self-ride bike/scooter share — organized rental programs are limited outside a few tourist areas in Bali." },
  singapore: { name: 'Singapore', availabilityLevel: 'limited', note: 'Bike-share (Anywheel and others) is genuinely widespread, but e-scooters are heavily regulated — restricted to designated paths, not general roads or sidewalks.' },
  'south-korea': { name: 'South Korea', availabilityLevel: 'widespread', note: "Seoul's public bike-share (Ttareungyi) and e-scooter apps (Kakao T, Lime) are easy to use and genuinely popular with tourists." },
  'hong-kong': { name: 'Hong Kong', availabilityLevel: 'rare', note: "Hilly terrain and dense traffic mean organized bike/scooter-share is limited — public transit remains the practical default." },
  vietnam: { name: 'Vietnam', availabilityLevel: 'rare', note: "Grab's motorbike-taxi service is the dominant self-transport option — organized bike/scooter-share apps are limited." },
  philippines: { name: 'Philippines', availabilityLevel: 'rare', note: 'Organized bike/scooter-share apps are limited — traditional motorbike and bicycle rental shops are the practical option in tourist areas.' },
  malaysia: { name: 'Malaysia', availabilityLevel: 'limited', note: 'Kuala Lumpur has some bike-share and e-scooter coverage in the city center, with patchy availability elsewhere.' },
  china: { name: 'China', availabilityLevel: 'widespread', note: "Bike-share (Meituan, Hellobike) is genuinely massive in Chinese cities — the practical catch is that apps typically require a Chinese phone number, which can be a real barrier for short-term visitors." },
  india: { name: 'India', availabilityLevel: 'rare', note: "Organized bike/scooter-share exists only in a handful of pilot cities — traffic conditions in most cities also make self-riding a genuinely more demanding option than elsewhere." },
  maldives: { name: 'Maldives', availabilityLevel: 'rare', note: 'The resort-island format means there\'s little need for or availability of bike/scooter-share — most resorts are walkable or offer their own bikes.' },
  taiwan: { name: 'Taiwan', availabilityLevel: 'widespread', note: "Taipei's YouBike system is extensive, cheap, and genuinely easy for tourists to use with a foreign card." },
  'sri-lanka': { name: 'Sri Lanka', availabilityLevel: 'rare', note: 'Organized bike/scooter-share apps are limited — traditional motorbike and bicycle rental shops are the practical option.' },
  cambodia: { name: 'Cambodia', availabilityLevel: 'rare', note: 'Organized bike/scooter-share apps are limited — traditional bicycle and motorbike rental shops are the practical option in tourist areas like Siem Reap.' },
  australia: { name: 'Australia', availabilityLevel: 'limited', note: 'Melbourne and Sydney have some bike-share and e-scooter coverage, with real variation by city and even by suburb — check what\'s currently operating before relying on one.' },
  'new-zealand': { name: 'New Zealand', availabilityLevel: 'limited', note: 'Auckland and Wellington have e-scooter apps (Lime among them) in central areas, with coverage thinning outside the main urban core.' },
  fiji: { name: 'Fiji', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — resorts may offer their own bikes for guests.' },
  'french-polynesia': { name: 'French Polynesia', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — some resorts and guesthouses offer bicycle rental directly.' },
  mexico: { name: 'Mexico', availabilityLevel: 'limited', note: "Mexico City's Ecobici bike-share and e-scooter apps cover the main tourist areas well, with coverage thinning outside them." },
  'dominican-republic': { name: 'Dominican Republic', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent outside some resort properties offering their own bikes.' },
  'puerto-rico': { name: 'Puerto Rico', availabilityLevel: 'limited', note: 'San Juan has some e-scooter coverage in tourist areas — availability outside the main tourist zone is limited.' },
  bahamas: { name: 'Bahamas', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — some resorts offer their own bikes for guests.' },
  jamaica: { name: 'Jamaica', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops are the practical option near resort areas.' },
  aruba: { name: 'Aruba', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops near resort areas are the practical option.' },
  'turks-and-caicos': { name: 'Turks and Caicos', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops near resort areas are the practical option.' },
  'st-lucia': { name: 'St. Lucia', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops near resort areas are the practical option.' },
  'costa-rica': { name: 'Costa Rica', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional bicycle rental shops are common in tourist towns.' },
  panama: { name: 'Panama', availabilityLevel: 'rare', note: 'Organized bike/scooter-share apps are limited in Panama City — traditional rental shops are the practical option.' },
  belize: { name: 'Belize', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional bicycle rental is common and practical on the cayes.' },
  'cayman-islands': { name: 'Cayman Islands', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops are the practical option.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops near resort areas are the practical option.' },
  curacao: { name: 'Curaçao', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional rental shops are the practical option in Willemstad.' },
  canada: { name: 'Canada', availabilityLevel: 'limited', note: "Toronto and Montreal have well-established bike-share (Bike Share Toronto, BIXI) — coverage and e-scooter legality vary a lot by city." },
  'united-arab-emirates': { name: 'United Arab Emirates', availabilityLevel: 'limited', note: 'Dubai has bike-share (Careem Bike) and e-scooter apps — the climate makes them practical mainly outside the peak summer heat.' },
  morocco: { name: 'Morocco', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — medina streets are largely impractical for cycling anyway.' },
  'south-africa': { name: 'South Africa', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — traditional bicycle rental (common for wine-region and coastal tours) is the practical option.' },
  qatar: { name: 'Qatar', availabilityLevel: 'limited', note: "Doha built out cycling and e-scooter infrastructure around the 2022 World Cup — coverage is real but concentrated in specific areas." },
  israel: { name: 'Israel', availabilityLevel: 'widespread', note: "Tel Aviv has genuinely extensive bike-share (Tel-O-Fun) and e-scooter culture — scooters in particular are a normal, heavily used way to get around the city." },
  tanzania: { name: 'Tanzania', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — most visits center on safari or coastal areas where it isn\'t the relevant transport mode anyway.' },
  kenya: { name: 'Kenya', availabilityLevel: 'rare', note: 'Organized bike/scooter-share is essentially nonexistent — most visits center on safari areas where it isn\'t the relevant transport mode anyway.' },
  argentina: { name: 'Argentina', availabilityLevel: 'widespread', note: "Buenos Aires's EcoBici bike-share is extensive and free for short trips, with an app-based system that works reasonably well for visitors." },
  peru: { name: 'Peru', availabilityLevel: 'rare', note: "Organized bike/scooter-share apps are limited — Lima's traffic also makes self-riding a genuinely more demanding option than elsewhere." },
  chile: { name: 'Chile', availabilityLevel: 'limited', note: 'Santiago has some bike-share coverage in central and eastern neighborhoods, with patchy availability elsewhere.' },
  colombia: { name: 'Colombia', availabilityLevel: 'limited', note: "Bogotá has strong cycling infrastructure and a Sunday car-free Ciclovía tradition, plus some bike-share — e-scooter apps are also present in the main tourist areas." },
  brazil: { name: 'Brazil', availabilityLevel: 'limited', note: 'Rio de Janeiro and São Paulo both have bike-share (Bike Itaú) covering the main tourist and business areas.' },
  'united-states': { name: 'United States', availabilityLevel: 'limited', note: "Coverage varies enormously by city — New York's Citi Bike is extensive and tourist-friendly, but most other US cities have patchy or no bike/scooter-share at all." },
};

const AVAILABILITY_LABELS = {
  widespread: 'Widespread — Easy App-Based Rentals',
  limited: 'Limited — Available in Major Cities Only',
  rare: 'Rare — Traditional Rental Shops Only',
  restricted: 'Restricted — E-Scooters Banned or Heavily Limited',
};

const DISCLAIMER = "Bike-share and e-scooter programs change fast — operators enter and exit cities, and local regulations on e-scooters specifically shift often. This reflects the general landscape, not a live status check — search for what's currently operating in your specific city before you rely on one.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const availabilityLabel = AVAILABILITY_LABELS[data.availabilityLevel];
  const headline = `${data.name}: ${availabilityLabel}.`;

  return {
    country, countryName: data.name, availabilityLevel: data.availabilityLevel, availabilityLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/bike-scooter-checker/calculate
// @access Public
exports.calculateBikeScooter = (req, res) => {
  try {
    const { country } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/bike-scooter-checker/pdf
// @access Public
exports.generateBikeScooterPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, country } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'bike-scooter-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Bike & E-Scooter Rental Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bike-scooter-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.availabilityLabel);

    pdfService.heading(doc, 'General bike/scooter rental tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Search the App Store/Play Store for "[city name] bike share" or "[city name] scooter" shortly before your trip — operators change too fast for any static list to stay current.',
      'Most apps require a credit card and sometimes a local phone number for SMS verification — a few (notably in China) are genuinely difficult to use without one.',
      'Always check locally where riding is actually legal — sidewalk riding is banned in many cities even where scooter rental itself is legal, and rules are enforced with real fines in some places.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛴 Your ${result.countryName} bike & scooter rental guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the bike & e-scooter check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond getting around town? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send bike-scooter-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateBikeScooterPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
