const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Currency convertibility per destination — whether leftover local cash
// is worth holding onto or should be spent/exchanged before you leave.
// Distinct from currencyController.js (what the currency is and general
// cash-vs-card culture, not export/re-exchange rules). convertibility:
// 'freely-convertible' (a major, widely-traded currency — exchange it
// anywhere, including at home, with no rush) | 'convertible-locally'
// (genuinely convertible, but realistically only within the country or
// region — banks and exchanges elsewhere won't touch it, so convert
// before you leave) | 'restricted' (official export limits, capital
// controls, or proof-of-exchange requirements apply — check current
// rules before assuming you can convert freely) | 'non-convertible'
// (essentially worthless outside the country in practice — spend it or
// it becomes a souvenir).
const COUNTRIES = {
  france: { name: 'France', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  austria: { name: 'Austria', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  'czech-republic': { name: 'Czech Republic', convertibility: 'convertible-locally', note: 'The Czech koruna is genuinely convertible, but realistically only within Czechia or neighboring countries — banks back home are unlikely to exchange it, so convert or spend before you leave.' },
  denmark: { name: 'Denmark', convertibility: 'convertible-locally', note: 'The Danish krone is convertible, but mainly within Scandinavia — banks back home are unlikely to exchange it easily, so convert or spend before you leave.' },
  germany: { name: 'Germany', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  greece: { name: 'Greece', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  hungary: { name: 'Hungary', convertibility: 'convertible-locally', note: 'The Hungarian forint is genuinely convertible, but realistically only within Hungary — convert or spend before you leave.' },
  iceland: { name: 'Iceland', convertibility: 'convertible-locally', note: 'The Icelandic króna is rarely exchanged outside Iceland — convert or spend before you leave.' },
  italy: { name: 'Italy', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  netherlands: { name: 'Netherlands', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  portugal: { name: 'Portugal', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  spain: { name: 'Spain', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  sweden: { name: 'Sweden', convertibility: 'convertible-locally', note: 'The Swedish krona is genuinely convertible, but mainly within Scandinavia — convert or spend before you leave.' },
  switzerland: { name: 'Switzerland', convertibility: 'freely-convertible', note: 'The Swiss franc is a major, widely-traded currency — leftover francs are easy to exchange virtually anywhere, with no rush.' },
  ireland: { name: 'Ireland', convertibility: 'freely-convertible', note: 'The euro is one of the world\'s most widely traded currencies — leftover euros are easy to exchange or spend anywhere, including at home, with no rush.' },
  'united-kingdom': { name: 'United Kingdom', convertibility: 'freely-convertible', note: 'The British pound is a major, widely-traded currency — leftover pounds are easy to exchange virtually anywhere, with no rush.' },
  turkey: { name: 'Turkey', convertibility: 'convertible-locally', note: 'The Turkish lira is convertible, but exchange rates outside Turkey are typically poor — convert before you leave rather than carrying it home.' },
  japan: { name: 'Japan', convertibility: 'freely-convertible', note: 'The Japanese yen is a major global currency — leftover yen are easy to exchange at any major bank or exchange counter, with no rush.' },
  thailand: { name: 'Thailand', convertibility: 'restricted', note: "The Thai baht has official export limits for cash leaving the country, and it's considered a restricted currency internationally — convert what you can before leaving rather than assuming you can exchange it easily back home." },
  indonesia: { name: 'Indonesia', convertibility: 'convertible-locally', note: 'The Indonesian rupiah is rarely exchanged outside Southeast Asia — convert or spend before you leave.' },
  singapore: { name: 'Singapore', convertibility: 'freely-convertible', note: 'The Singapore dollar is a major, widely-traded currency in Asia and beyond — leftover dollars are easy to exchange, with no rush.' },
  'south-korea': { name: 'South Korea', convertibility: 'convertible-locally', note: 'The South Korean won is genuinely convertible, but mainly within Korea or major Asian exchange hubs — convert or spend before you leave.' },
  'hong-kong': { name: 'Hong Kong', convertibility: 'freely-convertible', note: 'The Hong Kong dollar is a major, widely-traded currency — leftover dollars are easy to exchange virtually anywhere, with no rush.' },
  vietnam: { name: 'Vietnam', convertibility: 'non-convertible', note: 'The Vietnamese đồng is essentially non-convertible outside Vietnam and export is officially restricted — spend it before you leave rather than planning to exchange it later.' },
  philippines: { name: 'Philippines', convertibility: 'convertible-locally', note: 'The Philippine peso is genuinely convertible, but mainly within the Philippines or nearby regional hubs — convert or spend before you leave.' },
  malaysia: { name: 'Malaysia', convertibility: 'convertible-locally', note: 'The Malaysian ringgit is genuinely convertible, but mainly within Malaysia or regional hubs — convert or spend before you leave.' },
  china: { name: 'China', convertibility: 'restricted', note: "China maintains capital controls on the yuan, and converting it back typically requires proof of the original exchange — keep your exchange receipts, and convert within China before leaving rather than assuming it's straightforward elsewhere." },
  india: { name: 'India', convertibility: 'restricted', note: 'The Indian rupee export is officially capped and it\'s a restricted currency internationally — convert what you can before leaving India, ideally with your exchange receipts on hand.' },
  maldives: { name: 'Maldives', convertibility: 'non-convertible', note: 'The Maldivian rufiyaa is barely used by visitors, since US dollars are widely accepted at resorts — there\'s little reason to hold onto rufiyaa after your trip.' },
  taiwan: { name: 'Taiwan', convertibility: 'convertible-locally', note: 'The Taiwan dollar is genuinely convertible, but mainly within Taiwan — convert or spend before you leave.' },
  'sri-lanka': { name: 'Sri Lanka', convertibility: 'restricted', note: 'The Sri Lankan rupee has official export limits — convert what you can before leaving rather than planning to exchange it back home.' },
  cambodia: { name: 'Cambodia', convertibility: 'non-convertible', note: 'US dollars are used alongside (and often instead of) the Cambodian riel for most transactions — there\'s little reason to hold onto riel after your trip, since it\'s mainly used for small change.' },
  australia: { name: 'Australia', convertibility: 'freely-convertible', note: 'The Australian dollar is a major, widely-traded currency — leftover dollars are easy to exchange virtually anywhere, with no rush.' },
  'new-zealand': { name: 'New Zealand', convertibility: 'freely-convertible', note: 'The New Zealand dollar is a major, widely-traded currency — leftover dollars are easy to exchange virtually anywhere, with no rush.' },
  fiji: { name: 'Fiji', convertibility: 'convertible-locally', note: 'The Fijian dollar is genuinely convertible, but mainly within Fiji or nearby regional hubs — convert or spend before you leave.' },
  'french-polynesia': { name: 'French Polynesia', convertibility: 'convertible-locally', note: 'The CFP franc is pegged to the euro but mainly exchangeable within French Pacific territories or in France — convert or spend before you leave.' },
  mexico: { name: 'Mexico', convertibility: 'freely-convertible', note: 'The Mexican peso is a widely-traded currency, especially given proximity to the US — leftover pesos are easy to exchange, with no rush.' },
  'dominican-republic': { name: 'Dominican Republic', convertibility: 'non-convertible', note: 'The Dominican peso is difficult to exchange outside the country in practice — spend it before you leave rather than planning to convert it back home.' },
  'puerto-rico': { name: 'Puerto Rico', convertibility: 'freely-convertible', note: 'Puerto Rico uses the US dollar, so there\'s no currency conversion to worry about at all.' },
  bahamas: { name: 'Bahamas', convertibility: 'freely-convertible', note: 'The Bahamian dollar is pegged 1:1 to the US dollar and widely accepted alongside it — leftover cash is easy to use or exchange, with no rush.' },
  jamaica: { name: 'Jamaica', convertibility: 'convertible-locally', note: 'The Jamaican dollar is genuinely convertible, but mainly within Jamaica — convert or spend before you leave.' },
  aruba: { name: 'Aruba', convertibility: 'convertible-locally', note: 'The Aruban florin is genuinely convertible, but mainly within Aruba — convert or spend before you leave.' },
  'turks-and-caicos': { name: 'Turks and Caicos', convertibility: 'freely-convertible', note: 'Turks and Caicos uses the US dollar as its official currency, so there\'s no currency conversion to worry about at all.' },
  'st-lucia': { name: 'St. Lucia', convertibility: 'convertible-locally', note: 'The Eastern Caribbean dollar is genuinely convertible, but mainly within the Eastern Caribbean region — convert or spend before you leave.' },
  'costa-rica': { name: 'Costa Rica', convertibility: 'convertible-locally', note: 'The Costa Rican colón is genuinely convertible, but mainly within Costa Rica — convert or spend before you leave.' },
  panama: { name: 'Panama', convertibility: 'freely-convertible', note: 'Panama uses the US dollar alongside its own balboa, so there\'s essentially no currency conversion to worry about.' },
  belize: { name: 'Belize', convertibility: 'convertible-locally', note: 'The Belize dollar is genuinely convertible, but mainly within Belize — convert or spend before you leave.' },
  'cayman-islands': { name: 'Cayman Islands', convertibility: 'freely-convertible', note: 'The Cayman Islands dollar is a strong, well-regarded currency given the islands\' financial-hub status — leftover cash is easy to exchange, with no rush.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', convertibility: 'convertible-locally', note: 'The Eastern Caribbean dollar is genuinely convertible, but mainly within the Eastern Caribbean region — convert or spend before you leave.' },
  curacao: { name: 'Curaçao', convertibility: 'non-convertible', note: 'The Caribbean guilder is difficult to exchange outside Curaçao in practice — spend it before you leave rather than planning to convert it back home.' },
  canada: { name: 'Canada', convertibility: 'freely-convertible', note: 'The Canadian dollar is a major, widely-traded currency — leftover dollars are easy to exchange virtually anywhere, with no rush.' },
  'united-arab-emirates': { name: 'United Arab Emirates', convertibility: 'freely-convertible', note: 'The UAE dirham is pegged to the US dollar and widely traded — leftover dirhams are easy to exchange, with no rush.' },
  morocco: { name: 'Morocco', convertibility: 'restricted', note: 'The Moroccan dirham has official export restrictions and is not fully convertible outside Morocco — convert what you can before leaving, ideally with your exchange receipts on hand.' },
  'south-africa': { name: 'South Africa', convertibility: 'freely-convertible', note: 'The South African rand is a major, widely-traded currency — leftover rand are easy to exchange virtually anywhere, with no rush.' },
  qatar: { name: 'Qatar', convertibility: 'freely-convertible', note: 'The Qatari riyal is pegged to the US dollar and widely traded through major banks — leftover riyals are easy to exchange, with no rush.' },
  israel: { name: 'Israel', convertibility: 'convertible-locally', note: 'The Israeli shekel is genuinely convertible, but mainly within Israel — convert or spend before you leave.' },
  tanzania: { name: 'Tanzania', convertibility: 'convertible-locally', note: 'The Tanzanian shilling is genuinely convertible, but mainly within Tanzania — convert or spend before you leave.' },
  kenya: { name: 'Kenya', convertibility: 'convertible-locally', note: 'The Kenyan shilling is genuinely convertible, but mainly within Kenya — convert or spend before you leave.' },
  argentina: { name: 'Argentina', convertibility: 'restricted', note: "Argentina has significant currency controls and the peso's value has been genuinely volatile — keep exchange receipts, convert before leaving, and don't assume leftover pesos will hold their value or be easily exchangeable." },
  peru: { name: 'Peru', convertibility: 'convertible-locally', note: 'The Peruvian sol is genuinely convertible, but mainly within Peru — convert or spend before you leave.' },
  chile: { name: 'Chile', convertibility: 'convertible-locally', note: 'The Chilean peso is genuinely convertible, but mainly within Chile — convert or spend before you leave.' },
  colombia: { name: 'Colombia', convertibility: 'convertible-locally', note: 'The Colombian peso is genuinely convertible, but mainly within Colombia — convert or spend before you leave.' },
  brazil: { name: 'Brazil', convertibility: 'convertible-locally', note: 'The Brazilian real is genuinely convertible, but realistically easiest to exchange within Brazil — convert or spend before you leave.' },
  'united-states': { name: 'United States', convertibility: 'freely-convertible', note: 'The US dollar is the world\'s most widely traded and accepted currency — leftover dollars are easy to exchange or spend virtually anywhere, with no rush at all.' },
};

const CONVERTIBILITY_LABELS = {
  'freely-convertible': 'Freely Convertible — Exchange Anywhere, No Rush',
  'convertible-locally': 'Convertible Locally — Exchange Before You Leave',
  restricted: 'Restricted — Export Limits or Proof Required',
  'non-convertible': "Non-Convertible — Spend It, Don't Save It",
};

const DISCLAIMER = "Currency export rules and capital controls can change, and this reflects the general picture rather than a live regulatory check — for restricted or non-convertible currencies especially, confirm current rules and keep exchange receipts before you travel, particularly if you're carrying a meaningful amount of cash.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const convertibilityLabel = CONVERTIBILITY_LABELS[data.convertibility];
  const headline = `${data.name}: ${convertibilityLabel}.`;

  return {
    country, countryName: data.name, convertibility: data.convertibility, convertibilityLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/currency-convertibility-checker/calculate
// @access Public
exports.calculateCurrencyConvertibility = (req, res) => {
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
// @route POST /api/tools/currency-convertibility-checker/pdf
// @access Public
exports.generateCurrencyConvertibilityPdf = async (req, res) => {
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
      [email, firstName || null, 'currency-convertibility-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Leftover Currency Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="currency-convertibility-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.convertibilityLabel);

    pdfService.heading(doc, 'General leftover currency tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Keep your original currency-exchange receipts, especially in "restricted" destinations — some require proof of the original exchange to convert cash back.',
      'Airport exchange counters typically offer the worst rates of your entire trip — try to spend down small bills before your final day rather than converting them there.',
      'If a currency is genuinely non-convertible, consider spending leftover cash on something useful at the airport rather than bringing home coins and bills that will just sit in a drawer.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💱 Your ${result.countryName} leftover currency guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the currency convertibility check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond currency logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send currency-convertibility-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCurrencyConvertibilityPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
