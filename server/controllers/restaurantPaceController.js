const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Restaurant pacing norms per destination — how unhurried dining is, and
// specifically whether the check gets brought unprompted or you have to
// ask for it. Distinct from restaurantReservationController.js (whether
// you need to book ahead, not how the meal itself unfolds) and
// soloDiningController.js (eating alone, not table turnover speed).
// paceLevel: 'leisurely' (meals are unhurried by design — the check is
// essentially never brought unprompted, you have to actively ask, and
// asking early can come across as rushing your host) | 'relaxed' (a
// noticeably slower pace than fast-food culture, though the check comes
// reasonably promptly once you ask) | 'moderate' (standard Western pace —
// the check typically comes once staff notice you've finished, without a
// long wait either way) | 'brisk' (fast turnover is the norm, especially
// at casual spots — the check is often brought proactively, and lingering
// long after finishing can be gently discouraged).
const COUNTRIES = {
  france: { name: 'France', paceLevel: 'leisurely', note: 'Meals are unhurried by design, especially dinner — the check is essentially never brought unprompted. Ask for "l\'addition, s\'il vous plaît" when you\'re ready; it won\'t appear on its own.' },
  austria: { name: 'Austria', paceLevel: 'relaxed', note: "Vienna's coffee house culture in particular allows lingering for hours over a single coffee — the check comes once you ask, not before." },
  'czech-republic': { name: 'Czech Republic', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  denmark: { name: 'Denmark', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  germany: { name: 'Germany', paceLevel: 'moderate', note: "Service is efficient without being rushed — the check comes once you ask or staff notice you're done, without a long wait either way." },
  greece: { name: 'Greece', paceLevel: 'leisurely', note: 'Greek dining is genuinely unhurried, especially at tavernas — meals stretch on comfortably, and you\'ll need to actively ask for the check when ready.' },
  hungary: { name: 'Hungary', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  iceland: { name: 'Iceland', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  italy: { name: 'Italy', paceLevel: 'leisurely', note: 'Meals, especially dinner, are unhurried by design — the check ("il conto") is essentially never brought unprompted, since doing so is considered rushing the guest.' },
  netherlands: { name: 'Netherlands', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  portugal: { name: 'Portugal', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  spain: { name: 'Spain', paceLevel: 'leisurely', note: 'Spanish dinners run famously late and long — the check ("la cuenta") is essentially never brought unprompted, so ask when you\'re ready.' },
  sweden: { name: 'Sweden', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  switzerland: { name: 'Switzerland', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, efficient pace." },
  ireland: { name: 'Ireland', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  'united-kingdom': { name: 'United Kingdom', paceLevel: 'moderate', note: "The check typically comes once you ask or staff notice you've finished, at a standard pace." },
  turkey: { name: 'Turkey', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace, especially with meze — the check comes once you ask, not before.' },
  japan: { name: 'Japan', paceLevel: 'brisk', note: "Service is efficient and prompt — the check is often placed on the table with the meal or handled at a register on your way out, and long lingering after finishing isn't the norm at casual spots." },
  thailand: { name: 'Thailand', paceLevel: 'moderate', note: "The check typically comes once you ask, at a relaxed but not slow pace." },
  indonesia: { name: 'Indonesia', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  singapore: { name: 'Singapore', paceLevel: 'brisk', note: 'Hawker centers in particular run on fast turnover — payment is often upfront or immediate, and lingering long after finishing isn\'t the norm during busy periods.' },
  'south-korea': { name: 'South Korea', paceLevel: 'brisk', note: 'Service is efficient and quick — payment is often made at a register near the entrance, and fast table turnover is the norm at casual spots.' },
  'hong-kong': { name: 'Hong Kong', paceLevel: 'brisk', note: "Dining, especially at cha chaan teng (casual diners), runs at a genuinely fast pace — quick turnover is expected and the bill is often placed on the table shortly after your order arrives." },
  vietnam: { name: 'Vietnam', paceLevel: 'brisk', note: 'Street food and casual dining run at a fast, efficient pace — quick turnover is the norm, and payment is typically straightforward and prompt.' },
  philippines: { name: 'Philippines', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  malaysia: { name: 'Malaysia', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, unhurried pace." },
  china: { name: 'China', paceLevel: 'moderate', note: "The check typically comes once you ask, and can often be settled directly at the table via a mobile payment app scan." },
  india: { name: 'India', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace, especially for a full sit-down meal — the check comes once you ask, not before.' },
  maldives: { name: 'Maldives', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, often built around a set multi-course experience — there\'s rarely a reason to ask for the check quickly.' },
  taiwan: { name: 'Taiwan', paceLevel: 'brisk', note: 'Night market and casual dining culture runs at a fast, efficient pace — quick turnover is the norm and payment is typically straightforward.' },
  'sri-lanka': { name: 'Sri Lanka', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  cambodia: { name: 'Cambodia', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  australia: { name: 'Australia', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  'new-zealand': { name: 'New Zealand', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  fiji: { name: 'Fiji', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace — there\'s rarely a reason to ask for the check quickly.' },
  'french-polynesia': { name: 'French Polynesia', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace — there\'s rarely a reason to ask for the check quickly.' },
  mexico: { name: 'Mexico', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask ("la cuenta, por favor"), not before.' },
  'dominican-republic': { name: 'Dominican Republic', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design — there\'s rarely a reason to ask for the check quickly.' },
  'puerto-rico': { name: 'Puerto Rico', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, relaxed pace." },
  bahamas: { name: 'Bahamas', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace.' },
  jamaica: { name: 'Jamaica', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  aruba: { name: 'Aruba', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace.' },
  'turks-and-caicos': { name: 'Turks and Caicos', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace.' },
  'st-lucia': { name: 'St. Lucia', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace.' },
  'costa-rica': { name: 'Costa Rica', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried "pura vida" pace — the check comes once you ask, not before.' },
  panama: { name: 'Panama', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, relaxed pace." },
  belize: { name: 'Belize', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  'cayman-islands': { name: 'Cayman Islands', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, relaxed pace." },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', paceLevel: 'leisurely', note: 'Resort dining is unhurried by design, in keeping with the general island pace.' },
  curacao: { name: 'Curaçao', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  canada: { name: 'Canada', paceLevel: 'moderate', note: "The check typically comes once staff notice you've finished, at a standard, unhurried pace." },
  'united-arab-emirates': { name: 'United Arab Emirates', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, unhurried pace." },
  morocco: { name: 'Morocco', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace, especially with mint tea and multiple courses — the check comes once you ask, not before.' },
  'south-africa': { name: 'South Africa', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, unhurried pace." },
  qatar: { name: 'Qatar', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, unhurried pace." },
  israel: { name: 'Israel', paceLevel: 'brisk', note: "Service tends to be direct and efficient — the check is often brought fairly promptly once staff notice you're finishing, reflecting the broader culture's directness." },
  tanzania: { name: 'Tanzania', paceLevel: 'leisurely', note: 'Safari lodge dining runs on an unhurried, set schedule rather than an à la carte pace — there\'s no real concept of asking for the check quickly.' },
  kenya: { name: 'Kenya', paceLevel: 'leisurely', note: 'Safari lodge dining runs on an unhurried, set schedule rather than an à la carte pace — there\'s no real concept of asking for the check quickly.' },
  argentina: { name: 'Argentina', paceLevel: 'leisurely', note: 'Dinners run famously late and long, especially around a shared parrilla (grill) meal — the check is essentially never brought unprompted.' },
  peru: { name: 'Peru', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  chile: { name: 'Chile', paceLevel: 'moderate', note: "The check typically comes once you ask, at a standard, unhurried pace." },
  colombia: { name: 'Colombia', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace — the check comes once you ask, not before.' },
  brazil: { name: 'Brazil', paceLevel: 'relaxed', note: 'Meals run at a noticeably unhurried pace, especially at churrascarias — the check comes once you ask, not before.' },
  'united-states': { name: 'United States', paceLevel: 'brisk', note: "Fast table turnover is the norm, especially at casual chains — the check is often brought proactively once your meal is served or shortly after you finish, without you needing to ask." },
};

const PACE_LABELS = {
  leisurely: 'Leisurely — Ask for the Check, It Won\'t Come Unprompted',
  relaxed: 'Relaxed — Slower Pace, No Rush',
  moderate: 'Moderate — Standard Pace, Check Comes When You\'re Done',
  brisk: 'Brisk — Fast Turnover Is the Norm',
};

const DISCLAIMER = "This reflects general norms across everyday dining, not every restaurant — high-end fine dining tends to be more leisurely everywhere, and fast-casual/counter-service spots tend to be brisker everywhere, regardless of the destination's overall reputation.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const paceLabel = PACE_LABELS[data.paceLevel];
  const headline = `${data.name}: ${paceLabel}.`;

  return {
    country, countryName: data.name, paceLevel: data.paceLevel, paceLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/restaurant-pace-checker/calculate
// @access Public
exports.calculateRestaurantPace = (req, res) => {
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
// @route POST /api/tools/restaurant-pace-checker/pdf
// @access Public
exports.generateRestaurantPacePdf = async (req, res) => {
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
      [email, firstName || null, 'restaurant-pace-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Restaurant Pace Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="restaurant-pace-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.paceLabel);

    pdfService.heading(doc, 'General restaurant pace tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'In "leisurely" destinations, waiting for the check to appear on its own can mean sitting there long after you\'re ready to leave — learn the local phrase for "check, please" and use it confidently.',
      'In "brisk" destinations, don\'t read a promptly delivered check as a hint to hurry up and leave — it\'s standard practice, not a signal you\'ve overstayed.',
      'Fine dining tends to run more leisurely everywhere, and counter-service spots run brisker everywhere, regardless of the destination\'s general pace.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍽️ Your ${result.countryName} restaurant pace guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the restaurant pace check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond dining culture? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send restaurant-pace-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateRestaurantPacePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
