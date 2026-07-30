const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Prohibited/restricted-export souvenir categories per country — distinct
// from customsController.js, which covers the dollar duty-free ALLOWANCE
// when re-entering the US. This is about whether a tempting local souvenir
// is legal to take out of the country (or bring into the US) at all,
// regardless of value — wildlife/CITES products, cultural artifacts and
// antiquities, and similar categories that get confiscated at customs
// every year from travelers who had no idea. riskLevel: 'low' (no
// particularly notable restricted-souvenir category) | 'moderate' (a real
// category to watch for) | 'high' (a well-known, seriously enforced
// restriction — real risk of seizure or prosecution).
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'low', topRisk: 'Counterfeit goods', note: 'Counterfeit designer goods — even "obviously fake" items — can be seized and carry real fines, even for personal use. Genuine antiques are fine to take home.' },
  austria: { name: 'Austria', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category — standard wildlife/CITES rules apply as they do everywhere.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  denmark: { name: 'Denmark', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  germany: { name: 'Germany', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  greece: { name: 'Greece', riskLevel: 'moderate', topRisk: 'Ancient artifacts and coins', note: 'Taking ancient coins, pottery fragments, or archaeological artifacts — even ones that look like cheap trinkets — without an official export permit is illegal and can lead to real legal trouble.' },
  hungary: { name: 'Hungary', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  iceland: { name: 'Iceland', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  italy: { name: 'Italy', riskLevel: 'moderate', topRisk: 'Counterfeit goods & antiques', note: 'Counterfeit designer goods are aggressively enforced against, with real fines even for buyers. Genuine antiques and art require an official export permit to take out of the country.' },
  netherlands: { name: 'Netherlands', riskLevel: 'moderate', topRisk: 'Cannabis products', note: "Cannabis products are illegal to bring back to the US regardless of quantity, even where they're legally purchased in the Netherlands — this catches more travelers than any other category here." },
  portugal: { name: 'Portugal', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  spain: { name: 'Spain', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category beyond standard cured-meat/agricultural declaration rules.' },
  sweden: { name: 'Sweden', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  switzerland: { name: 'Switzerland', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  ireland: { name: 'Ireland', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  turkey: { name: 'Turkey', riskLevel: 'high', topRisk: 'Antiques and cultural artifacts', note: "Antiques and cultural artifacts require an official Turkish export permit — buying without one risks seizure before you even leave the country, and this is actively enforced, not a theoretical rule." },
  japan: { name: 'Japan', riskLevel: 'low', topRisk: 'Certain knives and traditional medicines', note: 'Some traditional medicines and certain knives/blades can trigger extra customs scrutiny — declare anything unusual.' },
  thailand: { name: 'Thailand', riskLevel: 'high', topRisk: 'Buddha statues and religious artifacts', note: "Buddha images and religious artifacts often require an export permit from Thailand's Fine Arts Department — this is a common, genuine trap for tourists who buy one as a souvenir without realizing. Ivory is banned outright." },
  indonesia: { name: 'Indonesia', riskLevel: 'moderate', topRisk: 'Wildlife and coral products', note: 'Wildlife products (coral, turtle shell, certain woods) are restricted under CITES rules, even as souvenirs from Bali.' },
  singapore: { name: 'Singapore', riskLevel: 'low', topRisk: 'None notable', note: 'Chewing gum sale is restricted locally, but this rarely affects souvenir shopping — otherwise a straightforward destination.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', topRisk: 'Counterfeit goods', note: 'Counterfeit goods (electronics, watches, designer items) are commonly seized — buy only from legitimate retailers.' },
  vietnam: { name: 'Vietnam', riskLevel: 'moderate', topRisk: 'Wildlife products and antiques', note: 'Wildlife products and certain antiques require documentation; ivory and turtle shell items are banned outright.' },
  philippines: { name: 'Philippines', riskLevel: 'moderate', topRisk: 'Wildlife and coral products', note: 'Wildlife and coral products are restricted under CITES rules, even as souvenirs.' },
  malaysia: { name: 'Malaysia', riskLevel: 'moderate', topRisk: 'Wildlife products', note: 'Wildlife products, including some wood carvings, can be restricted under CITES rules.' },
  china: { name: 'China', riskLevel: 'moderate', topRisk: 'Antiques and cultural artifacts', note: 'Genuine antiques and cultural artifacts may need a Chinese export permit — face heavy scrutiny at customs even when purchased legitimately.' },
  india: { name: 'India', riskLevel: 'high', topRisk: 'Ivory, antiques, wildlife products', note: 'Ivory, certain wildlife products, and antiques over 100 years old require an official Indian export permit — this is actively and seriously enforced.' },
  maldives: { name: 'Maldives', riskLevel: 'moderate', topRisk: 'Coral and marine wildlife', note: 'Coral, shells, and other marine wildlife products are restricted or banned under CITES rules, even as souvenirs.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', topRisk: 'Gems and wildlife products', note: 'Gemstones should have proper documentation; wildlife and coral products are restricted under CITES rules.' },
  cambodia: { name: 'Cambodia', riskLevel: 'high', topRisk: 'Temple antiques and cultural artifacts', note: "Antiques and anything resembling temple carvings require an official Cambodian export permit — enforcement around Angkor-related antiquities is genuinely serious." },
  australia: { name: 'Australia', riskLevel: 'moderate', topRisk: 'Wood, plant, and animal products', note: 'Strict biosecurity rules apply — wood, plant, and animal-product souvenirs may need declaration or could be confiscated on your way home.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'moderate', topRisk: 'Wood, plant, and animal products', note: 'Strict biosecurity rules apply — wood, plant, and animal-product souvenirs may need declaration or could be confiscated on your way home.' },
  fiji: { name: 'Fiji', riskLevel: 'moderate', topRisk: 'Coral and marine wildlife', note: 'Coral and marine wildlife products are restricted under CITES rules, even as souvenirs.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'moderate', topRisk: 'Coral and marine wildlife', note: 'Black pearls are fine to bring back, but coral and other marine wildlife products are restricted under CITES rules.' },
  mexico: { name: 'Mexico', riskLevel: 'low', topRisk: 'None notable', note: "Cuban cigars purchased in Mexico are legal to bring back for personal use within normal tobacco limits; fresh produce and meats need declaration." },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'low', topRisk: 'None notable', note: 'Cuban cigars are commonly sold here and legal to bring back for personal use within normal tobacco limits.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'low', topRisk: 'None notable', note: "Puerto Rico is US territory — there's no customs process at all when you fly back to the mainland." },
  bahamas: { name: 'Bahamas', riskLevel: 'moderate', topRisk: 'Conch shells and marine products', note: 'Conch shells and certain marine products are restricted under CITES rules if not properly documented.' },
  jamaica: { name: 'Jamaica', riskLevel: 'low', topRisk: 'Ackee fruit', note: "Rum is the classic souvenir and travels fine within your alcohol allowance; ackee fruit (unless canned) is restricted." },
  aruba: { name: 'Aruba', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'moderate', topRisk: 'Conch shells and marine wildlife', note: 'Conch shells and other marine wildlife products are restricted under CITES rules if not properly documented.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'moderate', topRisk: 'Rainforest wildlife products', note: 'Wildlife products, including anything made from protected rainforest species, are restricted under CITES rules.' },
  panama: { name: 'Panama', riskLevel: 'moderate', topRisk: 'Wildlife products and handicrafts', note: 'Wildlife products and certain handicrafts made from protected species are restricted under CITES rules.' },
  belize: { name: 'Belize', riskLevel: 'moderate', topRisk: 'Wildlife and coral products', note: 'Wildlife and coral products are restricted under CITES rules, even as souvenirs.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category.' },
  canada: { name: 'Canada', riskLevel: 'low', topRisk: 'None notable', note: 'No particularly restricted souvenir category beyond standard agricultural declaration rules.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'moderate', topRisk: 'Gold jewelry and counterfeit goods', note: 'Gold jewelry above certain values should have receipts on hand; counterfeit goods are commonly seized.' },
  morocco: { name: 'Morocco', riskLevel: 'moderate', topRisk: 'Antiques and cultural artifacts', note: 'Leather goods and rugs are fine but keep receipts; antiques and cultural artifacts may require an official Moroccan export permit.' },
  'south-africa': { name: 'South Africa', riskLevel: 'high', topRisk: 'Ivory and protected wildlife products', note: 'Wildlife products, including anything made from ivory or other protected species, are heavily restricted under CITES rules — this is taken very seriously given the region\'s poaching concerns.' },
  qatar: { name: 'Qatar', riskLevel: 'low', topRisk: 'Gold jewelry', note: 'Gold jewelry above certain values should have receipts on hand; otherwise a straightforward destination.' },
  israel: { name: 'Israel', riskLevel: 'high', topRisk: 'Antiques and archaeological artifacts', note: "Antiques and archaeological artifacts require an official Israeli export permit — don't buy without one, since enforcement here is genuinely serious." },
  tanzania: { name: 'Tanzania', riskLevel: 'high', topRisk: 'Ivory and protected wildlife products', note: 'Wildlife products, including anything made from ivory or other protected species, are heavily restricted under CITES rules, especially from safari areas.' },
  kenya: { name: 'Kenya', riskLevel: 'high', topRisk: 'Ivory and protected wildlife products', note: 'Wildlife products, including anything made from ivory or other protected species, are heavily restricted under CITES rules, especially from safari areas.' },
  argentina: { name: 'Argentina', riskLevel: 'low', topRisk: 'None notable', note: 'Leather goods are fine but keep receipts — otherwise no particularly restricted souvenir category.' },
  peru: { name: 'Peru', riskLevel: 'high', topRisk: 'Pre-Columbian antiquities', note: "Ancient artifacts and anything resembling pre-Columbian antiquities require an official Peruvian export permit — don't buy without one, since this is actively and seriously enforced." },
  chile: { name: 'Chile', riskLevel: 'low', topRisk: 'None notable', note: 'Fresh produce and certain wood products need agricultural declaration — otherwise no particularly restricted souvenir category.' },
  colombia: { name: 'Colombia', riskLevel: 'moderate', topRisk: 'Emeralds and wildlife products', note: 'Emeralds should have proper documentation; wildlife and coral products are restricted under CITES rules.' },
  brazil: { name: 'Brazil', riskLevel: 'moderate', topRisk: 'Wildlife products and gemstones', note: 'Wildlife products and certain wood items are restricted under CITES rules; keep receipts for gemstones.' },
  'united-states': { name: 'United States', riskLevel: 'low', topRisk: 'Native American feather items', note: "Handcrafted items featuring eagle or other protected-bird feathers are federally protected and restricted even domestically — otherwise no particularly restricted souvenir category for a US trip." },
};

const RISK_LABELS = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const riskLabel = RISK_LABELS[data.riskLevel];
  const headline = `${data.name}: ${riskLabel} — watch out for ${data.topRisk.toLowerCase()}.`;

  return {
    country, countryName: data.name, riskLevel: data.riskLevel, riskLabel,
    topRisk: data.topRisk, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/souvenir-export-checker/calculate
// @access Public
exports.calculateSouvenirExport = (req, res) => {
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
// @route POST /api/tools/souvenir-export-checker/pdf
// @access Public
exports.generateSouvenirExportPdf = async (req, res) => {
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
      [email, firstName || null, 'souvenir-export-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Souvenir & Export Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="souvenir-export-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.riskLabel} — ${result.topRisk}`);

    pdfService.heading(doc, 'Before you shop');
    pdfService.bulletList(doc, [
      'Wildlife and marine products (ivory, coral, turtle shell, exotic skins) are restricted under CITES rules in almost every country — when in doubt, don\'t buy it.',
      'Ask the seller directly whether an item needs an export permit, especially for anything that looks like an antique, artifact, or archaeological find.',
      'Keep receipts for anything valuable — customs officers can ask for proof of purchase price and legitimacy at any time.',
      'This covers the most common risk for this destination, not every possible restricted item — when buying something unusual, it\'s always worth a quick search before you commit.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛍️ Your ${result.countryName} souvenir & export guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the souvenir export check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond souvenir shopping? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send souvenir-export-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSouvenirExportPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
