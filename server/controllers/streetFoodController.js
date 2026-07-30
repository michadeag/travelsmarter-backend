const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Street food / food-borne illness risk orientation per destination —
// distinct from waterController.js (drinking water), halalFoodController.js
// and kosherFoodController.js (dietary *availability*, not safety), and
// healthController.js (malaria/vaccines/yellow fever, not food-borne
// illness). This is specifically about how much caution street food and
// food stalls warrant, and whether the local street food culture is a
// genuine highlight worth seeking out. riskLevel: 'low' (high hygiene
// standards, minimal caution needed) | 'moderate' (a real, well-known
// street food culture — generally safe from busy stalls, but caution
// pays off) | 'high' (well-documented, elevated risk of food-borne
// illness — extra care warranted, especially for sensitive stomachs).
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'low', note: 'High food safety standards nationwide — markets, food trucks, and crêpe stands are all generally very safe.' },
  austria: { name: 'Austria', riskLevel: 'low', note: 'High food safety standards nationwide — Christmas markets and Würstelstand food stalls are all generally very safe.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'low', note: 'High food safety standards nationwide — market and street food stalls are generally very safe.' },
  denmark: { name: 'Denmark', riskLevel: 'low', note: 'High food safety standards nationwide — street food markets (like Copenhagen Street Food) are generally very safe.' },
  germany: { name: 'Germany', riskLevel: 'low', note: 'High food safety standards nationwide — Christmas markets, currywurst stands, and food trucks are all generally very safe.' },
  greece: { name: 'Greece', riskLevel: 'low', note: 'High food safety standards nationwide — souvlaki and gyro stands are generally very safe.' },
  hungary: { name: 'Hungary', riskLevel: 'low', note: 'High food safety standards nationwide — market halls and street food stalls are generally very safe.' },
  iceland: { name: 'Iceland', riskLevel: 'low', note: 'High food safety standards nationwide — hot dog stands and street food are generally very safe.' },
  italy: { name: 'Italy', riskLevel: 'low', note: 'High food safety standards nationwide — street food (arancini, pizza al taglio, supplì) is a genuine highlight and generally very safe.' },
  netherlands: { name: 'Netherlands', riskLevel: 'low', note: 'High food safety standards nationwide — herring stands and market food are generally very safe.' },
  portugal: { name: 'Portugal', riskLevel: 'low', note: 'High food safety standards nationwide — market and street food stalls are generally very safe.' },
  spain: { name: 'Spain', riskLevel: 'low', note: 'High food safety standards nationwide — market and tapas-bar street food is generally very safe.' },
  sweden: { name: 'Sweden', riskLevel: 'low', note: 'High food safety standards nationwide — street food markets are generally very safe.' },
  switzerland: { name: 'Switzerland', riskLevel: 'low', note: 'High food safety standards nationwide — market and street food stalls are generally very safe.' },
  ireland: { name: 'Ireland', riskLevel: 'low', note: 'High food safety standards nationwide — market and street food stalls are generally very safe.' },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'low', note: 'High food safety standards nationwide — market and street food stalls (Borough Market and similar) are generally very safe.' },
  turkey: { name: 'Turkey', riskLevel: 'moderate', note: 'A genuinely vibrant street food culture (simit, döner, balık ekmek) that\'s generally safe from busy, high-turnover stalls — stick to vendors with a visible crowd of locals.' },
  japan: { name: 'Japan', riskLevel: 'low', note: 'Extremely high hygiene standards — festival food stalls and street food (takoyaki, yakitori) are a genuine highlight and very safe.' },
  thailand: { name: 'Thailand', riskLevel: 'moderate', note: 'World-famous street food that\'s generally safe when you follow the busy-stall rule (high turnover means fresher ingredients) — be more cautious with pre-cut fruit and ice from less trafficked vendors.' },
  indonesia: { name: 'Indonesia', riskLevel: 'high', note: 'Street food (especially warungs and market stalls outside major tourist areas) carries a genuinely elevated risk of food-borne illness — stick to busy, well-reviewed stalls and be cautious with raw vegetables and ice.' },
  singapore: { name: 'Singapore', riskLevel: 'low', note: 'Hawker centers are government-regulated and inspected — genuinely one of the safest and best street food scenes in the world, and a must-try.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', note: 'High hygiene standards — street food markets (like Gwangjang Market) are a genuine highlight and very safe.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', note: 'High hygiene standards — dai pai dong stalls and street food are generally very safe.' },
  vietnam: { name: 'Vietnam', riskLevel: 'moderate', note: 'An iconic, generally safe street food culture (phở, bánh mì) when you follow the busy-stall rule — be more cautious with raw herbs, ice, and tap water used in drinks from less trafficked vendors.' },
  philippines: { name: 'Philippines', riskLevel: 'moderate', note: 'A genuine street food culture that\'s generally safe from busy, high-turnover stalls in tourist areas — more caution is warranted away from Manila and major resort areas.' },
  malaysia: { name: 'Malaysia', riskLevel: 'low', note: 'Hawker center culture is well-regulated and a genuine highlight — generally very safe, especially at established, busy stalls.' },
  china: { name: 'China', riskLevel: 'moderate', note: 'Major-city night markets are generally safe and a genuine highlight — hygiene standards vary more in smaller cities and rural areas, so stick to busy, visibly popular stalls.' },
  india: { name: 'India', riskLevel: 'high', note: 'Street food (chaat, vendor stalls) is a beloved, genuine highlight but carries a well-documented, elevated risk of food-borne illness for travelers — stick to busy stalls with high turnover, avoid raw vegetables and ice, and ease in gradually if it\'s your first visit.' },
  maldives: { name: 'Maldives', riskLevel: 'low', note: 'Limited traditional street food scene — most food is resort-based and generally very safe.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', note: 'Night markets (Shilin, Raohe, and others) are a genuine highlight with high hygiene standards — generally very safe.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', note: 'A real street food culture (kottu, hoppers) that\'s generally safe from busy stalls — more caution is warranted away from Colombo and major tourist areas.' },
  cambodia: { name: 'Cambodia', riskLevel: 'moderate', note: 'Market and street food stalls are generally safe when busy and popular with locals — more caution is warranted outside Phnom Penh and Siem Reap.' },
  australia: { name: 'Australia', riskLevel: 'low', note: 'High food safety standards nationwide — food trucks and market stalls are generally very safe.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'low', note: 'High food safety standards nationwide — food trucks and market stalls are generally very safe.' },
  fiji: { name: 'Fiji', riskLevel: 'low', note: 'Limited traditional street food scene — most food is resort-based and generally very safe.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'low', note: 'Roulottes (food trucks) in Papeete are a genuine highlight with generally high hygiene standards.' },
  mexico: { name: 'Mexico', riskLevel: 'moderate', note: 'World-class street food (tacos al pastor, elotes) that\'s generally safe from busy, high-turnover stands — the classic "traveler\'s stomach" risk comes more from unwashed produce and tap water than the meat itself, so follow the busy-stall rule.' },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'moderate', note: 'Street food stalls outside resort areas are generally safe when busy and popular with locals — more caution is warranted away from tourist zones.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'low', note: 'US food safety standards apply — street food (like at Piñones) is a genuine highlight and generally very safe.' },
  bahamas: { name: 'Bahamas', riskLevel: 'low', note: 'High food safety standards, especially at fish fry stands and resort areas — generally very safe.' },
  jamaica: { name: 'Jamaica', riskLevel: 'moderate', note: 'Jerk stands and roadside food are a genuine highlight, generally safe when busy — more caution is warranted away from resort and tourist areas.' },
  aruba: { name: 'Aruba', riskLevel: 'low', note: 'High food safety standards — food trucks and market stalls are generally very safe.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'low', note: 'High food safety standards, especially near resort areas — generally very safe.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'low', note: 'High food safety standards near resort and tourist areas — generally very safe.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'low', note: 'Generally good food safety standards — sodas (local eateries) and market food are generally safe.' },
  panama: { name: 'Panama', riskLevel: 'moderate', note: 'Market and street food stalls in Panama City are generally safe when busy — more caution is warranted in rural areas.' },
  belize: { name: 'Belize', riskLevel: 'moderate', note: 'Street food and market stalls are generally safe when busy and popular with locals — more caution is warranted outside main towns.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'low', note: 'High food safety standards — generally very safe.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'low', note: 'High food safety standards near resort and tourist areas — generally very safe.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', note: 'High food safety standards — street food markets are generally very safe.' },
  canada: { name: 'Canada', riskLevel: 'low', note: 'High food safety standards nationwide — food trucks and market stalls are generally very safe.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'low', note: 'High food safety standards — food trucks and market stalls in Dubai and Abu Dhabi are generally very safe.' },
  morocco: { name: 'Morocco', riskLevel: 'moderate', note: 'Medina food stalls (tagine, msemen) are a genuine highlight, generally safe when busy and popular with locals — more caution pays off with pre-made salads and juices.' },
  'south-africa': { name: 'South Africa', riskLevel: 'low', note: 'Generally good food safety standards — braai stands and market food are generally safe in major cities and tourist areas.' },
  qatar: { name: 'Qatar', riskLevel: 'low', note: 'High food safety standards — Souq Waqif food stalls are generally very safe.' },
  israel: { name: 'Israel', riskLevel: 'low', note: 'High food safety standards — market and street food stalls (shuk food, falafel stands) are a genuine highlight and generally very safe.' },
  tanzania: { name: 'Tanzania', riskLevel: 'moderate', note: 'Street food (like at Zanzibar\'s Forodhani Gardens) is a genuine highlight, generally safe when busy — more caution is warranted away from main tourist areas.' },
  kenya: { name: 'Kenya', riskLevel: 'moderate', note: 'Street food and market stalls in Nairobi and Mombasa are generally safe when busy and popular with locals — more caution is warranted in less touristy areas.' },
  argentina: { name: 'Argentina', riskLevel: 'low', note: 'Generally good food safety standards — choripán stands and market food are generally safe.' },
  peru: { name: 'Peru', riskLevel: 'moderate', note: 'A genuinely excellent street food and market culture (anticuchos, ceviche stands) that\'s generally safe from busy stalls — ceviche specifically is best from vendors with high turnover and visible freshness.' },
  chile: { name: 'Chile', riskLevel: 'low', note: 'Generally good food safety standards — market and street food stalls are generally safe.' },
  colombia: { name: 'Colombia', riskLevel: 'moderate', note: 'Street food (arepas, empanadas) is a genuine highlight, generally safe when busy and popular with locals — more caution is warranted away from Bogotá and Cartagena\'s main areas.' },
  brazil: { name: 'Brazil', riskLevel: 'moderate', note: 'Street food (pastéis, açaí stands) is a genuine highlight, generally safe when busy — more caution is warranted with pre-cut fruit and less trafficked vendors.' },
  'united-states': { name: 'United States', riskLevel: 'low', note: 'Food truck and street vendor regulation is generally strict — very safe nationwide.' },
};

const RISK_LABELS = {
  low: 'Low Risk — High Hygiene Standards',
  moderate: 'Moderate — Generally Safe, Worth Some Caution',
  high: 'High — Elevated Food-Borne Illness Risk',
};

const DISCLAIMER = "This is general orientation, not a guarantee — individual stalls vary enormously, and even in low-risk destinations, unlucky exposure can happen. The busy-stall rule (eat where locals are lining up) is the single best predictor of safety almost everywhere, regardless of the country's overall risk level.";

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
// @route POST /api/tools/street-food-checker/calculate
// @access Public
exports.calculateStreetFood = (req, res) => {
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
// @route POST /api/tools/street-food-checker/pdf
// @access Public
exports.generateStreetFoodPdf = async (req, res) => {
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
      [email, firstName || null, 'street-food-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Street Food Safety Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="street-food-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.riskLabel);

    pdfService.heading(doc, 'Universal street food safety habits');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Eat where there\'s a visible line of locals — high turnover means fresher ingredients and less time for bacteria to grow.',
      'Watch food being cooked fresh in front of you rather than sitting out, especially meat and seafood.',
      'Be cautious with pre-cut fruit, raw vegetables, and ice unless you know the source — these are the most common culprits, not the cooked food itself.',
      'Carry an anti-diarrheal medication and hand sanitizer as a simple backup, even in low-risk destinations.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍜 Your ${result.countryName} street food safety guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the street food safety check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond street food? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send street-food-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateStreetFoodPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
