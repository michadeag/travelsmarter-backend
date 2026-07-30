const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Air quality orientation per destination — typical/baseline pollution
// level, not a live reading. Distinct from uvIndexController.js (sun
// exposure/skin), waterController.js (drinking water), healthController.js
// (malaria/vaccines), and naturalDisasterController.js (seasonal disaster
// risk) — this is specifically about what's in the air, which matters for
// travelers with asthma, allergies, contact lenses, or planned outdoor
// activity. aqiLevel: 'good' (consistently clean air) | 'moderate'
// (real but generally manageable pollution, often seasonal or localized)
// | 'unhealthy' (well-documented, frequently poor air quality — sensitive
// groups should take real precautions).
const COUNTRIES = {
  france: { name: 'France', aqiLevel: 'good', note: 'Air quality is generally good nationwide, with occasional traffic-related pollution spikes in Paris on hot, windless days.' },
  austria: { name: 'Austria', aqiLevel: 'good', note: 'Air quality is consistently good, including in Vienna.' },
  'czech-republic': { name: 'Czech Republic', aqiLevel: 'good', note: 'Air quality is generally good, though Prague can see occasional winter smog from heating and traffic.' },
  denmark: { name: 'Denmark', aqiLevel: 'good', note: 'Air quality is consistently among the best in Europe.' },
  germany: { name: 'Germany', aqiLevel: 'good', note: 'Air quality is generally good nationwide, with only minor traffic-related pollution in larger cities.' },
  greece: { name: 'Greece', aqiLevel: 'good', note: 'Air quality is generally good, with occasional Saharan dust events bringing a temporary haze in spring.' },
  hungary: { name: 'Hungary', aqiLevel: 'good', note: 'Air quality is generally good, though Budapest can see occasional winter inversions that trap traffic pollution.' },
  iceland: { name: 'Iceland', aqiLevel: 'good', note: "Air quality is excellent almost everywhere, thanks to low population density and clean geothermal/hydro energy — volcanic gas events near active eruptions are the rare exception." },
  italy: { name: 'Italy', aqiLevel: 'moderate', note: "The Po Valley (Milan, Turin, and the surrounding north) has some of Europe's worst air quality due to geography that traps pollution — the rest of the country is generally good." },
  netherlands: { name: 'Netherlands', aqiLevel: 'good', note: 'Air quality is generally good nationwide.' },
  portugal: { name: 'Portugal', aqiLevel: 'good', note: 'Air quality is generally good, with occasional wildfire smoke in summer in rural areas.' },
  spain: { name: 'Spain', aqiLevel: 'good', note: 'Air quality is generally good, with occasional Saharan dust events bringing a temporary haze, especially in the south.' },
  sweden: { name: 'Sweden', aqiLevel: 'good', note: 'Air quality is consistently among the best in Europe.' },
  switzerland: { name: 'Switzerland', aqiLevel: 'good', note: 'Air quality is consistently good nationwide.' },
  ireland: { name: 'Ireland', aqiLevel: 'good', note: 'Air quality is generally good nationwide.' },
  'united-kingdom': { name: 'United Kingdom', aqiLevel: 'good', note: 'Air quality is generally good, with occasional traffic-related pollution episodes in central London on still days.' },
  turkey: { name: 'Turkey', aqiLevel: 'moderate', note: "Istanbul's heavy traffic and winter heating create real, regularly elevated pollution levels — the Aegean and Mediterranean coasts are notably cleaner." },
  japan: { name: 'Japan', aqiLevel: 'good', note: 'Air quality is generally good, though some spring days bring elevated PM2.5 and yellow dust drifting from the Asian mainland.' },
  thailand: { name: 'Thailand', aqiLevel: 'moderate', note: "Northern Thailand (Chiang Mai especially) sees genuinely unhealthy smoke from agricultural burning roughly February-April — Bangkok has moderate year-round traffic pollution, while the southern islands are much cleaner." },
  indonesia: { name: 'Indonesia', aqiLevel: 'unhealthy', note: 'Jakarta has some of the worst urban air quality in Southeast Asia year-round, and seasonal wildfire/land-clearing haze (roughly July-October) can affect large parts of Sumatra and Kalimantan — Bali is generally much cleaner.' },
  singapore: { name: 'Singapore', aqiLevel: 'moderate', note: 'Normally good air quality, but regional wildfire haze drifting from Sumatra (roughly July-October) can push the index into unhealthy territory for days at a time.' },
  'south-korea': { name: 'South Korea', aqiLevel: 'moderate', note: "Seoul and other cities see genuinely elevated PM2.5 on many days, especially in late winter and spring from a mix of local traffic and dust/pollution drifting from China — checking the daily index before outdoor plans is common local practice." },
  'hong-kong': { name: 'Hong Kong', aqiLevel: 'moderate', note: 'Dense traffic and regional pollution produce real, regularly elevated readings, though conditions improve noticeably on windier days.' },
  vietnam: { name: 'Vietnam', aqiLevel: 'unhealthy', note: 'Hanoi has some of the worst air quality in Southeast Asia, especially in the dry season (roughly October-April) — Ho Chi Minh City and coastal areas are somewhat better but still frequently elevated.' },
  philippines: { name: 'Philippines', aqiLevel: 'moderate', note: "Manila's heavy traffic produces genuinely elevated pollution most days — the outer islands and beach destinations are generally much cleaner." },
  malaysia: { name: 'Malaysia', aqiLevel: 'moderate', note: 'Normally moderate urban air quality, but regional wildfire haze (roughly July-October, tied to Sumatra fires) can push conditions into unhealthy territory for days at a time.' },
  china: { name: 'China', aqiLevel: 'unhealthy', note: "Major cities, especially in the north (Beijing) and industrial regions, see frequent, well-documented unhealthy air quality days, particularly in winter — southern cities and rural areas are generally better, but checking the daily index is standard practice." },
  india: { name: 'India', aqiLevel: 'unhealthy', note: "Delhi and much of northern India see some of the worst air quality in the world, especially in winter (roughly November-January, worsened by crop burning) — this is a genuine health concern for travelers with respiratory conditions, and southern/coastal India is generally cleaner." },
  maldives: { name: 'Maldives', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  taiwan: { name: 'Taiwan', aqiLevel: 'moderate', note: 'Western cities can see elevated pollution in winter from a mix of local traffic and regional dust — the east coast and mountains are notably cleaner.' },
  'sri-lanka': { name: 'Sri Lanka', aqiLevel: 'moderate', note: "Colombo's traffic produces moderate, regularly elevated pollution — the rest of the country is generally much cleaner." },
  cambodia: { name: 'Cambodia', aqiLevel: 'moderate', note: "Phnom Penh sees moderate pollution from traffic and dust, worse in the dry season (roughly November-April) — Siem Reap and rural areas are generally cleaner." },
  australia: { name: 'Australia', aqiLevel: 'moderate', note: "Air quality is normally excellent, but bushfire smoke (roughly November-March, worst in recent record years) can push cities like Sydney and Canberra into genuinely unhealthy territory for days at a time." },
  'new-zealand': { name: 'New Zealand', aqiLevel: 'good', note: 'Air quality is consistently excellent nationwide.' },
  fiji: { name: 'Fiji', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  'french-polynesia': { name: 'French Polynesia', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  mexico: { name: 'Mexico', aqiLevel: 'unhealthy', note: "Mexico City's altitude and surrounding mountains trap pollution, producing frequently unhealthy readings, especially in the dry season (roughly December-May) — coastal and resort areas are generally much cleaner." },
  'dominican-republic': { name: 'Dominican Republic', aqiLevel: 'good', note: 'Air quality is generally good, especially at resort and beach areas away from Santo Domingo traffic.' },
  'puerto-rico': { name: 'Puerto Rico', aqiLevel: 'good', note: 'Air quality is generally good, with occasional Saharan dust events bringing a temporary summer haze.' },
  bahamas: { name: 'Bahamas', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  jamaica: { name: 'Jamaica', aqiLevel: 'good', note: 'Air quality is generally good, especially at resort and beach areas away from Kingston traffic.' },
  aruba: { name: 'Aruba', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  'turks-and-caicos': { name: 'Turks and Caicos', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  'st-lucia': { name: 'St. Lucia', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  'costa-rica': { name: 'Costa Rica', aqiLevel: 'good', note: 'Air quality is generally good nationwide, including San José.' },
  panama: { name: 'Panama', aqiLevel: 'good', note: 'Air quality is generally good, with mild traffic-related pollution in Panama City on still days.' },
  belize: { name: 'Belize', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  'cayman-islands': { name: 'Cayman Islands', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', aqiLevel: 'good', note: 'Air quality is consistently excellent, with no significant local pollution sources.' },
  curacao: { name: 'Curaçao', aqiLevel: 'good', note: 'Air quality is generally good, with mild industrial influence near Willemstad on some days.' },
  canada: { name: 'Canada', aqiLevel: 'moderate', note: "Air quality is normally excellent, but wildfire smoke (roughly June-September, worst in recent record years) can push large regions — including cities far from the fires themselves — into genuinely unhealthy territory for days at a time." },
  'united-arab-emirates': { name: 'United Arab Emirates', aqiLevel: 'moderate', note: 'Dust storms (more frequent in summer) and urban/industrial pollution produce regularly elevated readings in Dubai and Abu Dhabi.' },
  morocco: { name: 'Morocco', aqiLevel: 'moderate', note: "Casablanca and other cities see moderate traffic-related pollution — coastal and desert areas are generally cleaner." },
  'south-africa': { name: 'South Africa', aqiLevel: 'moderate', note: "Johannesburg and the industrial Highveld region see moderate, sometimes elevated pollution, especially in winter — Cape Town and coastal areas are generally cleaner." },
  qatar: { name: 'Qatar', aqiLevel: 'moderate', note: 'Dust storms (more frequent in summer) and urban/industrial pollution produce regularly elevated readings in Doha.' },
  israel: { name: 'Israel', aqiLevel: 'good', note: 'Air quality is generally good, with occasional Saharan/desert dust events bringing a temporary haze.' },
  tanzania: { name: 'Tanzania', aqiLevel: 'good', note: 'Air quality is generally good, including Zanzibar and the coast — Dar es Salaam has mild traffic-related pollution.' },
  kenya: { name: 'Kenya', aqiLevel: 'moderate', note: "Nairobi's traffic produces moderate, regularly elevated pollution — safari and coastal areas are generally much cleaner." },
  argentina: { name: 'Argentina', aqiLevel: 'good', note: 'Air quality is generally good, including Buenos Aires.' },
  peru: { name: 'Peru', aqiLevel: 'moderate', note: "Lima's coastal fog traps traffic pollution for much of the year, producing moderate, regularly elevated readings — Cusco and the Andes are generally much cleaner." },
  chile: { name: 'Chile', aqiLevel: 'moderate', note: "Santiago's surrounding mountains trap wintertime wood-smoke and traffic pollution, a well-documented seasonal problem (roughly May-August) — the rest of the country is generally clean." },
  colombia: { name: 'Colombia', aqiLevel: 'moderate', note: "Bogotá's altitude and traffic produce moderate, regularly elevated pollution — Cartagena and coastal areas are generally cleaner." },
  brazil: { name: 'Brazil', aqiLevel: 'moderate', note: "São Paulo's traffic produces moderate, regularly elevated pollution, and Amazon wildfire/burning season (roughly August-October) can bring smoke haze to large parts of the country — Rio and coastal areas are generally better." },
  'united-states': { name: 'United States', aqiLevel: 'good', note: 'Air quality is generally good nationwide, though wildfire smoke (roughly June-September, worst in the West) can bring temporary unhealthy spikes even in cities far from the fires themselves.' },
};

const AQI_LABELS = {
  good: 'Good — Consistently Clean Air',
  moderate: 'Moderate — Real, Often Seasonal Pollution',
  unhealthy: 'Unhealthy — Significant, Well-Documented Air Pollution',
};

const DISCLAIMER = "This reflects typical/baseline conditions, not a live reading — actual air quality varies day to day with weather, season, and wildfire or burning activity. If you have asthma, allergies, or another respiratory condition, check a real-time index (like IQAir or AirVisual) for your specific destination before travel, and pack a mask if the level is elevated.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const aqiLabel = AQI_LABELS[data.aqiLevel];
  const headline = `${data.name}: ${aqiLabel}.`;

  return {
    country, countryName: data.name, aqiLevel: data.aqiLevel, aqiLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/air-quality-checker/calculate
// @access Public
exports.calculateAirQuality = (req, res) => {
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
// @route POST /api/tools/air-quality-checker/pdf
// @access Public
exports.generateAirQualityPdf = async (req, res) => {
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
      [email, firstName || null, 'air-quality-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Air Quality Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="air-quality-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.aqiLabel);

    pdfService.heading(doc, 'General air quality tips for travelers');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If you have asthma or allergies, bring your regular medication plus a rescue inhaler if prescribed — pharmacies abroad may not stock the exact brand you use.',
      'An N95 or KN95 mask is a compact, effective precaution on days when the local index is elevated.',
      'Indoor spaces with air conditioning or filtration (malls, hotels, some cafes) are a reasonable refuge on high-pollution days if outdoor plans need to change.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🌫️ Your ${result.countryName} air quality guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the air quality check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond air quality? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send air-quality-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAirQualityPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
