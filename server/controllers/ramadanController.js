const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// How much Ramadan actually disrupts a tourist trip to each destination —
// distinct from holidaySeasonController.js, which covers general
// crowd/closure disruption around major holidays broadly. This is
// specific to the one recurring annual period (dates shift each year on
// the lunar calendar) that meaningfully changes daily life in
// Muslim-majority destinations: shortened restaurant/business hours,
// restrictions on eating or drinking in public during daylight, and
// reduced alcohol availability. impactLevel: 'minimal' (no meaningful
// impact on general tourism) | 'moderate' (a real effect, but mostly
// confined to non-tourist areas, or resort zones remain largely
// unaffected) | 'major' (a significant, widely-documented change to the
// daytime tourist experience outside international hotels).
const COUNTRIES = {
  france: { name: 'France', impactLevel: 'minimal', note: 'No meaningful impact on general tourism — France is not a Muslim-majority country, so daily life for visitors is unaffected.' },
  austria: { name: 'Austria', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'czech-republic': { name: 'Czech Republic', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  denmark: { name: 'Denmark', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  germany: { name: 'Germany', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  greece: { name: 'Greece', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  hungary: { name: 'Hungary', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  iceland: { name: 'Iceland', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  italy: { name: 'Italy', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  netherlands: { name: 'Netherlands', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  portugal: { name: 'Portugal', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  spain: { name: 'Spain', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  sweden: { name: 'Sweden', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  switzerland: { name: 'Switzerland', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  ireland: { name: 'Ireland', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'united-kingdom': { name: 'United Kingdom', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  turkey: { name: 'Turkey', impactLevel: 'moderate', note: "Istanbul's main tourist areas stay largely normal, with most restaurants open, but many local eateries outside those areas close or shift to evening-only hours during daylight fasting, and public celebration/nightlife can feel more subdued during the month." },
  japan: { name: 'Japan', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  thailand: { name: 'Thailand', impactLevel: 'minimal', note: 'No meaningful impact on general tourism nationally — the small Muslim-majority southern provinces see local effects, but the standard tourist circuit is unaffected.' },
  indonesia: { name: 'Indonesia', impactLevel: 'moderate', note: "Java, Sumatra, and other Muslim-majority islands see real changes — many local restaurants close or shorten hours during the day, and some regions restrict public eating. Hindu-majority Bali, the most-visited island, is largely unaffected." },
  singapore: { name: 'Singapore', impactLevel: 'minimal', note: "No meaningful impact on general tourism — Singapore's sizeable Muslim community observes Ramadan, but daily life for visitors continues as normal, and the Ramadan night markets are actually a notable seasonal attraction." },
  'south-korea': { name: 'South Korea', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'hong-kong': { name: 'Hong Kong', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  vietnam: { name: 'Vietnam', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  philippines: { name: 'Philippines', impactLevel: 'minimal', note: 'No meaningful impact on general tourism nationally — the Muslim-majority Mindanao region sees local effects, but the standard tourist circuit is unaffected.' },
  malaysia: { name: 'Malaysia', impactLevel: 'moderate', note: "Kuala Lumpur's main tourist areas and hotels operate close to normal, but many local restaurants close or shift to evening-only hours during the day, especially in more conservative states — Ramadan night markets are a well-known seasonal highlight in the evenings." },
  china: { name: 'China', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  india: { name: 'India', impactLevel: 'minimal', note: 'No meaningful impact on general tourism nationally — India has a large Muslim population, but the standard tourist circuit is largely unaffected day to day.' },
  maldives: { name: 'Maldives', impactLevel: 'moderate', note: "Maldivian resorts catering to international tourists generally continue serving food and drinks normally on private islands, but the capital Malé and local islands see real changes — restaurants closed during the day and alcohol unavailable outside resorts." },
  taiwan: { name: 'Taiwan', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'sri-lanka': { name: 'Sri Lanka', impactLevel: 'minimal', note: 'No meaningful impact on general tourism nationally — Sri Lanka has a Muslim minority, but the standard tourist circuit is largely unaffected.' },
  cambodia: { name: 'Cambodia', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  australia: { name: 'Australia', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'new-zealand': { name: 'New Zealand', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  fiji: { name: 'Fiji', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'french-polynesia': { name: 'French Polynesia', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  mexico: { name: 'Mexico', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'dominican-republic': { name: 'Dominican Republic', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'puerto-rico': { name: 'Puerto Rico', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  bahamas: { name: 'Bahamas', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  jamaica: { name: 'Jamaica', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  aruba: { name: 'Aruba', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'turks-and-caicos': { name: 'Turks and Caicos', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'st-lucia': { name: 'St. Lucia', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'costa-rica': { name: 'Costa Rica', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  panama: { name: 'Panama', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  belize: { name: 'Belize', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'cayman-islands': { name: 'Cayman Islands', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  curacao: { name: 'Curaçao', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  canada: { name: 'Canada', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'united-arab-emirates': { name: 'United Arab Emirates', impactLevel: 'moderate', note: "The UAE relaxed its once-strict public daytime eating rules in recent years, and most restaurants now stay open (often with partitions) during the day. Alcohol sales and service are more restricted than usual, and going out late at night is common since many locals shift their schedule around the fast." },
  morocco: { name: 'Morocco', impactLevel: 'major', note: "Ramadan meaningfully changes daily life in Morocco's medinas — many local restaurants and cafes close during daylight hours, and eating, drinking, or smoking in public during the day is culturally discouraged and can draw real disapproval outside tourist hotels. International hotels and riads still serve tourists, but street food and casual dining are much harder to find until sunset (iftar), when the atmosphere becomes notably festive." },
  'south-africa': { name: 'South Africa', impactLevel: 'minimal', note: 'No meaningful impact on general tourism — South Africa has a Muslim minority, but daily life for visitors continues as normal.' },
  qatar: { name: 'Qatar', impactLevel: 'moderate', note: "Doha's restaurants and hotels generally continue serving tourists, often behind screens or partitions during the day, but public eating, drinking, and smoking outside those settings is restricted by law during daylight hours, and alcohol sales are further limited than usual." },
  israel: { name: 'Israel', impactLevel: 'minimal', note: "No meaningful impact on general tourism nationally — Israel's Muslim communities observe Ramadan, particularly noticeable in East Jerusalem and Arab-majority areas, but it doesn't broadly affect the standard tourist circuit." },
  tanzania: { name: 'Tanzania', impactLevel: 'moderate', note: "Zanzibar and the Swahili coast have a Muslim-majority population, and many local restaurants there shift hours or close during the day — mainland safari areas and international hotels are largely unaffected." },
  kenya: { name: 'Kenya', impactLevel: 'moderate', note: "Coastal areas like Mombasa and Lamu have a significant Muslim population, and many local restaurants there shift hours or close during the day — inland safari areas and international hotels are largely unaffected." },
  argentina: { name: 'Argentina', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  peru: { name: 'Peru', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  chile: { name: 'Chile', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  colombia: { name: 'Colombia', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  brazil: { name: 'Brazil', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
  'united-states': { name: 'United States', impactLevel: 'minimal', note: 'No meaningful impact on general tourism.' },
};

const IMPACT_LABELS = {
  minimal: 'Minimal Impact — Not a Factor',
  moderate: 'Moderate Impact — Real But Localized',
  major: 'Major Impact — Plan Around It',
};

const DISCLAIMER = "Ramadan dates shift about 10-11 days earlier each year on the Gregorian calendar, since it follows the lunar Islamic calendar — always confirm the exact dates for your travel year before you plan around it, and note that Eid al-Fitr, the multi-day celebration immediately after Ramadan ends, can bring its own separate crowds and closures.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const impactLabel = IMPACT_LABELS[data.impactLevel];
  const headline = `${data.name}: ${impactLabel}.`;

  return {
    country, countryName: data.name, impactLevel: data.impactLevel, impactLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/ramadan-checker/calculate
// @access Public
exports.calculateRamadan = (req, res) => {
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
// @route POST /api/tools/ramadan-checker/pdf
// @access Public
exports.generateRamadanPdf = async (req, res) => {
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
      [email, firstName || null, 'ramadan-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Ramadan Travel Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ramadan-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.impactLabel);

    pdfService.heading(doc, "If you're traveling during Ramadan");
    pdfService.bulletList(doc, [
      result.disclaimer,
      'International hotels and tourist-oriented restaurants almost always continue serving food and drinks to visitors, even where local establishments close.',
      'Evenings are often the best time to experience local culture — iftar (the meal breaking the fast) and the hours after are typically festive, with special foods, markets, and extended opening hours.',
      "As a visitor, it's respectful to avoid eating, drinking, or smoking in public during daylight hours in more conservative areas, even where it's not strictly against the law.",
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🌙 Your ${result.countryName} Ramadan travel guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the Ramadan travel check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond timing your trip right? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send ramadan-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateRamadanPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
