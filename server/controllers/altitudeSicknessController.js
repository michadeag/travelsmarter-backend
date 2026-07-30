const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Altitude sickness risk per destination — whether popular tourist spots
// sit high enough to cause symptoms. Distinct from healthController.js
// (malaria/vaccines/yellow fever), airQualityController.js (pollution),
// and naturalDisasterController.js (seasonal disaster hazards) — this is
// specifically about elevation, which most travelers never think to check
// until they're short of breath and headachy on day one in Cusco or
// Bogotá. riskLevel: 'none' (essentially sea level throughout) | 'low'
// (a specific high-elevation spot exists, but most visitors won't go
// there) | 'moderate' (a major, commonly visited city or region sits
// high enough that mild symptoms are common) | 'high' (a well-known,
// frequently visited destination sits high enough that real altitude
// sickness — not just mild discomfort — is a documented risk).
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'none', note: 'Paris and the vast majority of tourist destinations are at low elevation — no altitude concern for typical visits.' },
  austria: { name: 'Austria', riskLevel: 'low', note: "Vienna and Salzburg are low elevation, but Alpine ski resorts and cable-car viewpoints (like Kitzsteinhorn, over 3,000m) can cause mild symptoms if you go up quickly without acclimatizing." },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'none', note: 'Prague and the rest of the country are at low elevation — no altitude concern for typical visits.' },
  denmark: { name: 'Denmark', riskLevel: 'none', note: 'Denmark is essentially flat and at sea level throughout — no altitude concern.' },
  germany: { name: 'Germany', riskLevel: 'none', note: "Most of Germany is low elevation; the Zugspitze summit (nearly 3,000m) is reached by cable car and can cause mild, brief symptoms in sensitive people, but it's not a real concern for most visitors." },
  greece: { name: 'Greece', riskLevel: 'none', note: 'Athens and the islands are at low elevation — no altitude concern for typical visits.' },
  hungary: { name: 'Hungary', riskLevel: 'none', note: 'Budapest and the rest of the country are at low elevation — no altitude concern.' },
  iceland: { name: 'Iceland', riskLevel: 'none', note: 'Reykjavík and most visited sites are at low elevation — no altitude concern for typical visits.' },
  italy: { name: 'Italy', riskLevel: 'low', note: "Rome, Florence, and Venice are low elevation, but Alpine destinations (Dolomites cable cars, ski resorts over 3,000m) can cause mild symptoms if you ascend quickly." },
  netherlands: { name: 'Netherlands', riskLevel: 'none', note: 'The Netherlands is essentially at or below sea level throughout — no altitude concern.' },
  portugal: { name: 'Portugal', riskLevel: 'none', note: 'Lisbon, Porto, and most of the country are at low elevation — no altitude concern for typical visits.' },
  spain: { name: 'Spain', riskLevel: 'low', note: "Madrid and Barcelona are low elevation, but Sierra Nevada ski resorts and Mount Teide in the Canary Islands (over 3,700m) can cause mild symptoms if you go up quickly." },
  sweden: { name: 'Sweden', riskLevel: 'none', note: 'Stockholm and the rest of the country are at low elevation — no altitude concern.' },
  switzerland: { name: 'Switzerland', riskLevel: 'moderate', note: "Zurich and Geneva are low elevation, but classic tourist destinations like Jungfraujoch and other high Alpine viewpoints (over 3,000-3,500m, reached quickly by train or cable car) commonly cause mild altitude symptoms — headache and shortness of breath are common if you don't pace yourself." },
  ireland: { name: 'Ireland', riskLevel: 'none', note: 'Ireland has no significant elevation — no altitude concern.' },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'none', note: 'The UK has no significant elevation relevant to tourists — no altitude concern.' },
  turkey: { name: 'Turkey', riskLevel: 'low', note: "Istanbul and the coast are low elevation; Cappadocia sits around 1,000-1,300m (mild at most), and only climbing Mount Ararat itself involves real altitude exposure." },
  japan: { name: 'Japan', riskLevel: 'low', note: "Tokyo, Kyoto, and Osaka are low elevation — the exception is Mount Fuji (3,776m), where altitude sickness is a genuine, documented risk for the roughly 300,000 people who climb it each year." },
  thailand: { name: 'Thailand', riskLevel: 'none', note: 'Bangkok, the beaches, and even the mountainous north (Chiang Mai) are all at low enough elevation that altitude sickness is not a concern.' },
  indonesia: { name: 'Indonesia', riskLevel: 'low', note: 'Bali\'s resort areas and most of Indonesia are low elevation — volcano treks (Rinjani, over 3,700m; Bromo) can cause mild symptoms for climbers who ascend too quickly.' },
  singapore: { name: 'Singapore', riskLevel: 'none', note: 'Singapore is entirely low elevation — no altitude concern.' },
  'south-korea': { name: 'South Korea', riskLevel: 'none', note: 'Seoul and most tourist destinations are at low elevation — no altitude concern.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'none', note: 'Hong Kong\'s highest points are modest — no real altitude concern.' },
  vietnam: { name: 'Vietnam', riskLevel: 'low', note: 'Hanoi, Ho Chi Minh City, and most destinations are low elevation — Sapa and Fansipan (Indochina\'s highest peak, over 3,000m) can cause mild symptoms for trekkers who go up too fast.' },
  philippines: { name: 'Philippines', riskLevel: 'none', note: 'Manila, the beaches, and most tourist destinations are at low elevation — no real altitude concern.' },
  malaysia: { name: 'Malaysia', riskLevel: 'low', note: 'Kuala Lumpur and most destinations are low elevation — climbing Mount Kinabalu (over 4,000m) is a genuine, documented altitude sickness risk for trekkers.' },
  china: { name: 'China', riskLevel: 'moderate', note: "Beijing, Shanghai, and most tourist cities are low elevation, but Tibet and Lhasa (around 3,650m) are a well-documented, commonly visited high-altitude destination where mild-to-moderate symptoms are common — acclimatization time is genuinely important there." },
  india: { name: 'India', riskLevel: 'moderate', note: "Delhi, Mumbai, and most of India are low elevation, but Ladakh/Leh (around 3,500m) and Himalayan trekking regions are well-documented, commonly visited high-altitude destinations where symptoms are common without acclimatization time." },
  maldives: { name: 'Maldives', riskLevel: 'none', note: 'The Maldives is entirely at sea level — no altitude concern whatsoever.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', note: 'Taipei and most destinations are low elevation — Taroko Gorge\'s high trails and Yushan (Taiwan\'s highest peak, nearly 4,000m) can cause mild symptoms for hikers who ascend quickly.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'none', note: "Sri Lanka's hill country (including Ella and Nuwara Eliya) tops out at modest elevation — no real altitude concern for typical visits." },
  cambodia: { name: 'Cambodia', riskLevel: 'none', note: 'Cambodia is low elevation throughout — no altitude concern.' },
  australia: { name: 'Australia', riskLevel: 'none', note: "Australia's highest peak (Kosciuszko, just over 2,200m) is modest by world standards — no real altitude concern for typical visits." },
  'new-zealand': { name: 'New Zealand', riskLevel: 'low', note: "Auckland, Wellington, and most destinations are low elevation — Southern Alps hiking and some ski areas can cause mild symptoms for those who ascend quickly." },
  fiji: { name: 'Fiji', riskLevel: 'none', note: 'Fiji is low elevation throughout — no altitude concern.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'none', note: 'French Polynesia is low elevation throughout — no altitude concern.' },
  mexico: { name: 'Mexico', riskLevel: 'moderate', note: "Cancún and coastal resorts are sea level, but Mexico City sits at roughly 2,240m — mild symptoms (headache, fatigue, shortness of breath) are common for the first day or two, and Puebla and Toluca sit even higher." },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'none', note: 'Resort areas and most tourist destinations are low elevation — no real altitude concern.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'none', note: 'San Juan and most tourist destinations are low elevation — no real altitude concern.' },
  bahamas: { name: 'Bahamas', riskLevel: 'none', note: 'The Bahamas is low, flat, and at sea level throughout — no altitude concern.' },
  jamaica: { name: 'Jamaica', riskLevel: 'none', note: 'Kingston and resort areas are low elevation — the Blue Mountains are modest and pose no real altitude concern.' },
  aruba: { name: 'Aruba', riskLevel: 'none', note: 'Aruba is low and flat throughout — no altitude concern.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'none', note: 'Turks and Caicos is low and flat throughout — no altitude concern.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'none', note: 'Resort areas are low elevation — the Pitons are modest and pose no real altitude concern for typical visitors.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'low', note: "San José and the Central Valley sit around 1,170m — usually unnoticeable, though sensitive travelers may feel mildly winded; volcano hikes go somewhat higher." },
  panama: { name: 'Panama', riskLevel: 'none', note: 'Panama City and most tourist destinations are low elevation — the highland coffee regions (like Boquete) are moderate at most, with no real altitude concern.' },
  belize: { name: 'Belize', riskLevel: 'none', note: 'Belize is low elevation throughout — no altitude concern.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'none', note: 'The Cayman Islands are low and flat throughout — no altitude concern.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'none', note: 'Antigua and Barbuda are low elevation throughout — no altitude concern.' },
  curacao: { name: 'Curaçao', riskLevel: 'none', note: 'Curaçao is low elevation throughout — no altitude concern.' },
  canada: { name: 'Canada', riskLevel: 'low', note: 'Toronto, Vancouver, and most cities are low elevation — Banff, the Rockies, and some ski resorts sit high enough to cause mild symptoms for those who ascend quickly.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'none', note: 'Dubai and Abu Dhabi are at low elevation — no altitude concern.' },
  morocco: { name: 'Morocco', riskLevel: 'low', note: 'Marrakech and the coast are low-to-moderate elevation — trekking Mount Toubkal (over 4,000m) in the Atlas Mountains is a genuine altitude sickness risk for climbers.' },
  'south-africa': { name: 'South Africa', riskLevel: 'low', note: 'Cape Town is low elevation; Johannesburg sits around 1,750m, which can cause mild breathlessness for a day or two, and the Drakensberg mountains go higher still for hikers.' },
  qatar: { name: 'Qatar', riskLevel: 'none', note: 'Qatar is low and flat throughout — no altitude concern.' },
  israel: { name: 'Israel', riskLevel: 'none', note: 'Tel Aviv, Jerusalem, and most destinations are low-to-moderate elevation — no real altitude concern for typical visits.' },
  tanzania: { name: 'Tanzania', riskLevel: 'high', note: "Zanzibar and the coast are sea level, but Mount Kilimanjaro (5,895m) is one of the most-climbed high-altitude destinations in the world, and altitude sickness is a well-documented, serious risk for climbers who ascend too quickly — the Ngorongoro Highlands also sit at real elevation." },
  kenya: { name: 'Kenya', riskLevel: 'moderate', note: "Mombasa and the coast are sea level, but Nairobi sits around 1,795m (commonly causing mild symptoms for a day or two), and Mount Kenya climbers face genuine, well-documented altitude sickness risk." },
  argentina: { name: 'Argentina', riskLevel: 'moderate', note: "Buenos Aires is sea level, but Mendoza's wine region and especially the northern Andes (Salta, Jujuy, over 3,000-4,000m) are commonly visited high-altitude destinations where symptoms are common — Aconcagua climbers face serious, well-documented risk." },
  peru: { name: 'Peru', riskLevel: 'high', note: "Lima is sea level, but Cusco (3,400m) and the Sacred Valley — the gateway to Machu Picchu, visited by millions — sit high enough that altitude sickness is a well-documented, common experience for travelers who don't acclimatize; Lake Titicaca (3,800m) is even higher." },
  chile: { name: 'Chile', riskLevel: 'moderate', note: "Santiago sits at a modest 520m, but San Pedro de Atacama and the surrounding high plains (commonly visited on day trips over 4,000m) are a well-documented altitude sickness destination — pace yourself on arrival." },
  colombia: { name: 'Colombia', riskLevel: 'moderate', note: "Cartagena and the coast are sea level, but Bogotá sits around 2,640m — mild symptoms (headache, fatigue, shortness of breath) are common for the first day or two after arrival." },
  brazil: { name: 'Brazil', riskLevel: 'none', note: 'Rio, São Paulo, and most of Brazil are at low-to-moderate elevation — no real altitude concern for typical visits.' },
  'united-states': { name: 'United States', riskLevel: 'low', note: "Most major cities are low elevation, but Denver (over 1,600m) and mountain destinations like Lake Tahoe, Aspen, and the Rockies commonly cause mild, brief symptoms for visitors who don't pace themselves on arrival." },
};

const RISK_LABELS = {
  none: 'None — Essentially Sea Level',
  low: 'Low — One High-Elevation Spot, Most Visitors Won\'t Go There',
  moderate: 'Moderate — A Popular Destination Sits High Enough to Matter',
  high: 'High — A Major, Frequently Visited Destination Carries Real Risk',
};

const DISCLAIMER = "This reflects the elevation of popular tourist destinations, not a medical assessment — individual susceptibility to altitude sickness varies a lot and isn't predicted by fitness level. If you're headed somewhere moderate or high risk, ascend gradually where possible, stay hydrated, avoid alcohol on arrival day, and talk to a travel clinic about preventive medication (like acetazolamide) if you have a history of altitude symptoms.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const riskLabel = RISK_LABELS[data.riskLevel];
  const headline = `${data.name}: ${riskLabel}.`;

  return {
    country, countryName: data.name, riskLevel: data.riskLevel, riskLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/altitude-sickness-checker/calculate
// @access Public
exports.calculateAltitudeSickness = (req, res) => {
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
// @route POST /api/tools/altitude-sickness-checker/pdf
// @access Public
exports.generateAltitudeSicknessPdf = async (req, res) => {
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
      [email, firstName || null, 'altitude-sickness-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Altitude Sickness Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="altitude-sickness-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.riskLabel);

    pdfService.heading(doc, 'General altitude sickness prevention tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Ascend gradually where possible — "climb high, sleep low" is a well-known rule for multi-day treks.',
      'Drink more water than usual and avoid alcohol on your first day at elevation.',
      'Take it easy for the first 24-48 hours — mild headache, fatigue, or shortness of breath usually resolve with rest and acclimatization.',
      'Seek medical attention if symptoms are severe or worsening (confusion, difficulty walking, severe shortness of breath at rest) — this can signal a medical emergency.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `⛰️ Your ${result.countryName} altitude sickness guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the altitude sickness check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond altitude sickness? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send altitude-sickness-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAltitudeSicknessPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
