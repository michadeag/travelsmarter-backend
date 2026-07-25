const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Currency and cash-vs-card culture per country, reused from Tool #3's
// country list. cashCulture: 'cash_preferred' | 'mixed' | 'card_friendly'.
const COUNTRIES = {
  france: { name: 'France', currencyName: 'Euro (EUR)', cashCulture: 'card_friendly', note: 'Contactless cards are accepted almost everywhere, including small cafés — carrying more than a little cash is rarely necessary.' },
  austria: { name: 'Austria', currencyName: 'Euro (EUR)', cashCulture: 'card_friendly', note: 'Cards are widely accepted, though some smaller traditional restaurants and market stalls still prefer cash.' },
  'czech-republic': { name: 'Czech Republic', currencyName: 'Czech Koruna (CZK)', cashCulture: 'mixed', note: "The Czech Republic uses its own currency, not the euro, despite being in the EU — cards work well in Prague, but smaller towns and markets often expect cash." },
  denmark: { name: 'Denmark', currencyName: 'Danish Krone (DKK)', cashCulture: 'card_friendly', note: "Denmark uses its own krone, not the euro — one of the most cashless societies in the world, cards and mobile pay work almost everywhere." },
  germany: { name: 'Germany', currencyName: 'Euro (EUR)', cashCulture: 'mixed', note: 'Germany is famously more cash-preferring than its Western European neighbors — many restaurants, bakeries, and small shops are cash-only or card-limited, so keep some euros on hand.' },
  greece: { name: 'Greece', currencyName: 'Euro (EUR)', cashCulture: 'mixed', note: 'Cards work well in Athens and hotels, but smaller tavernas, markets, and island shops often prefer or require cash.' },
  hungary: { name: 'Hungary', currencyName: 'Hungarian Forint (HUF)', cashCulture: 'mixed', note: 'Cards are common in Budapest, but smaller towns, markets, and some taxis still expect forints in cash.' },
  iceland: { name: 'Iceland', currencyName: 'Icelandic Króna (ISK)', cashCulture: 'card_friendly', note: "Iceland is one of the most cashless societies anywhere — cards are accepted virtually everywhere, even for tiny purchases." },
  italy: { name: 'Italy', currencyName: 'Euro (EUR)', cashCulture: 'mixed', note: "Cards are widely accepted now, but smaller trattorias, markets, and some historic towns still lean cash — some have a minimum card purchase amount." },
  netherlands: { name: 'Netherlands', currencyName: 'Euro (EUR)', cashCulture: 'card_friendly', note: 'Extremely card and contactless friendly — some shops don\'t accept cash at all, and locals mostly use debit (Maestro) over credit.' },
  portugal: { name: 'Portugal', currencyName: 'Euro (EUR)', cashCulture: 'card_friendly', note: 'Cards, including the local Multibanco system, are accepted almost everywhere, even for small amounts.' },
  spain: { name: 'Spain', currencyName: 'Euro (EUR)', cashCulture: 'card_friendly', note: 'Cards are widely accepted throughout, though a bit of cash is handy for small tapas bars and markets.' },
  sweden: { name: 'Sweden', currencyName: 'Swedish Krona (SEK)', cashCulture: 'card_friendly', note: "One of the most cashless societies in the world — some businesses refuse cash entirely, so a card is essential." },
  switzerland: { name: 'Switzerland', currencyName: 'Swiss Franc (CHF)', cashCulture: 'mixed', note: 'Cards are widely accepted, but the Swiss still use cash more than most of their neighbors — keep some francs handy for smaller purchases and mountain huts.' },
  ireland: { name: 'Ireland', currencyName: 'Euro (EUR)', cashCulture: 'card_friendly', note: 'Cards and contactless payment are accepted almost everywhere, including pubs.' },
  'united-kingdom': { name: 'United Kingdom', currencyName: 'British Pound (GBP)', cashCulture: 'card_friendly', note: 'Extremely card-friendly — contactless is the norm even for a single coffee, and cash is barely needed.' },
  turkey: { name: 'Turkey', currencyName: 'Turkish Lira (TRY)', cashCulture: 'mixed', note: 'Cards work in cities and tourist areas, but bazaars, small vendors, and some taxis prefer cash — note the lira has seen significant inflation and volatility in recent years.' },
  japan: { name: 'Japan', currencyName: 'Japanese Yen (JPY)', cashCulture: 'mixed', note: "Despite its tech reputation, Japan is still surprisingly cash-heavy — many small restaurants, shrines, and rural areas are cash-only." },
  thailand: { name: 'Thailand', currencyName: 'Thai Baht (THB)', cashCulture: 'mixed', note: 'Cards work in hotels and malls, but street food, markets, and most taxis expect cash.' },
  indonesia: { name: 'Indonesia', currencyName: 'Indonesian Rupiah (IDR)', cashCulture: 'cash_preferred', note: 'Cash is essential outside Bali\'s main tourist areas — many warungs, markets, and local transport don\'t take cards at all.' },
  singapore: { name: 'Singapore', currencyName: 'Singapore Dollar (SGD)', cashCulture: 'card_friendly', note: 'Highly card and contactless friendly, including the widely used EZ-Link transit card.' },
  'south-korea': { name: 'South Korea', currencyName: 'South Korean Won (KRW)', cashCulture: 'card_friendly', note: 'Very card-friendly — the T-money transit card also doubles as a small-purchase payment card at convenience stores.' },
  'hong-kong': { name: 'Hong Kong', currencyName: 'Hong Kong Dollar (HKD)', cashCulture: 'card_friendly', note: 'Very cashless — the Octopus card is used everywhere from transit to convenience stores, alongside standard card acceptance.' },
  vietnam: { name: 'Vietnam', currencyName: 'Vietnamese Dong (VND)', cashCulture: 'cash_preferred', note: 'Cash still dominates outside hotels and upscale restaurants — carry dong for markets, street food, and most taxis.' },
  philippines: { name: 'Philippines', currencyName: 'Philippine Peso (PHP)', cashCulture: 'mixed', note: 'Cards work in malls and hotels, but markets, jeepneys, and smaller eateries expect cash.' },
  malaysia: { name: 'Malaysia', currencyName: 'Malaysian Ringgit (MYR)', cashCulture: 'mixed', note: 'Cards are common in Kuala Lumpur and malls, but hawker stalls and smaller shops often prefer cash.' },
  china: { name: 'China', currencyName: 'Chinese Yuan/Renminbi (CNY)', cashCulture: 'mixed', note: 'Mobile payment apps (Alipay/WeChat Pay) dominate over both cash and cards domestically — foreign credit cards are accepted less widely than in most other major destinations, so plan for cash as a backup.' },
  india: { name: 'India', currencyName: 'Indian Rupee (INR)', cashCulture: 'cash_preferred', note: 'Foreign cards are accepted mainly at hotels, malls, and upscale restaurants — cash (rupees) is essential for markets, small vendors, and most local transport.' },
  maldives: { name: 'Maldives', currencyName: 'Maldivian Rufiyaa (MVR)', cashCulture: 'card_friendly', note: 'Resorts mostly run on card payments, and US dollars are widely accepted alongside the local rufiyaa.' },
  taiwan: { name: 'Taiwan', currencyName: 'New Taiwan Dollar (TWD)', cashCulture: 'mixed', note: 'Cards work in cities, but night markets and smaller vendors are largely cash-based.' },
  'sri-lanka': { name: 'Sri Lanka', currencyName: 'Sri Lankan Rupee (LKR)', cashCulture: 'cash_preferred', note: 'Cash is essential outside hotels and upscale restaurants — carry rupees for markets, tuk-tuks, and smaller shops.' },
  cambodia: { name: 'Cambodia', currencyName: 'US Dollar (USD), alongside Cambodian Riel (KHR)', cashCulture: 'cash_preferred', note: 'Cambodia runs largely on US dollar cash for anything above small change — riel is mainly used for amounts under a dollar.' },
  australia: { name: 'Australia', currencyName: 'Australian Dollar (AUD)', cashCulture: 'card_friendly', note: 'Extremely card-friendly — contactless payment is the default almost everywhere, even for small purchases.' },
  'new-zealand': { name: 'New Zealand', currencyName: 'New Zealand Dollar (NZD)', cashCulture: 'card_friendly', note: 'Very card-friendly — contactless payment is widely used, even in smaller towns.' },
  fiji: { name: 'Fiji', currencyName: 'Fijian Dollar (FJD)', cashCulture: 'mixed', note: 'Resorts and hotels take cards, but local markets and smaller shops expect cash.' },
  'french-polynesia': { name: 'French Polynesia', currencyName: 'CFP Franc (XPF)', cashCulture: 'mixed', note: 'Resorts and larger shops take cards, but smaller local vendors and outer-island stops often expect cash.' },
  mexico: { name: 'Mexico', currencyName: 'Mexican Peso (MXN)', cashCulture: 'mixed', note: 'Cards work in cities and resorts, but markets, street food, and many taxis expect pesos in cash.' },
  'dominican-republic': { name: 'Dominican Republic', currencyName: 'Dominican Peso (DOP)', cashCulture: 'mixed', note: 'Resorts widely accept cards and US dollars, but local vendors and taxis outside resort areas expect cash pesos.' },
  'puerto-rico': { name: 'Puerto Rico', currencyName: 'US Dollar (USD)', cashCulture: 'card_friendly', note: "Puerto Rico uses the US dollar and US card networks — no currency exchange or special cash planning needed." },
  bahamas: { name: 'Bahamas', currencyName: 'Bahamian Dollar (BSD)', cashCulture: 'card_friendly', note: "The Bahamian dollar is pegged 1:1 to the US dollar, and US dollars are accepted everywhere alongside cards." },
  jamaica: { name: 'Jamaica', currencyName: 'Jamaican Dollar (JMD)', cashCulture: 'mixed', note: 'US dollars and cards are widely accepted in tourist areas, but local markets and smaller vendors expect Jamaican dollars in cash.' },
  aruba: { name: 'Aruba', currencyName: 'Aruban Florin (AWG)', cashCulture: 'card_friendly', note: 'US dollars and cards are both widely accepted throughout the island alongside the local florin.' },
  'turks-and-caicos': { name: 'Turks and Caicos', currencyName: 'US Dollar (USD)', cashCulture: 'card_friendly', note: "The US dollar is the official currency — no currency exchange or special cash planning needed." },
  'st-lucia': { name: 'St. Lucia', currencyName: 'Eastern Caribbean Dollar (XCD)', cashCulture: 'mixed', note: 'US dollars and cards are widely accepted at resorts, but local vendors and smaller shops expect Eastern Caribbean dollars in cash.' },
  'costa-rica': { name: 'Costa Rica', currencyName: 'Costa Rican Colón (CRC)', cashCulture: 'mixed', note: 'US dollars and cards are widely accepted in tourist areas, but smaller sodas (local eateries) and rural areas expect colones in cash.' },
  panama: { name: 'Panama', currencyName: 'US Dollar (USD)', cashCulture: 'card_friendly', note: "The US dollar is legal tender (alongside the Balboa, pegged 1:1) — no currency exchange needed." },
  belize: { name: 'Belize', currencyName: 'Belize Dollar (BZD)', cashCulture: 'mixed', note: 'The Belize dollar is pegged to the US dollar and both are widely accepted, but smaller vendors and rural areas still lean cash.' },
  'cayman-islands': { name: 'Cayman Islands', currencyName: 'Cayman Islands Dollar (KYD)', cashCulture: 'card_friendly', note: 'Cards are widely accepted throughout, alongside US dollars.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', currencyName: 'Eastern Caribbean Dollar (XCD)', cashCulture: 'mixed', note: 'Resorts and hotels take cards and US dollars, but local vendors expect Eastern Caribbean dollars in cash.' },
  curacao: { name: 'Curaçao', currencyName: 'Netherlands Antillean Guilder (ANG)', cashCulture: 'card_friendly', note: 'Cards and US dollars are both widely accepted alongside the local guilder.' },
  canada: { name: 'Canada', currencyName: 'Canadian Dollar (CAD)', cashCulture: 'card_friendly', note: 'Extremely card-friendly — contactless payment (tap) is the default nearly everywhere.' },
  'united-arab-emirates': { name: 'United Arab Emirates', currencyName: 'UAE Dirham (AED)', cashCulture: 'card_friendly', note: 'Very card-friendly in Dubai and Abu Dhabi, though smaller souks and taxis sometimes prefer cash.' },
  morocco: { name: 'Morocco', currencyName: 'Moroccan Dirham (MAD)', cashCulture: 'cash_preferred', note: 'Cash is essential for markets (souks) and smaller vendors — note the dirham is a closed currency, meaning you can\'t obtain or exchange it before arriving or after leaving.' },
  'south-africa': { name: 'South Africa', currencyName: 'South African Rand (ZAR)', cashCulture: 'mixed', note: 'Cards work well in cities and malls, but smaller vendors, markets, and tipping situations often call for rand in cash.' },
  qatar: { name: 'Qatar', currencyName: 'Qatari Riyal (QAR)', cashCulture: 'card_friendly', note: 'Very card-friendly in Doha, with cash mainly useful for souks and smaller vendors.' },
  israel: { name: 'Israel', currencyName: 'Israeli New Shekel (ILS)', cashCulture: 'card_friendly', note: 'Very card-friendly throughout, including contactless payment in most shops and restaurants.' },
  tanzania: { name: 'Tanzania', currencyName: 'Tanzanian Shilling (TZS)', cashCulture: 'cash_preferred', note: 'Cash (often US dollars for park fees and safari costs, shillings for everyday purchases) is essential — card acceptance is limited outside upscale hotels.' },
  kenya: { name: 'Kenya', currencyName: 'Kenyan Shilling (KES)', cashCulture: 'mixed', note: 'M-Pesa mobile money dominates domestically and is worth understanding, while cards work at hotels and upscale restaurants — carry shillings in cash as backup.' },
  argentina: { name: 'Argentina', currencyName: 'Argentine Peso (ARS)', cashCulture: 'cash_preferred', note: "Argentina's currency situation is complex and volatile — many travelers bring US dollars in cash, since official versus informal exchange rates can differ significantly." },
  peru: { name: 'Peru', currencyName: 'Peruvian Sol (PEN)', cashCulture: 'mixed', note: 'Cards work in Lima and tourist hubs like Cusco, but markets and smaller towns expect soles in cash.' },
  chile: { name: 'Chile', currencyName: 'Chilean Peso (CLP)', cashCulture: 'card_friendly', note: 'Cards are widely accepted throughout, including contactless payment in most cities.' },
  colombia: { name: 'Colombia', currencyName: 'Colombian Peso (COP)', cashCulture: 'mixed', note: 'Cards work well in Bogotá and Medellín, but markets and smaller towns expect pesos in cash.' },
  brazil: { name: 'Brazil', currencyName: 'Brazilian Real (BRL)', cashCulture: 'mixed', note: 'Cards (including the local Pix instant-payment system) work well in cities, but smaller vendors and beach areas often expect reais in cash.' },
};

const CASH_CULTURE_LABELS = { cash_preferred: 'cash is still king', mixed: 'a mix of cash and card', card_friendly: 'cards work almost everywhere' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name} uses the ${data.currencyName} — ${CASH_CULTURE_LABELS[data.cashCulture]}.`;

  return {
    country, countryName: data.name, currencyName: data.currencyName,
    cashCulture: data.cashCulture, cashCultureLabel: CASH_CULTURE_LABELS[data.cashCulture],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/currency-checker/calculate
// @access Public
exports.calculateCurrency = (req, res) => {
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
// @route POST /api/tools/currency-checker/pdf
// @access Public
exports.generateCurrencyPdf = async (req, res) => {
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
      [email, firstName || null, 'currency-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Currency & Cash Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="currency-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.cashCultureLabel);

    pdfService.heading(doc, 'Before you land');
    pdfService.bulletList(doc, [
      'Notify your bank of travel dates so a foreign charge doesn\'t trigger a fraud freeze on your card.',
      'Use ATMs attached to actual banks rather than standalone kiosks — they typically charge lower fees and are less prone to card skimming.',
      'Always choose to be charged in the local currency, not your home currency, when a card terminal or ATM asks — "dynamic currency conversion" almost always carries a worse exchange rate.',
      'Carry a mix of small bills for tips, taxis, and markets — breaking a large bill is often harder than it sounds.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💳 Your ${result.countryName} currency guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your currency check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond cash and cards? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send currency-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCurrencyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
