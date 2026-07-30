const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Alcohol laws per country, reused from Tool #3's country list.
// status: 'freely_available' | 'restricted' | 'largely_dry'.
const COUNTRIES = {
  france: { name: 'France', status: 'freely_available', note: 'Widely sold in shops and restaurants — the legal drinking age is 18.' },
  austria: { name: 'Austria', status: 'freely_available', note: 'Widely available, with a notably low drinking age — 16 for beer and wine, 18 for spirits.' },
  'czech-republic': { name: 'Czech Republic', status: 'freely_available', note: 'Widely available and famously inexpensive — the legal drinking age is 18.' },
  denmark: { name: 'Denmark', status: 'freely_available', note: 'Widely available — the legal age is 16 for retail purchases under 16.5% strength, 18 for stronger drinks.' },
  germany: { name: 'Germany', status: 'freely_available', note: 'Widely available, with beer and wine legal from age 16 and spirits from 18.' },
  greece: { name: 'Greece', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, though it\'s not always strictly enforced.' },
  hungary: { name: 'Hungary', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  iceland: { name: 'Iceland', status: 'restricted', note: 'Anything above a low strength is sold only through the state-run Vínbúðin stores, which keep limited hours — bars and restaurants serve normally, but alcohol here is notably expensive.' },
  italy: { name: 'Italy', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  netherlands: { name: 'Netherlands', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  portugal: { name: 'Portugal', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  spain: { name: 'Spain', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  sweden: { name: 'Sweden', status: 'restricted', note: 'Anything above 3.5% is sold only through the state-run Systembolaget stores, which keep limited hours — bars and restaurants serve normally.' },
  switzerland: { name: 'Switzerland', status: 'freely_available', note: 'Widely available, with beer and wine legal from age 16 and spirits from 18.' },
  ireland: { name: 'Ireland', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'united-kingdom': { name: 'United Kingdom', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  turkey: { name: 'Turkey', status: 'restricted', note: 'Legal and widely available in tourist areas and licensed venues, but high taxes make it notably expensive, and there are restrictions on advertising and sales hours.' },
  japan: { name: 'Japan', status: 'freely_available', note: 'Widely available, including in vending machines and convenience stores — the legal drinking age is 20.' },
  thailand: { name: 'Thailand', status: 'restricted', note: 'Retail sales are restricted to set hours (typically 11am-2pm and 5pm-midnight), and sales are banned entirely on certain religious and election days — bars and restaurants generally follow their own licensed hours.' },
  indonesia: { name: 'Indonesia', status: 'restricted', note: "Widely available in Bali and tourist areas, but high taxes and regional restrictions apply elsewhere — some regions, like Aceh, are largely dry under local law." },
  singapore: { name: 'Singapore', status: 'restricted', note: 'Legal and widely available in licensed venues, but high taxes apply, and public drinking is banned nationwide from 10:30pm to 7am (with stricter rules in some designated zones).' },
  'south-korea': { name: 'South Korea', status: 'freely_available', note: 'Widely available, including in convenience stores — the legal drinking age is 19.' },
  'hong-kong': { name: 'Hong Kong', status: 'freely_available', note: 'Widely available with no alcohol tax on beer and wine — served to anyone 18+ in licensed premises.' },
  vietnam: { name: 'Vietnam', status: 'freely_available', note: 'Widely available — the legal drinking age is nominally 18, though it\'s not strictly enforced.' },
  philippines: { name: 'Philippines', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, though some local "dry" ordinances apply around elections.' },
  malaysia: { name: 'Malaysia', status: 'restricted', note: 'Widely available in tourist areas like Kuala Lumpur and Penang, but higher taxes apply, and some Muslim-majority states (like Kelantan and Terengganu) are largely dry under local law.' },
  china: { name: 'China', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, though it\'s not strictly enforced.' },
  india: { name: 'India', status: 'restricted', note: 'Laws vary dramatically by state — most states allow sales through licensed shops, but a few (including Gujarat and Bihar) are fully dry and require a permit for visitors.' },
  maldives: { name: 'Maldives', status: 'largely_dry', note: 'Alcohol is banned for the general public and on local islands — it\'s only available to tourists at licensed resort islands.' },
  taiwan: { name: 'Taiwan', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'restricted', note: 'Legal and available through government-licensed shops, but all liquor stores and bars close nationwide on Poya (full moon) days, roughly once a month.' },
  cambodia: { name: 'Cambodia', status: 'freely_available', note: 'Widely available with minimal enforcement of the nominal drinking age.' },
  australia: { name: 'Australia', status: 'freely_available', note: 'Widely available through licensed venues — the legal drinking age is 18.' },
  'new-zealand': { name: 'New Zealand', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  fiji: { name: 'Fiji', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, though some villages favor kava over alcohol.' },
  'french-polynesia': { name: 'French Polynesia', status: 'freely_available', note: 'Widely available, following standard French territorial regulations.' },
  mexico: { name: 'Mexico', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with some "ley seca" sales bans around election days.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, notably lower than the mainland US.' },
  bahamas: { name: 'Bahamas', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  jamaica: { name: 'Jamaica', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  aruba: { name: 'Aruba', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'st-lucia': { name: 'St. Lucia', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'costa-rica': { name: 'Costa Rica', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with "ley seca" sales bans around elections and part of Holy Week.' },
  panama: { name: 'Panama', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  belize: { name: 'Belize', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  curacao: { name: 'Curaçao', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  canada: { name: 'Canada', status: 'freely_available', note: 'Widely available — the legal drinking age is 18 or 19 depending on the province.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'restricted', note: 'Served freely to tourists in hotel bars and licensed restaurants across most emirates, though off-premise purchase can require a license — note that Sharjah is fully dry.' },
  morocco: { name: 'Morocco', status: 'restricted', note: 'Legal but sold mainly through licensed hotels, restaurants, and specific liquor stores — not available in stores during Ramadan daytime, and more restricted in smaller towns.' },
  'south-africa': { name: 'South Africa', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with some restrictions on Sunday retail sales.' },
  qatar: { name: 'Qatar', status: 'restricted', note: "Alcohol is legal only in licensed hotel bars and restaurants for tourists — it isn't sold in regular shops, and availability is notably more limited than in neighboring UAE." },
  israel: { name: 'Israel', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with limited sales near military bases and during some religious observances.' },
  tanzania: { name: 'Tanzania', status: 'freely_available', note: "Widely available on the mainland — the legal drinking age is 18. Predominantly Muslim Zanzibar is more restricted, though it's available at tourist hotels and resorts." },
  kenya: { name: 'Kenya', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, though some counties restrict retail sale hours.' },
  argentina: { name: 'Argentina', status: 'freely_available', note: 'Widely available — the legal drinking age is 18.' },
  peru: { name: 'Peru', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with "ley seca" sales bans on election days.' },
  chile: { name: 'Chile', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with sales bans on election days.' },
  colombia: { name: 'Colombia', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with "ley seca" sales bans on election days and some holidays.' },
  brazil: { name: 'Brazil', status: 'freely_available', note: 'Widely available — the legal drinking age is 18, with sales bans on election days.' },
  'united-states': { name: 'United States', status: 'freely_available', note: 'Sold in licensed stores, bars, and restaurants nationwide — the legal drinking age is 21, the highest in this list, and ID checks are strictly enforced. Some counties, mostly in the South, are fully dry.' },
};

const STATUS_LABELS = { freely_available: 'freely available', restricted: 'legal but restricted', largely_dry: 'largely off-limits to visitors' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}: alcohol is ${STATUS_LABELS[data.status]}.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel: STATUS_LABELS[data.status],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/alcohol-checker/calculate
// @access Public
exports.calculateAlcohol = (req, res) => {
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
// @route POST /api/tools/alcohol-checker/pdf
// @access Public
exports.generateAlcoholPdf = async (req, res) => {
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
      [email, firstName || null, 'alcohol-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Alcohol Laws Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="alcohol-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you go looking for a drink');
    pdfService.bulletList(doc, [
      result.status === 'largely_dry'
        ? 'Check with your hotel or resort about where alcohol is actually available — bringing your own in from duty-free may not be permitted either, so check import rules too.'
        : 'Check local sales hours before you head out — many countries restrict retail alcohol sales to specific windows, even where bars and restaurants serve freely.',
      'Carry ID — many countries check age at purchase regardless of how relaxed local drinking culture seems.',
      'Public drinking laws vary widely — what\'s fine in a park in one country can carry a real fine in another, so check local norms before opening a can on the street.',
      'If you\'re traveling during a national election or a major religious holiday, double-check for temporary sales bans — these are common and often not well publicized in advance.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍷 Your ${result.countryName} alcohol laws guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your alcohol check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond happy hour? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send alcohol-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAlcoholPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
