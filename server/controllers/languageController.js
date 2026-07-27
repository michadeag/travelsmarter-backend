const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// English proficiency and local language per country, reused from Tool
// #3's country list. englishLevel: 'very_high' | 'high' | 'moderate' | 'low'.
const COUNTRIES = {
  france: { name: 'France', language: 'French', englishLevel: 'moderate', note: "Widely spoken in Paris and tourist areas, less consistent in rural regions — a few French phrases go a long way and are genuinely appreciated." },
  austria: { name: 'Austria', language: 'German', englishLevel: 'high', note: 'Widely spoken, especially among younger people and in Vienna and tourist areas.' },
  'czech-republic': { name: 'Czech Republic', language: 'Czech', englishLevel: 'high', note: 'Common among younger people in Prague and tourist areas, less consistent with older generations.' },
  denmark: { name: 'Denmark', language: 'Danish', englishLevel: 'very_high', note: 'One of the highest English proficiency levels in the world — nearly universal, even outside tourist areas.' },
  germany: { name: 'Germany', language: 'German', englishLevel: 'high', note: 'Widely spoken, especially in cities and among younger people, though rural areas can be more limited.' },
  greece: { name: 'Greece', language: 'Greek', englishLevel: 'moderate', note: 'Common in Athens, the islands, and tourist areas, less consistent inland and with older generations.' },
  hungary: { name: 'Hungary', language: 'Hungarian', englishLevel: 'moderate', note: 'Common in Budapest and tourist areas, less consistent elsewhere.' },
  iceland: { name: 'Iceland', language: 'Icelandic', englishLevel: 'very_high', note: 'Near-universal English proficiency — you can get by comfortably almost anywhere on the island.' },
  italy: { name: 'Italy', language: 'Italian', englishLevel: 'moderate', note: 'Common in major cities and tourist areas, but lower than you might expect for Western Europe outside those zones.' },
  netherlands: { name: 'Netherlands', language: 'Dutch', englishLevel: 'very_high', note: 'Consistently ranked among the best non-native English speakers in the world — nearly everyone you meet will speak it fluently.' },
  portugal: { name: 'Portugal', language: 'Portuguese', englishLevel: 'high', note: 'Widely spoken in Lisbon, Porto, and tourist areas, especially among younger people.' },
  spain: { name: 'Spain', language: 'Spanish', englishLevel: 'moderate', note: 'Common in major cities and coastal tourist areas, less consistent inland — a little Spanish helps a lot.' },
  sweden: { name: 'Sweden', language: 'Swedish', englishLevel: 'very_high', note: 'Near-universal English proficiency — you can get by comfortably almost anywhere.' },
  switzerland: { name: 'Switzerland', language: 'German, French, and Italian (regional)', englishLevel: 'high', note: 'Widely spoken across all language regions, especially in cities and tourist areas.' },
  ireland: { name: 'Ireland', language: 'English (with Irish as a co-official language)', englishLevel: 'very_high', note: "English is the primary everyday language — no language barrier to plan for at all." },
  'united-kingdom': { name: 'United Kingdom', language: 'English', englishLevel: 'very_high', note: "English is the native language — no language barrier to plan for at all." },
  turkey: { name: 'Turkey', language: 'Turkish', englishLevel: 'moderate', note: 'Common in Istanbul and tourist resort areas, much less consistent elsewhere — a translation app is handy outside the main cities.' },
  japan: { name: 'Japan', language: 'Japanese', englishLevel: 'low', note: 'Despite heavy English education, spoken English is limited — signage in major cities and train stations is usually bilingual, but a translation app is genuinely useful.' },
  thailand: { name: 'Thailand', language: 'Thai', englishLevel: 'moderate', note: 'Reasonably common in Bangkok and tourist resort areas, much more limited elsewhere.' },
  indonesia: { name: 'Indonesia', language: 'Indonesian', englishLevel: 'low', note: 'Limited outside Bali\'s main tourist areas — a translation app is genuinely useful elsewhere in the country.' },
  singapore: { name: 'Singapore', language: 'English (one of four official languages)', englishLevel: 'very_high', note: 'English is an official language and the primary language of business — no language barrier to plan for.' },
  'south-korea': { name: 'South Korea', language: 'Korean', englishLevel: 'moderate', note: 'Common among younger people in Seoul, less consistent with older generations and outside major cities.' },
  'hong-kong': { name: 'Hong Kong', language: 'Cantonese (with English widely used in business)', englishLevel: 'high', note: 'Widely spoken as a legacy of British rule, especially in business and tourist areas.' },
  vietnam: { name: 'Vietnam', language: 'Vietnamese', englishLevel: 'moderate', note: 'Improving quickly among younger people and in tourist areas, but still limited in rural regions.' },
  philippines: { name: 'Philippines', language: 'Filipino and English (both official)', englishLevel: 'very_high', note: 'English is an official language and widely spoken nationwide — no significant language barrier to plan for.' },
  malaysia: { name: 'Malaysia', language: 'Malay', englishLevel: 'high', note: 'Widely spoken as a legacy of British colonial history, especially in Kuala Lumpur and tourist areas.' },
  china: { name: 'China', language: 'Mandarin', englishLevel: 'low', note: 'Limited outside major hotels and international business settings — a translation app is genuinely useful, and it\'s worth learning a few basic phrases.' },
  india: { name: 'India', language: 'Hindi and many regional languages', englishLevel: 'high', note: 'Widely used in business, education, and by anyone in the tourism industry — though English fluency varies significantly by region and by individual.' },
  maldives: { name: 'Maldives', language: 'Dhivehi', englishLevel: 'high', note: 'Resort and tourism staff speak excellent English — a language barrier is unlikely to come up.' },
  taiwan: { name: 'Taiwan', language: 'Mandarin', englishLevel: 'moderate', note: 'Common in Taipei and among younger people, less consistent elsewhere.' },
  'sri-lanka': { name: 'Sri Lanka', language: 'Sinhala and Tamil', englishLevel: 'moderate', note: 'A legacy of British colonial rule keeps English reasonably common, especially in tourist areas.' },
  cambodia: { name: 'Cambodia', language: 'Khmer', englishLevel: 'moderate', note: 'Reasonably common in Siem Reap and Phnom Penh\'s tourist areas, much more limited in rural regions.' },
  australia: { name: 'Australia', language: 'English', englishLevel: 'very_high', note: "English is the native language — no language barrier to plan for at all." },
  'new-zealand': { name: 'New Zealand', language: 'English', englishLevel: 'very_high', note: "English is the native language — no language barrier to plan for at all." },
  fiji: { name: 'Fiji', language: 'Fijian and English (both official)', englishLevel: 'high', note: 'English is an official language and widely used in tourism and daily life.' },
  'french-polynesia': { name: 'French Polynesia', language: 'French and Tahitian', englishLevel: 'moderate', note: 'Resort staff generally speak good English, but French is the more useful second language outside tourist zones.' },
  mexico: { name: 'Mexico', language: 'Spanish', englishLevel: 'moderate', note: 'Common in resort areas, Mexico City, and border cities, much less consistent elsewhere — a little Spanish goes a long way.' },
  'dominican-republic': { name: 'Dominican Republic', language: 'Spanish', englishLevel: 'moderate', note: 'Common at resorts and in tourist zones, much more limited outside them.' },
  'puerto-rico': { name: 'Puerto Rico', language: 'Spanish (with English widely spoken)', englishLevel: 'high', note: 'As a US territory, English is common, especially in San Juan and tourist areas, though Spanish is the everyday language.' },
  bahamas: { name: 'Bahamas', language: 'English', englishLevel: 'very_high', note: "English is the official and everyday language — no language barrier to plan for." },
  jamaica: { name: 'Jamaica', language: 'English (with Jamaican Patois widely spoken)', englishLevel: 'very_high', note: "English is the official language — no significant language barrier, though the local Patois can take a moment to tune your ear to." },
  aruba: { name: 'Aruba', language: 'Dutch and Papiamento', englishLevel: 'high', note: 'English is widely spoken throughout the island, especially in tourist areas.' },
  'turks-and-caicos': { name: 'Turks and Caicos', language: 'English', englishLevel: 'very_high', note: "English is the official and everyday language — no language barrier to plan for." },
  'st-lucia': { name: 'St. Lucia', language: 'English (with St. Lucian Creole widely spoken)', englishLevel: 'high', note: 'English is the official language and used throughout tourism and daily life.' },
  'costa-rica': { name: 'Costa Rica', language: 'Spanish', englishLevel: 'moderate', note: 'Common in tourist areas and among younger people, less consistent in rural regions.' },
  panama: { name: 'Panama', language: 'Spanish', englishLevel: 'moderate', note: "English is more common than in many Latin American neighbors, a legacy of the US-run Canal Zone era, especially in Panama City." },
  belize: { name: 'Belize', language: 'English', englishLevel: 'very_high', note: "English is the official language — the only English-speaking country in Central America, with no significant language barrier." },
  'cayman-islands': { name: 'Cayman Islands', language: 'English', englishLevel: 'very_high', note: "English is the official and everyday language — no language barrier to plan for." },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', language: 'English', englishLevel: 'very_high', note: "English is the official and everyday language — no language barrier to plan for." },
  curacao: { name: 'Curaçao', language: 'Dutch and Papiamento', englishLevel: 'high', note: 'English is widely spoken throughout the island, especially in tourist areas.' },
  canada: { name: 'Canada', language: 'English and French (regional)', englishLevel: 'very_high', note: "English is widely spoken nationwide (French is dominant in Quebec) — no significant language barrier to plan for." },
  'united-arab-emirates': { name: 'United Arab Emirates', language: 'Arabic', englishLevel: 'high', note: "English functions as the de facto business and expat lingua franca in Dubai and Abu Dhabi — no significant language barrier." },
  morocco: { name: 'Morocco', language: 'Arabic and Berber (with French widely used)', englishLevel: 'moderate', note: 'French is far more useful than English outside major tourist zones, though English is increasingly common with younger people in cities.' },
  'south-africa': { name: 'South Africa', language: 'English (one of 11 official languages)', englishLevel: 'high', note: 'English is widely spoken and understood nationwide, even though it\'s a first language for a minority of the population.' },
  qatar: { name: 'Qatar', language: 'Arabic', englishLevel: 'high', note: 'English functions as the de facto business and expat lingua franca in Doha — no significant language barrier.' },
  israel: { name: 'Israel', language: 'Hebrew', englishLevel: 'high', note: 'Widely spoken, especially by younger people and in Tel Aviv and tourist areas.' },
  tanzania: { name: 'Tanzania', language: 'Swahili (with English as a co-official language)', englishLevel: 'moderate', note: 'Common in tourism, safari, and business settings, but Swahili dominates daily life outside those contexts.' },
  kenya: { name: 'Kenya', language: 'Swahili (with English as a co-official language)', englishLevel: 'high', note: 'English is an official language and widely used in business, education, and tourism.' },
  argentina: { name: 'Argentina', language: 'Spanish', englishLevel: 'moderate', note: 'Common in Buenos Aires and tourist areas, less consistent elsewhere — a little Spanish goes a long way.' },
  peru: { name: 'Peru', language: 'Spanish', englishLevel: 'moderate', note: 'Common in Lima and Cusco\'s tourist areas, much more limited in rural regions.' },
  chile: { name: 'Chile', language: 'Spanish', englishLevel: 'moderate', note: 'Common in Santiago and tourist areas, less consistent elsewhere.' },
  colombia: { name: 'Colombia', language: 'Spanish', englishLevel: 'moderate', note: 'Improving quickly in Bogotá and Medellín, but still limited outside major cities and tourist zones.' },
  brazil: { name: 'Brazil', language: 'Portuguese', englishLevel: 'moderate', note: 'Notably less common than in Spanish-speaking South American neighbors — tourist areas and upscale hotels are the exception, not the rule.' },
};

const LEVEL_LABELS = {
  very_high: 'English is spoken virtually everywhere',
  high: 'English is widely spoken, especially in cities and tourist areas',
  moderate: 'English gets you by in tourist areas, but is inconsistent elsewhere',
  low: 'English is limited — a translation app is genuinely useful',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}: primary language is ${data.language} — ${LEVEL_LABELS[data.englishLevel]}.`;

  return {
    country, countryName: data.name, language: data.language,
    englishLevel: data.englishLevel, englishLevelLabel: LEVEL_LABELS[data.englishLevel],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/language-checker/calculate
// @access Public
exports.calculateLanguage = (req, res) => {
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
// @route POST /api/tools/language-checker/pdf
// @access Public
exports.generateLanguagePdf = async (req, res) => {
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
      [email, firstName || null, 'language-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Language & English Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="language-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Local language: ${result.language}`);

    pdfService.heading(doc, 'Before you land');
    pdfService.bulletList(doc, [
      'Download an offline translation app (like Google Translate\'s offline language pack) before you fly — data can be unreliable right when you need it most.',
      'Learn five words in the local language: hello, please, thank you, excuse me, and the check please — locals notice and appreciate the effort everywhere.',
      'Screenshot your hotel address and a few key phrases in the local script if it\'s not Latin-alphabet — showing a screen is often faster than trying to pronounce it.',
      'Google Translate\'s camera mode can instantly translate menus and signs — a lifesaver in lower-English-proficiency destinations.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🗣️ Your ${result.countryName} language guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your language check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the language barrier? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send language-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLanguagePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
