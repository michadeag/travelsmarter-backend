const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Solo dining culture per destination — how normal it is to eat out alone,
// distinct from soloFemaleTravelController.js (safety, not social norms)
// and restaurantReservationController.js (booking norms, not solo-
// friendliness). soloLevel: 'very-common' (solo dining is genuinely well-
// accommodated — counter seating and solo-friendly formats are common by
// design) | 'common' (solo dining is normal and unremarkable, without
// necessarily being specifically catered to) | 'workable' (fine in
// practice, but the dining culture skews social/group-oriented, so a solo
// diner may draw some mild attention or find certain formats less suited
// to eating alone) | 'uncommon' (dining out is strongly a social or
// couples-oriented activity at this destination, and solo diners may find
// genuine friction, especially at dinner).
const COUNTRIES = {
  france: { name: 'France', soloLevel: 'common', note: "Solo dining, especially at cafes and bistros, is completely normal in France — many locals eat and read alone at cafe tables without a second thought." },
  austria: { name: 'Austria', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including at traditional coffee houses, which have a long culture of solo patrons.' },
  'czech-republic': { name: 'Czech Republic', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at most restaurants and pubs.' },
  denmark: { name: 'Denmark', soloLevel: 'common', note: 'Solo dining is normal and unremarkable — Danish cafe culture in particular comfortably accommodates solo diners.' },
  germany: { name: 'Germany', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including sharing a table with strangers at busy beer halls (Stammtisch culture), which is standard practice.' },
  greece: { name: 'Greece', soloLevel: 'workable', note: 'Greek dining culture leans social and family-oriented, so a solo diner may draw a touch of attention — it\'s entirely workable, just less the cultural default.' },
  hungary: { name: 'Hungary', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at most restaurants and cafes.' },
  iceland: { name: 'Iceland', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including at casual and higher-end restaurants alike.' },
  italy: { name: 'Italy', soloLevel: 'workable', note: 'Italian dining culture is strongly social, especially at dinner — solo diners are welcome and it\'s entirely workable, but you may notice you\'re one of few tables of one, especially at a traditional trattoria dinner.' },
  netherlands: { name: 'Netherlands', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at most restaurants and cafes.' },
  portugal: { name: 'Portugal', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including at traditional tascas (small local restaurants).' },
  spain: { name: 'Spain', soloLevel: 'workable', note: 'Spanish dining, especially tapas culture, is built around sharing plates with a group — solo dining is entirely workable at a bar counter, but you\'ll miss some of the communal tapas experience.' },
  sweden: { name: 'Sweden', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including at fika-style cafes, which comfortably accommodate solo patrons.' },
  switzerland: { name: 'Switzerland', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at most restaurants and cafes.' },
  ireland: { name: 'Ireland', soloLevel: 'common', note: 'Solo dining, including at pubs with a meal at the bar, is normal and unremarkable.' },
  'united-kingdom': { name: 'United Kingdom', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including a solo pub meal, which is a completely standard practice.' },
  turkey: { name: 'Turkey', soloLevel: 'workable', note: 'Turkish dining culture leans social, especially around shared meze spreads — solo dining is entirely workable, particularly at simpler kebab and lokanta spots.' },
  japan: { name: 'Japan', soloLevel: 'very-common', note: 'Solo dining ("ohitorisama") is genuinely well-accommodated — counter seating at ramen shops, sushi bars, and izakayas is designed for solo diners, and it carries no social stigma at all.' },
  thailand: { name: 'Thailand', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at street food stalls and casual restaurants, which make up the bulk of everyday eating.' },
  indonesia: { name: 'Indonesia', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at warungs (small local eateries) and street food stalls.' },
  singapore: { name: 'Singapore', soloLevel: 'very-common', note: 'Hawker centers are genuinely solo-friendly by design — communal seating and quick, casual service make solo dining the norm rather than the exception.' },
  'south-korea': { name: 'South Korea', soloLevel: 'workable', note: "Korean dining culture traditionally centers on groups, and some dishes (Korean BBQ, certain stews) have minimum-order requirements — solo dining (\"honbap\") has grown significantly and dedicated solo-friendly spots now exist, but it's still not the cultural default everywhere." },
  'hong-kong': { name: 'Hong Kong', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at cha chaan teng (casual diners) and noodle shops.' },
  vietnam: { name: 'Vietnam', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at street food stalls and pho shops, which make up the bulk of everyday eating.' },
  philippines: { name: 'Philippines', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at casual carinderias (small local eateries) and fast-casual chains.' },
  malaysia: { name: 'Malaysia', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at hawker centers, which comfortably accommodate solo diners.' },
  china: { name: 'China', soloLevel: 'workable', note: "Chinese dining culture centers on family-style sharing, so some dishes and restaurant formats assume a group — solo dining at noodle shops and casual eateries is entirely workable and common." },
  india: { name: 'India', soloLevel: 'workable', note: 'Indian dining culture leans social and family-oriented — solo dining is entirely workable, especially at casual and fast-casual spots, though some higher-end restaurants lean toward groups.' },
  maldives: { name: 'Maldives', soloLevel: 'uncommon', note: "Resort dining here skews heavily toward couples and honeymooners, and the overall destination is built around that experience — solo travelers are welcome, but you'll notice you're an exception." },
  taiwan: { name: 'Taiwan', soloLevel: 'very-common', note: 'Night market culture and small noodle/rice-bowl shops are genuinely solo-friendly by design — solo dining is completely unremarkable and well-accommodated.' },
  'sri-lanka': { name: 'Sri Lanka', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at casual local eateries.' },
  cambodia: { name: 'Cambodia', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at street food stalls and casual restaurants.' },
  australia: { name: 'Australia', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including a solo meal at a cafe or pub.' },
  'new-zealand': { name: 'New Zealand', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at most cafes and restaurants.' },
  fiji: { name: 'Fiji', soloLevel: 'workable', note: 'Resort dining tends to lean toward couples and families, but solo diners are welcome and it\'s entirely workable.' },
  'french-polynesia': { name: 'French Polynesia', soloLevel: 'uncommon', note: "This is a heavily honeymoon-oriented destination, and resort dining is built around that experience — solo travelers are welcome, but you'll notice you're an exception." },
  mexico: { name: 'Mexico', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at taquerias and casual restaurants, which make up the bulk of everyday eating.' },
  'dominican-republic': { name: 'Dominican Republic', soloLevel: 'workable', note: 'Most trips center on all-inclusive resorts with couple/family-oriented dining formats — solo diners are welcome and it\'s entirely workable.' },
  'puerto-rico': { name: 'Puerto Rico', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in San Juan and beyond.' },
  bahamas: { name: 'Bahamas', soloLevel: 'workable', note: 'Resort dining tends to lean toward couples and families, but solo diners are welcome and it\'s entirely workable.' },
  jamaica: { name: 'Jamaica', soloLevel: 'workable', note: 'Resort dining tends to lean toward couples and families, but solo diners are welcome, especially outside resort areas at local jerk stands and casual spots.' },
  aruba: { name: 'Aruba', soloLevel: 'workable', note: 'Resort dining tends to lean toward couples, but solo diners are welcome and it\'s entirely workable.' },
  'turks-and-caicos': { name: 'Turks and Caicos', soloLevel: 'workable', note: 'Resort dining tends to lean toward couples, but solo diners are welcome and it\'s entirely workable.' },
  'st-lucia': { name: 'St. Lucia', soloLevel: 'uncommon', note: "This is a heavily honeymoon-oriented destination, and resort dining is built around that experience — solo travelers are welcome, but you'll notice you're an exception." },
  'costa-rica': { name: 'Costa Rica', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at casual sodas (local eateries).' },
  panama: { name: 'Panama', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in Panama City and beyond.' },
  belize: { name: 'Belize', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at casual restaurants across Belize.' },
  'cayman-islands': { name: 'Cayman Islands', soloLevel: 'workable', note: 'Dining here leans toward a resort/couples atmosphere, but solo diners are welcome and it\'s entirely workable.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', soloLevel: 'workable', note: 'Resort dining tends to lean toward couples, but solo diners are welcome and it\'s entirely workable.' },
  curacao: { name: 'Curaçao', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in Willemstad and beyond.' },
  canada: { name: 'Canada', soloLevel: 'common', note: 'Solo dining is normal and unremarkable at most restaurants and cafes.' },
  'united-arab-emirates': { name: 'United Arab Emirates', soloLevel: 'workable', note: 'Dining culture leans social and family-oriented, but hotel restaurants and casual spots comfortably accommodate solo diners.' },
  morocco: { name: 'Morocco', soloLevel: 'workable', note: 'Moroccan dining culture leans social, especially around shared tagines, but solo dining is entirely workable, particularly at casual spots.' },
  'south-africa': { name: 'South Africa', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in Cape Town, Johannesburg, and beyond.' },
  qatar: { name: 'Qatar', soloLevel: 'workable', note: 'Dining culture leans social and family-oriented, but hotel restaurants and casual spots in Doha comfortably accommodate solo diners.' },
  israel: { name: 'Israel', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in Tel Aviv, Jerusalem, and beyond.' },
  tanzania: { name: 'Tanzania', soloLevel: 'workable', note: "Safari lodge dining is typically a set, shared format rather than an à la carte one — solo travelers are welcome and well-accommodated, just within that shared structure." },
  kenya: { name: 'Kenya', soloLevel: 'workable', note: "Safari lodge dining is typically a set, shared format rather than an à la carte one — solo travelers are welcome and well-accommodated, just within that shared structure." },
  argentina: { name: 'Argentina', soloLevel: 'workable', note: 'Argentine dining culture is strongly social, especially around shared parrilla (grill) meals — solo dining is entirely workable, particularly at casual spots.' },
  peru: { name: 'Peru', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, especially at casual restaurants and markets.' },
  chile: { name: 'Chile', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in Santiago and beyond.' },
  colombia: { name: 'Colombia', soloLevel: 'common', note: 'Solo dining is normal and unremarkable in Bogotá, Medellín, and beyond.' },
  brazil: { name: 'Brazil', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including at per-kilo buffet restaurants, which are genuinely convenient for solo diners.' },
  'united-states': { name: 'United States', soloLevel: 'common', note: 'Solo dining is normal and unremarkable, including at bar counters, which are a standard, comfortable option for eating alone.' },
};

const SOLO_LABELS = {
  'very-common': 'Very Common — Genuinely Solo-Friendly',
  common: 'Common — Solo Dining Is Unremarkable',
  workable: 'Workable — Fine, But Dining Skews Social',
  uncommon: 'Uncommon — Expect Some Friction',
};

const DISCLAIMER = "This reflects general norms across a destination's dining culture, not a rule for every restaurant — casual and fast-casual spots almost everywhere welcome solo diners without a second thought, regardless of the destination's overall reputation. Formal fine dining and shared-format meals (hot pot, Korean BBQ, family-style feasts) are the main exception worth planning around.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const soloLabel = SOLO_LABELS[data.soloLevel];
  const headline = `${data.name}: ${soloLabel}.`;

  return {
    country, countryName: data.name, soloLevel: data.soloLevel, soloLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/solo-dining-checker/calculate
// @access Public
exports.calculateSoloDining = (req, res) => {
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
// @route POST /api/tools/solo-dining-checker/pdf
// @access Public
exports.generateSoloDiningPdf = async (req, res) => {
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
      [email, firstName || null, 'solo-dining-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Solo Dining Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="solo-dining-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.soloLabel);

    pdfService.heading(doc, 'General solo dining tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Counter seating, food halls, and street food stalls are near-universally solo-friendly, even in destinations where sit-down dining skews social — lean on these when you want an easy, unremarkable solo meal.',
      'Lunch is almost always more solo-friendly than dinner, even in destinations where dinner leans strongly social — a solo lunch rarely draws any attention anywhere.',
      'Bringing a book or your phone isn\'t just personal comfort — in many cultures it signals "I\'m genuinely fine dining alone," which can ease any self-consciousness about eating solo.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍜 Your ${result.countryName} solo dining guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the solo dining check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond dining culture? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send solo-dining-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSoloDiningPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
