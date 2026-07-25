const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// US customs/duty-free allowance when returning from each country, reused
// from Tool #3's country list. cbiEligible marks Caribbean Basin
// Initiative beneficiary countries, which get a boosted 5-liter alcohol
// allowance (vs. the standard 1 liter) if at least one liter is a local
// product. The $800 personal exemption itself is flat across all of these
// (US insular possessions like the USVI, which get $1,600, aren't in this
// country list). watchItem flags the most search-relevant restricted item.
const COUNTRIES = {
  france: { name: 'France', cbiEligible: false, watchItem: "Counterfeit designer goods (even 'obviously fake' luxury items) can be seized, and unpasteurized cheeses or meats need to be declared to USDA." },
  austria: { name: 'Austria', cbiEligible: false, watchItem: 'Fresh meats, cheeses, and other animal products need USDA declaration and are often restricted.' },
  'czech-republic': { name: 'Czech Republic', cbiEligible: false, watchItem: 'Absinthe with high thujone content faces import scrutiny — check the label before buying.' },
  denmark: { name: 'Denmark', cbiEligible: false, watchItem: 'Fresh meats and dairy products need USDA declaration and are often restricted.' },
  germany: { name: 'Germany', cbiEligible: false, watchItem: 'Fresh meats, cheeses, and other animal products need USDA declaration and are often restricted.' },
  greece: { name: 'Greece', cbiEligible: false, watchItem: 'Olive oil and other agricultural products in large quantities may need declaration; counterfeit goods can be seized.' },
  hungary: { name: 'Hungary', cbiEligible: false, watchItem: "High-proof spirits like pálinka may exceed typical baggage alcohol-content limits for air travel — check with your airline separately from customs." },
  iceland: { name: 'Iceland', cbiEligible: false, watchItem: 'Fresh fish and meat products need USDA declaration and are often restricted.' },
  italy: { name: 'Italy', cbiEligible: false, watchItem: "Counterfeit designer goods (even 'obviously fake' luxury items) can be seized, and unpasteurized cheeses or meats need to be declared to USDA." },
  netherlands: { name: 'Netherlands', cbiEligible: false, watchItem: 'Cannabis products, even where legal locally, are illegal to bring back to the US regardless of quantity.' },
  portugal: { name: 'Portugal', cbiEligible: false, watchItem: 'Fresh meats, cheeses, and other animal products need USDA declaration and are often restricted.' },
  spain: { name: 'Spain', cbiEligible: false, watchItem: 'Counterfeit designer goods and cured meats like jamón ibérico may be restricted or need USDA declaration.' },
  sweden: { name: 'Sweden', cbiEligible: false, watchItem: 'Fresh meats and dairy products need USDA declaration and are often restricted.' },
  switzerland: { name: 'Switzerland', cbiEligible: false, watchItem: 'Fresh meats, cheeses, and other animal products need USDA declaration and are often restricted.' },
  ireland: { name: 'Ireland', cbiEligible: false, watchItem: 'Fresh meats and dairy products need USDA declaration and are often restricted.' },
  'united-kingdom': { name: 'United Kingdom', cbiEligible: false, watchItem: 'Counterfeit goods and certain meat/dairy products need USDA declaration and are often restricted.' },
  turkey: { name: 'Turkey', cbiEligible: false, watchItem: "Antiques and cultural artifacts require a Turkish export permit — buying without one risks seizure before you even leave the country." },
  japan: { name: 'Japan', cbiEligible: false, watchItem: 'Certain traditional medicines and some knives/blades can trigger extra scrutiny — declare anything unusual.' },
  thailand: { name: 'Thailand', cbiEligible: false, watchItem: 'Elephant ivory, coral, and other wildlife products are heavily restricted or banned under CITES rules, even as souvenirs.' },
  indonesia: { name: 'Indonesia', cbiEligible: false, watchItem: 'Wildlife products (coral, turtle shell, certain woods) are restricted under CITES rules, even as souvenirs from Bali.' },
  singapore: { name: 'Singapore', cbiEligible: false, watchItem: 'Chewing gum and certain wildlife products face restrictions locally; otherwise a straightforward declare-as-usual destination.' },
  'south-korea': { name: 'South Korea', cbiEligible: false, watchItem: 'Ginseng products in large quantities may need declaration; otherwise a straightforward declare-as-usual destination.' },
  'hong-kong': { name: 'Hong Kong', cbiEligible: false, watchItem: 'Counterfeit goods (electronics, watches, designer items) are commonly seized — buy only from legitimate retailers.' },
  vietnam: { name: 'Vietnam', cbiEligible: false, watchItem: 'Wildlife products and certain antiques require documentation; ivory and turtle shell items are banned.' },
  philippines: { name: 'Philippines', cbiEligible: false, watchItem: 'Wildlife and coral products are restricted under CITES rules, even as souvenirs.' },
  malaysia: { name: 'Malaysia', cbiEligible: false, watchItem: 'Wildlife products, including some wood carvings, can be restricted under CITES rules.' },
  china: { name: 'China', cbiEligible: false, watchItem: 'Counterfeit goods and certain antiques/cultural artifacts face heavy scrutiny — genuine antiques may need a Chinese export permit.' },
  india: { name: 'India', cbiEligible: false, watchItem: 'Ivory, certain wildlife products, and antiques over 100 years old require an Indian export permit.' },
  maldives: { name: 'Maldives', cbiEligible: false, watchItem: 'Coral, shells, and other marine wildlife products are restricted or banned under CITES rules.' },
  taiwan: { name: 'Taiwan', cbiEligible: false, watchItem: 'Counterfeit goods and certain wildlife products face restrictions.' },
  'sri-lanka': { name: 'Sri Lanka', cbiEligible: false, watchItem: 'Gems should have proper documentation; wildlife and coral products are restricted under CITES rules.' },
  cambodia: { name: 'Cambodia', cbiEligible: false, watchItem: 'Antiques and cultural artifacts (especially anything resembling temple carvings) require a Cambodian export permit.' },
  australia: { name: 'Australia', cbiEligible: false, watchItem: 'Strict biosecurity rules apply on arrival there, and returning to the US, wood/plant/animal products may need USDA declaration.' },
  'new-zealand': { name: 'New Zealand', cbiEligible: false, watchItem: 'Strict biosecurity rules apply on arrival there, and returning to the US, wood/plant/animal products may need USDA declaration.' },
  fiji: { name: 'Fiji', cbiEligible: false, watchItem: 'Coral and marine wildlife products are restricted under CITES rules, even as souvenirs.' },
  'french-polynesia': { name: 'French Polynesia', cbiEligible: false, watchItem: 'Black pearls are fine to bring back, but coral and other marine wildlife products are restricted under CITES rules.' },
  mexico: { name: 'Mexico', cbiEligible: false, watchItem: 'Cuban cigars purchased in Mexico are legal to bring back for personal use within normal tobacco limits; fresh produce and meats need USDA declaration.' },
  'dominican-republic': { name: 'Dominican Republic', cbiEligible: true, watchItem: 'Cuban cigars are commonly sold here and legal to bring back for personal use within normal tobacco limits.' },
  'puerto-rico': { name: 'Puerto Rico', cbiEligible: false, watchItem: "Puerto Rico is US territory — there's no customs process at all when you fly back to the mainland." },
  bahamas: { name: 'Bahamas', cbiEligible: true, watchItem: 'Conch shells and certain marine products are restricted under CITES rules if not properly documented.' },
  jamaica: { name: 'Jamaica', cbiEligible: true, watchItem: 'Rum is the classic souvenir and travels fine within your alcohol allowance; ackee fruit (unless canned) is restricted by the USDA.' },
  aruba: { name: 'Aruba', cbiEligible: true, watchItem: 'A straightforward destination for customs — no unusual restrictions beyond the standard agricultural and alcohol rules.' },
  'turks-and-caicos': { name: 'Turks and Caicos', cbiEligible: true, watchItem: 'Conch shells and other marine wildlife products are restricted under CITES rules if not properly documented.' },
  'st-lucia': { name: 'St. Lucia', cbiEligible: true, watchItem: 'A straightforward destination for customs — no unusual restrictions beyond the standard agricultural and alcohol rules.' },
  'costa-rica': { name: 'Costa Rica', cbiEligible: true, watchItem: 'Wildlife products, including anything made from protected rainforest species, are restricted under CITES rules.' },
  panama: { name: 'Panama', cbiEligible: true, watchItem: 'Wildlife products and certain handicrafts made from protected species are restricted under CITES rules.' },
  belize: { name: 'Belize', cbiEligible: true, watchItem: 'Wildlife and coral products are restricted under CITES rules, even as souvenirs.' },
  'cayman-islands': { name: 'Cayman Islands', cbiEligible: true, watchItem: 'A straightforward destination for customs — no unusual restrictions beyond the standard agricultural and alcohol rules.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', cbiEligible: true, watchItem: 'A straightforward destination for customs — no unusual restrictions beyond the standard agricultural and alcohol rules.' },
  curacao: { name: 'Curaçao', cbiEligible: true, watchItem: 'A straightforward destination for customs — no unusual restrictions beyond the standard agricultural and alcohol rules.' },
  canada: { name: 'Canada', cbiEligible: false, watchItem: 'Fresh produce and meats may need USDA declaration; otherwise a straightforward destination for customs.' },
  'united-arab-emirates': { name: 'United Arab Emirates', cbiEligible: false, watchItem: 'Gold jewelry above certain values should have receipts on hand; counterfeit goods are commonly seized.' },
  morocco: { name: 'Morocco', cbiEligible: false, watchItem: 'Leather goods and rugs are fine but keep receipts; antiques and cultural artifacts may require a Moroccan export permit.' },
  'south-africa': { name: 'South Africa', cbiEligible: false, watchItem: 'Wildlife products, including anything made from ivory or other protected species, are heavily restricted under CITES rules.' },
  qatar: { name: 'Qatar', cbiEligible: false, watchItem: 'Gold jewelry above certain values should have receipts on hand; otherwise a straightforward destination for customs.' },
  israel: { name: 'Israel', cbiEligible: false, watchItem: "Antiques and archaeological artifacts require an Israeli export permit — don't buy without one." },
  tanzania: { name: 'Tanzania', cbiEligible: false, watchItem: 'Wildlife products, including anything made from ivory or other protected species, are heavily restricted under CITES rules, especially from safari areas.' },
  kenya: { name: 'Kenya', cbiEligible: false, watchItem: 'Wildlife products, including anything made from ivory or other protected species, are heavily restricted under CITES rules, especially from safari areas.' },
  argentina: { name: 'Argentina', cbiEligible: false, watchItem: 'Leather goods are fine but keep receipts; fresh meats need USDA declaration.' },
  peru: { name: 'Peru', cbiEligible: false, watchItem: "Ancient artifacts and anything resembling pre-Columbian antiquities require a Peruvian export permit — don't buy without one." },
  chile: { name: 'Chile', cbiEligible: false, watchItem: 'Fresh produce and certain wood products need USDA/agricultural declaration.' },
  colombia: { name: 'Colombia', cbiEligible: false, watchItem: 'Emeralds should have proper documentation; wildlife and coral products are restricted under CITES rules.' },
  brazil: { name: 'Brazil', cbiEligible: false, watchItem: 'Wildlife products and certain wood items are restricted under CITES rules; keep receipts for gemstones.' },
};

const EXEMPTION_USD = 800;

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  if (country === 'puerto-rico') {
    return {
      country, countryName: data.name, exemptionUSD: null, alcoholLiters: null, cbiEligible: false,
      watchItem: data.watchItem,
      headline: `Returning from ${data.name}: no customs process at all — it's a US territory, same as flying home from any other state.`,
    };
  }

  const alcoholLiters = data.cbiEligible ? 5 : 1;
  const headline = `Returning from ${data.name}: $${EXEMPTION_USD} personal exemption, up to ${alcoholLiters} liter${alcoholLiters > 1 ? 's' : ''} of alcohol duty-free${data.cbiEligible ? ' (Caribbean Basin bonus)' : ''}.`;

  return {
    country, countryName: data.name, exemptionUSD: EXEMPTION_USD, alcoholLiters, cbiEligible: data.cbiEligible,
    watchItem: data.watchItem, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/customs-checker/calculate
// @access Public
exports.calculateCustoms = (req, res) => {
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
// @route POST /api/tools/customs-checker/pdf
// @access Public
exports.generateCustomsPdf = async (req, res) => {
  try {
    const { email, firstName, country } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [email, firstName || null, 'customs-checker',
        JSON.stringify({ country }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Duty-Free & Customs Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="customs-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.watchItem);

    if (result.exemptionUSD) {
      pdfService.highlightBox(doc, `$${result.exemptionUSD} exemption · ${result.alcoholLiters}L alcohol duty-free`);
    }

    pdfService.heading(doc, 'Before you fly home');
    pdfService.bulletList(doc, [
      'Keep receipts for anything valuable — customs officers can ask for proof of purchase price at any time.',
      'Declare everything you bought, even gifts and items still in checked luggage — under-declaring risks fines and seizure, honest mistakes are usually just corrected.',
      'Alcohol over your duty-free limit isn\'t illegal — you just pay duty on the excess, so it\'s rarely worth leaving something behind.',
      'Fresh food, plants, and animal products are the single most common reason for a customs delay — when in doubt, declare it and let USDA make the call.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛃 Your ${result.countryName} customs guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your duty-free check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the trip home? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send customs-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCustomsPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
