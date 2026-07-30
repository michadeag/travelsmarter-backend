const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Bargaining/haggling norms per destination — whether negotiating price is
// expected, situational, or considered inappropriate. Distinct from
// etiquetteController.js (general social etiquette, not money-specific) and
// touristScamsController.js (deception to avoid, not normal price
// negotiation). haggleLevel: 'expected' (haggling is the norm in markets,
// initial prices are routinely inflated for tourists) | 'sometimes' (works
// in informal markets/street stalls, not in stores or malls) | 'rare'
// (mostly fixed prices, occasional exception at flea/craft markets) |
// 'not-done' (fixed prices are the strong norm — attempting to haggle in a
// regular shop can come across as odd or rude).
const COUNTRIES = {
  france: { name: 'France', haggleLevel: 'rare', note: "Shops and restaurants have fixed prices — don't try. Flea markets (marchés aux puces) like Saint-Ouen in Paris are the one place where a polite counter-offer on unmarked antiques or secondhand goods is normal." },
  austria: { name: 'Austria', haggleLevel: 'not-done', note: 'Fixed prices everywhere, including markets — Austrians generally find haggling for everyday goods uncomfortable.' },
  'czech-republic': { name: 'Czech Republic', haggleLevel: 'not-done', note: 'Fixed prices are standard, including at tourist markets in Prague — asking for a discount is unusual outside of larger purchases like antiques.' },
  denmark: { name: 'Denmark', haggleLevel: 'not-done', note: 'Fixed prices are the strong norm — haggling is not part of Danish shopping culture, even at flea markets.' },
  germany: { name: 'Germany', haggleLevel: 'not-done', note: 'Fixed prices are the norm — the one common exception is flea markets (Flohmarkt), where a modest counter-offer is expected and normal.' },
  greece: { name: 'Greece', haggleLevel: 'sometimes', note: 'Souvenir shops and tavernas in heavily touristed areas will sometimes come down on price, especially for cash or multiple items — supermarkets and pharmacies are always fixed.' },
  hungary: { name: 'Hungary', haggleLevel: 'rare', note: 'Mostly fixed prices — the Great Market Hall in Budapest and smaller flea markets are the exception, where a light counter-offer is tolerated.' },
  iceland: { name: 'Iceland', haggleLevel: 'not-done', note: 'Fixed prices throughout — haggling is not part of Icelandic retail culture at all.' },
  italy: { name: 'Italy', haggleLevel: 'rare', note: "Regular shops are fixed-price, but street markets (Florence's San Lorenzo leather market, Naples street stalls) genuinely expect a counter-offer, especially for cash." },
  netherlands: { name: 'Netherlands', haggleLevel: 'not-done', note: 'Fixed prices are the norm — even the famous Amsterdam flower and flea markets rarely involve real negotiation.' },
  portugal: { name: 'Portugal', haggleLevel: 'rare', note: 'Mostly fixed prices — small souvenir stalls in tourist areas sometimes allow a modest discount for multiple items.' },
  spain: { name: 'Spain', haggleLevel: 'rare', note: "Shops are fixed-price, but flea markets like Madrid's El Rastro genuinely expect some back-and-forth on secondhand goods and crafts." },
  sweden: { name: 'Sweden', haggleLevel: 'not-done', note: 'Fixed prices throughout — haggling is not part of Swedish shopping culture.' },
  switzerland: { name: 'Switzerland', haggleLevel: 'not-done', note: 'Fixed prices are the strong norm — attempting to negotiate in a regular shop would be unusual.' },
  ireland: { name: 'Ireland', haggleLevel: 'not-done', note: 'Fixed prices are standard — the occasional exception is car boot sales, not typical tourist shopping.' },
  'united-kingdom': { name: 'United Kingdom', haggleLevel: 'not-done', note: 'Fixed prices are the norm — antiques markets and car boot sales are the rare exception where a counter-offer is acceptable.' },
  turkey: { name: 'Turkey', haggleLevel: 'expected', note: "Haggling is genuinely expected at the Grand Bazaar, Spice Bazaar, and most tourist shops — opening prices are routinely 2-3x what a local would pay. Fixed-price supermarkets and malls are the exception." },
  japan: { name: 'Japan', haggleLevel: 'not-done', note: "Fixed prices are a strong cultural norm — attempting to haggle, even at flea markets, is generally seen as inappropriate and can cause real discomfort for the seller." },
  thailand: { name: 'Thailand', haggleLevel: 'expected', note: 'Haggling is standard practice at markets like Chatuchak and with street vendors — opening prices for tourists are often 2-4x the expected final price. Malls and 7-Elevens are always fixed.' },
  indonesia: { name: 'Indonesia', haggleLevel: 'expected', note: "Bargaining is expected at markets and with street vendors across Bali and beyond — starting offers around 30-50% of the asking price is normal and not considered rude." },
  singapore: { name: 'Singapore', haggleLevel: 'sometimes', note: "Street markets like Chinatown and Bugis Street allow some negotiation, especially for electronics and souvenirs — malls and department stores are strictly fixed-price." },
  'south-korea': { name: 'South Korea', haggleLevel: 'rare', note: 'Traditional markets like Namdaemun and Dongdaemun sometimes allow a modest discount for cash or bulk purchases, but most retail is fixed-price.' },
  'hong-kong': { name: 'Hong Kong', haggleLevel: 'sometimes', note: "Electronics markets and street markets like the Ladies' Market genuinely expect negotiation — department stores and malls are fixed." },
  vietnam: { name: 'Vietnam', haggleLevel: 'expected', note: 'Haggling is standard at markets and with street vendors — foreign tourists are routinely quoted 2-5x local prices as an opening offer, so negotiating down is normal, not rude.' },
  philippines: { name: 'Philippines', haggleLevel: 'sometimes', note: 'Public markets (palengke) and tourist stalls allow negotiation, especially for multiple items — malls and convenience stores are fixed-price.' },
  malaysia: { name: 'Malaysia', haggleLevel: 'sometimes', note: 'Night markets (pasar malam) and tourist shops allow negotiation — shopping malls and chain stores are fixed-price.' },
  china: { name: 'China', haggleLevel: 'expected', note: "Tourist markets like Beijing's Silk Street or Shanghai's fake markets expect aggressive haggling — opening prices can be 5-10x the realistic final price. Regular retail and supermarkets are fixed." },
  india: { name: 'India', haggleLevel: 'expected', note: "Haggling is expected in markets, with auto-rickshaw/taxi drivers without a meter, and at tourist shops — opening prices for foreigners are routinely inflated 2-5x. Fixed-price government emporiums and malls are the exception." },
  maldives: { name: 'Maldives', haggleLevel: 'not-done', note: 'The resort-based economy runs on fixed, often all-inclusive pricing — there is little independent shopping culture to haggle in.' },
  taiwan: { name: 'Taiwan', haggleLevel: 'rare', note: 'Night markets occasionally allow a small discount for cash or bulk purchases, but most vendors and all regular retail are fixed-price.' },
  'sri-lanka': { name: 'Sri Lanka', haggleLevel: 'expected', note: 'Haggling is expected at markets, with tuk-tuk drivers, and at tourist shops — starting offers well below the asking price is normal practice.' },
  cambodia: { name: 'Cambodia', haggleLevel: 'expected', note: "Markets like Phnom Penh's Russian Market and vendors near Angkor Wat expect negotiation — tourist opening prices are routinely inflated." },
  australia: { name: 'Australia', haggleLevel: 'not-done', note: 'Fixed prices are the norm — the rare exception is market stalls, where a small discount on multiple items is sometimes possible.' },
  'new-zealand': { name: 'New Zealand', haggleLevel: 'not-done', note: 'Fixed prices throughout — haggling is not part of everyday retail culture.' },
  fiji: { name: 'Fiji', haggleLevel: 'sometimes', note: 'Local handicraft markets and roadside stalls allow some negotiation, especially for multiple items — resort shops are fixed-price.' },
  'french-polynesia': { name: 'French Polynesia', haggleLevel: 'rare', note: 'Mostly fixed prices — small local pearl and craft markets occasionally allow modest negotiation.' },
  mexico: { name: 'Mexico', haggleLevel: 'expected', note: "Markets (mercados, tianguis) and street vendors genuinely expect haggling — opening prices for tourists are often noticeably inflated. Supermarkets, malls, and formal stores are fixed-price." },
  'dominican-republic': { name: 'Dominican Republic', haggleLevel: 'sometimes', note: 'Street vendors and souvenir stalls near resorts and tourist zones allow negotiation — regular stores are fixed-price.' },
  'puerto-rico': { name: 'Puerto Rico', haggleLevel: 'rare', note: 'Mostly US-style fixed pricing — occasional negotiation is possible with independent artisan vendors, not standard retail.' },
  bahamas: { name: 'Bahamas', haggleLevel: 'sometimes', note: 'The straw markets in Nassau and Freeport genuinely expect negotiation — regular shops and resorts are fixed-price.' },
  jamaica: { name: 'Jamaica', haggleLevel: 'sometimes', note: 'Craft markets and roadside vendors allow negotiation, especially for multiple items — resort shops and stores are fixed-price.' },
  aruba: { name: 'Aruba', haggleLevel: 'rare', note: 'Mostly fixed prices — small local craft stalls occasionally allow modest negotiation.' },
  'turks-and-caicos': { name: 'Turks and Caicos', haggleLevel: 'rare', note: 'Mostly fixed prices, reflecting the resort-driven economy — some flexibility possible with independent local vendors.' },
  'st-lucia': { name: 'St. Lucia', haggleLevel: 'sometimes', note: 'Craft markets like Castries allow negotiation, especially for multiple items — resort shops and stores are fixed-price.' },
  'costa-rica': { name: 'Costa Rica', haggleLevel: 'sometimes', note: 'Artisan markets and independent souvenir stalls allow some negotiation — supermarkets and formal stores are fixed-price.' },
  panama: { name: 'Panama', haggleLevel: 'sometimes', note: 'Markets like the Mercado de Artesanías allow negotiation — malls and formal retail are fixed-price.' },
  belize: { name: 'Belize', haggleLevel: 'sometimes', note: 'Craft stalls and markets allow negotiation, especially for multiple items — regular stores are fixed-price.' },
  'cayman-islands': { name: 'Cayman Islands', haggleLevel: 'not-done', note: 'A largely US/UK-style fixed-price retail culture — haggling is not typical practice.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', haggleLevel: 'sometimes', note: 'Craft markets allow some negotiation, especially for multiple items — resort shops and stores are fixed-price.' },
  curacao: { name: 'Curaçao', haggleLevel: 'rare', note: 'Mostly fixed prices — the floating market in Willemstad occasionally allows modest negotiation on produce.' },
  canada: { name: 'Canada', haggleLevel: 'not-done', note: 'Fixed prices throughout — haggling is not part of everyday retail culture.' },
  'united-arab-emirates': { name: 'United Arab Emirates', haggleLevel: 'expected', note: "Haggling is genuinely expected at the Gold Souk, Spice Souk, and other traditional markets — starting well below the asking price is standard practice. Malls and chain stores are strictly fixed-price." },
  morocco: { name: 'Morocco', haggleLevel: 'expected', note: "Haggling is essential in medina souks — vendors expect it, and opening prices are routinely several times the realistic final price. Starting at roughly a third to half the asking price is a common approach." },
  'south-africa': { name: 'South Africa', haggleLevel: 'sometimes', note: 'Craft markets and curio stalls (especially those targeting tourists) allow negotiation — malls and formal retail are fixed-price.' },
  qatar: { name: 'Qatar', haggleLevel: 'sometimes', note: 'Souq Waqif and traditional markets allow some negotiation, particularly on textiles and souvenirs — malls and chain stores are strictly fixed-price.' },
  israel: { name: 'Israel', haggleLevel: 'expected', note: "Markets like Machane Yehuda in Jerusalem and stalls in the Old City genuinely expect haggling, especially later in the day — regular stores and supermarkets are fixed-price." },
  tanzania: { name: 'Tanzania', haggleLevel: 'expected', note: 'Markets and curio/souvenir shops expect negotiation — tourist opening prices are routinely inflated, so counter-offering is normal, not rude.' },
  kenya: { name: 'Kenya', haggleLevel: 'expected', note: 'Markets and curio shops expect negotiation — tourist opening prices are routinely inflated, particularly for safari souvenirs and crafts.' },
  argentina: { name: 'Argentina', haggleLevel: 'rare', note: 'Mostly fixed prices — craft fairs (ferias) like San Telmo in Buenos Aires occasionally allow modest negotiation.' },
  peru: { name: 'Peru', haggleLevel: 'expected', note: 'Markets, especially in tourist hubs like Cusco and around Machu Picchu, genuinely expect haggling — opening prices for foreigners are routinely inflated.' },
  chile: { name: 'Chile', haggleLevel: 'rare', note: 'Mostly fixed prices — craft markets occasionally allow modest negotiation, especially for multiple items.' },
  colombia: { name: 'Colombia', haggleLevel: 'sometimes', note: 'Markets and independent vendors allow negotiation, especially for handicrafts — malls and formal retail are fixed-price.' },
  brazil: { name: 'Brazil', haggleLevel: 'sometimes', note: 'Street markets (feiras) and beach vendors allow negotiation, especially for multiple items — malls and formal stores are fixed-price.' },
  'united-states': { name: 'United States', haggleLevel: 'not-done', note: 'Fixed prices are the strong norm — the recognized exceptions are cars, real estate, and garage/yard sales, not everyday shopping.' },
};

const HAGGLE_LABELS = {
  expected: 'Expected — Haggling Is the Norm',
  sometimes: 'Sometimes — Works in Markets, Not Stores',
  rare: 'Rare — Mostly Fixed, Occasional Exception',
  'not-done': 'Not Done — Fixed Prices Are the Norm',
};

const DISCLAIMER = "This reflects general local norms, not a rule for every seller or situation — always haggle with a smile, know when a price genuinely is fixed (posted price tags, receipts, government shops), and never negotiate over small amounts that matter far more to the seller than to you.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const haggleLabel = HAGGLE_LABELS[data.haggleLevel];
  const headline = `${data.name}: ${haggleLabel}.`;

  return {
    country, countryName: data.name, haggleLevel: data.haggleLevel, haggleLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/bargaining-checker/calculate
// @access Public
exports.calculateBargaining = (req, res) => {
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
// @route POST /api/tools/bargaining-checker/pdf
// @access Public
exports.generateBargainingPdf = async (req, res) => {
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
      [email, firstName || null, 'bargaining-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Bargaining & Haggling Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bargaining-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.haggleLabel);

    pdfService.heading(doc, 'General haggling tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Start well below what you\'re willing to pay, not just slightly below — you can only negotiate down from your opening offer, never up.',
      'Keep it friendly. Haggling is a social ritual in many cultures, not a confrontation — smiling and walking away (politely) is often what gets you the best price.',
      'Have small local-currency bills ready — showing you can\'t actually pay the agreed price because you only have large notes undermines the whole negotiation.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💬 Your ${result.countryName} bargaining guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the bargaining check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond bargaining? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send bargaining-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateBargainingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
