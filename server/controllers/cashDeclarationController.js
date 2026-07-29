const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Cash declaration threshold when entering or leaving each country —
// distinct from currencyController.js (cash-vs-card culture) and
// customsController.js (US duty-free goods allowance). This is the legal
// cash amount above which you must file a customs declaration, regardless
// of whether the money is legitimately yours — undeclared cash over the
// threshold can be seized outright, even with no wrongdoing. riskLevel:
// 'low' (standard ~$10,000-equivalent threshold, straightforward) |
// 'moderate' (a notably lower threshold or a documented local wrinkle) |
// 'high' (a genuinely strict regime — currency controls, a closed local
// currency, or asymmetric domestic/foreign-currency rules). Thresholds
// are approximate and change — always verify on the destination's customs
// site before you fly.
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold for entering or leaving the EU — applies to cash, cheques, and other bearer instruments combined, not just banknotes.' },
  austria: { name: 'Austria', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold for entering or leaving the EU.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold applies even though the koruna, not the euro, is the local currency.' },
  denmark: { name: 'Denmark', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold applies even though the krone, not the euro, is the local currency.' },
  germany: { name: 'Germany', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold — German customs are known for spot-checking cash at land borders and airports alike.' },
  greece: { name: 'Greece', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold for entering or leaving the EU.' },
  hungary: { name: 'Hungary', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold applies even though the forint, not the euro, is the local currency.' },
  iceland: { name: 'Iceland', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: "Iceland isn't an EU member but applies the same Schengen-wide cash control threshold." },
  italy: { name: 'Italy', riskLevel: 'moderate', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide cross-border threshold, but note Italy separately caps domestic cash payments at a much lower amount (currently €2,000) — a different rule that surprises some visitors.' },
  netherlands: { name: 'Netherlands', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold — Dutch customs run active cash-detection checks at Schiphol.' },
  portugal: { name: 'Portugal', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold for entering or leaving the EU.' },
  spain: { name: 'Spain', riskLevel: 'moderate', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide cross-border threshold, but Spain separately caps many domestic cash payments at €1,000 for non-residents — a different rule that surprises some visitors.' },
  sweden: { name: 'Sweden', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: "Standard EU-wide threshold, though Sweden is famously near-cashless — you're unlikely to be carrying much cash here regardless." },
  switzerland: { name: 'Switzerland', riskLevel: 'low', limit: 'No fixed mandatory threshold', note: "Switzerland is a notable exception — there's no automatic declaration requirement at a fixed amount like the EU's €10,000 rule, though customs can still question and inspect large sums on suspicion." },
  ireland: { name: 'Ireland', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'Standard EU-wide threshold for entering or leaving the EU.' },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'low', limit: '£10,000 (or equivalent)', note: 'Since Brexit, the UK runs its own declaration regime rather than the EU one, but the threshold and process are functionally very similar.' },
  turkey: { name: 'Turkey', riskLevel: 'moderate', limit: '$5,000 (or equivalent), lower than the typical global standard', note: "Turkey's declaration threshold is notably lower than the common $10,000 benchmark used by the US, EU, and UK — easy to trip without realizing it." },
  japan: { name: 'Japan', riskLevel: 'low', limit: '¥1,000,000 (roughly $10,000, or equivalent)', note: 'Standard-range threshold, enforced with genuinely strict spot-checks — Japanese customs takes cash declarations seriously.' },
  thailand: { name: 'Thailand', riskLevel: 'moderate', limit: '$15,000 (or equivalent) for foreign currency; lower limits apply for Thai baht carried to certain bordering countries', note: 'The threshold differs depending on currency type and destination — check the specific rule for baht if you\'re continuing overland to a neighboring country.' },
  indonesia: { name: 'Indonesia', riskLevel: 'moderate', limit: 'IDR 100,000,000 (roughly $6,500) for rupiah; $10,000 equivalent for foreign currency', note: 'Indonesia sets separate, notably lower thresholds for its own currency versus foreign currency — easy to trip on the rupiah side without realizing it.' },
  singapore: { name: 'Singapore', riskLevel: 'low', limit: 'SGD 20,000 (roughly $15,000, or equivalent)', note: 'A somewhat higher-than-standard threshold, but Singapore enforces it strictly with mandatory reporting, not just spot checks.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', limit: 'No mandatory declaration system', note: 'Hong Kong is a notable global outlier — there is no general requirement to declare cash at all, though customs retains the right to question and search on suspicion of money laundering.' },
  vietnam: { name: 'Vietnam', riskLevel: 'moderate', limit: '$5,000 (or equivalent) for foreign currency; VND 15,000,000 for local currency', note: 'Vietnam sets a lower-than-standard threshold and separately restricts how much Vietnamese dong you can carry — both are easy to trip without realizing it.' },
  philippines: { name: 'Philippines', riskLevel: 'moderate', limit: '$10,000 (or equivalent) for foreign currency; PHP 50,000 for local currency', note: 'The peso limit is notably lower than the foreign-currency threshold — worth knowing if you\'re carrying a mix of both.' },
  malaysia: { name: 'Malaysia', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  china: { name: 'China', riskLevel: 'high', limit: '$5,000 (or equivalent) for foreign currency; CNY 20,000 for renminbi', note: "China runs one of the stricter regimes here — separate, lower thresholds for foreign currency versus renminbi, and enforcement is genuinely rigorous at both entry and exit." },
  india: { name: 'India', riskLevel: 'high', limit: '$5,000 in cash ($10,000 combined with traveler\'s cheques) for foreign currency; INR 25,000 max for Indian rupees', note: "India is one of the strictest regimes globally — non-residents face real limits on foreign cash, and taking Indian rupees out of the country is capped at a very low amount regardless of nationality." },
  maldives: { name: 'Maldives', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  taiwan: { name: 'Taiwan', riskLevel: 'high', limit: '$10,000 (or equivalent) for foreign currency; NTD 100,000 (roughly $3,000) for New Taiwan dollars', note: "Taiwan's own currency limit is notably low compared to the foreign-currency threshold — easy to trip if you're carrying a lot of NTD." },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', limit: '$15,000 (or equivalent) for foreign currency; strict limits on Sri Lankan rupees', note: 'Sri Lanka restricts how much local currency can leave the country, separate from the foreign-currency threshold.' },
  cambodia: { name: 'Cambodia', riskLevel: 'moderate', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, though enforcement can be inconsistent — declare anyway to stay safe.' },
  australia: { name: 'Australia', riskLevel: 'low', limit: 'AUD 10,000 (or equivalent)', note: 'Standard global-range threshold, enforced with sniffer dogs and strict penalties for non-declaration.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'low', limit: 'NZD 10,000 (or equivalent)', note: 'Standard global-range threshold, straightforwardly enforced.' },
  fiji: { name: 'Fiji', riskLevel: 'low', limit: 'FJD 10,000 (or equivalent)', note: 'Standard global-range threshold, straightforwardly enforced.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'low', limit: '€10,000 (or equivalent)', note: 'As French territory, the EU-wide cash declaration threshold applies here too.' },
  mexico: { name: 'Mexico', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced at both air and land borders.' },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'As US territory, the same US declaration threshold applies as flying to the mainland.' },
  bahamas: { name: 'Bahamas', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  jamaica: { name: 'Jamaica', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  aruba: { name: 'Aruba', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  panama: { name: 'Panama', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  belize: { name: 'Belize', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  canada: { name: 'Canada', riskLevel: 'low', limit: 'CAD 10,000 (or equivalent)', note: 'Standard global-range threshold, enforced at both air and land borders.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'low', limit: 'AED 60,000 (roughly $16,000, or equivalent)', note: 'A somewhat higher-than-standard threshold, but the UAE enforces it strictly with mandatory reporting.' },
  morocco: { name: 'Morocco', riskLevel: 'high', limit: 'MAD 100,000 (roughly $10,000) for foreign currency; Moroccan dirham cannot be exported at all', note: "Morocco's dirham is a closed currency — you legally cannot take it out of the country regardless of amount, so exchange back before you leave." },
  'south-africa': { name: 'South Africa', riskLevel: 'high', limit: 'ZAR 25,000 (roughly $1,400) for South African rand; foreign currency generally unrestricted if declared', note: 'South Africa maintains real exchange controls — the local-currency export limit is notably low, separate from the more flexible foreign-currency rule.' },
  qatar: { name: 'Qatar', riskLevel: 'low', limit: 'QAR 50,000 (roughly $13,700, or equivalent)', note: 'A somewhat higher-than-standard threshold, straightforwardly enforced.' },
  israel: { name: 'Israel', riskLevel: 'low', limit: '$12,000 (or equivalent)', note: 'A somewhat higher-than-standard threshold, straightforwardly enforced at Ben Gurion Airport.' },
  tanzania: { name: 'Tanzania', riskLevel: 'moderate', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, but enforcement can be inconsistent at land borders — declare anyway to stay safe.' },
  kenya: { name: 'Kenya', riskLevel: 'moderate', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, but enforcement can be inconsistent at land borders — declare anyway to stay safe.' },
  argentina: { name: 'Argentina', riskLevel: 'high', limit: '$10,000 (or equivalent) for declaration; broader currency controls apply to residents', note: "Argentina maintains some of the world's most complex currency controls (the \"cepo cambiario\") — as a tourist the $10,000 declaration threshold is standard, but be aware the peso itself trades at multiple, confusing exchange rates." },
  peru: { name: 'Peru', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  chile: { name: 'Chile', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  colombia: { name: 'Colombia', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'Standard global threshold, straightforwardly enforced.' },
  brazil: { name: 'Brazil', riskLevel: 'low', limit: 'R$10,000 (or equivalent, roughly $2,000)', note: "Brazil's real-denominated threshold works out notably lower than the common $10,000 global benchmark — easy to trip without realizing it." },
  'united-states': { name: 'United States', riskLevel: 'low', limit: '$10,000 (or equivalent)', note: 'The original benchmark most other countries\' thresholds are modeled on — applies to cash, traveler\'s cheques, and money orders combined, entering or leaving.' },
};

const RISK_LABELS = {
  low: 'Standard Threshold',
  moderate: 'Below-Standard Threshold',
  high: 'Strict / Complex Regime',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const riskLabel = RISK_LABELS[data.riskLevel];
  const headline = `${data.name}: ${riskLabel} — declare cash over ${data.limit}.`;

  return {
    country, countryName: data.name, riskLevel: data.riskLevel, riskLabel,
    limit: data.limit, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/cash-declaration-checker/calculate
// @access Public
exports.calculateCashDeclaration = (req, res) => {
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
// @route POST /api/tools/cash-declaration-checker/pdf
// @access Public
exports.generateCashDeclarationPdf = async (req, res) => {
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
      [email, firstName || null, 'cash-declaration-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Cash Declaration Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cash-declaration-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.riskLabel} — declare over ${result.limit}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      "Undeclared cash over the threshold can be seized on the spot, even if the money is completely legitimate — declaring late or 'forgetting' isn't a valid defense.",
      "The threshold usually applies to cash, traveler's cheques, and similar instruments combined — not just banknotes.",
      "This applies both entering and leaving in most countries — check both directions if you're carrying cash on your return trip too.",
      'Thresholds and rules change — always verify on the destination\'s official customs website before you fly.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💵 Your ${result.countryName} cash declaration guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the cash declaration check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond customs rules? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send cash-declaration-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCashDeclarationPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
