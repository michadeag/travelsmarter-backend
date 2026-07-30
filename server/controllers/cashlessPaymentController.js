const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Card/contactless payment acceptance per country. cardAcceptance: 'high'
// (cards/contactless accepted almost everywhere) | 'moderate' (accepted
// at most established businesses, cash still common for small purchases)
// | 'low' (largely a cash economy). cashSituations describes where cash
// is still needed even in high-acceptance countries.
const COUNTRIES = {
  china: { name: 'China', cardAcceptance: 'low', cashSituations: 'small vendors, markets, and anywhere that only accepts Alipay/WeChat Pay or cash — foreign cards are often not accepted at all', note: 'China has largely moved to QR-code mobile payments (Alipay, WeChat Pay) rather than card swipes — foreign-issued Visa/Mastercard cards are frequently declined outside hotels and department stores. Setting up a mobile payment app before you arrive is often more useful than a card.' },
  'united-arab-emirates': { name: 'United Arab Emirates', cardAcceptance: 'high', cashSituations: 'tipping and small souks/markets', note: 'Cards and contactless are widely accepted, including in taxis, though tipping in cash is still customary.' },
  'saudi-arabia': { name: 'Saudi Arabia', cardAcceptance: 'high', cashSituations: 'tipping and small local shops', note: 'Saudi Arabia has rapidly modernized payments — contactless is now the norm in cities, though smaller local shops and tipping still favor cash.' },
  turkey: { name: 'Turkey', cardAcceptance: 'high', cashSituations: 'tipping, small vendors, and rural areas', note: 'Cards and contactless are widely accepted in cities and tourist areas, though cash remains common for tipping and smaller local businesses.' },
  vietnam: { name: 'Vietnam', cardAcceptance: 'low', cashSituations: 'street food, markets, taxis, and most small businesses', note: 'Vietnam remains largely cash-based outside hotels, malls, and higher-end restaurants — carry cash for everyday purchases, especially street food and local markets.' },
  egypt: { name: 'Egypt', cardAcceptance: 'moderate', cashSituations: 'tipping (baksheesh), markets, and taxis', note: 'Cards are accepted at hotels, resorts, and larger restaurants, but cash is essential for tipping (a strong local custom) and most everyday transactions.' },
  morocco: { name: 'Morocco', cardAcceptance: 'moderate', cashSituations: 'souks, taxis, and small riads', note: 'Cards work at hotels and larger shops, but cash is needed for souk bargaining, taxis, and many smaller guesthouses.' },
  india: { name: 'India', cardAcceptance: 'moderate', cashSituations: 'street food, markets, auto-rickshaws, and small shops', note: "India's UPI mobile payment system is extremely widespread among locals, but foreign cards work mainly at hotels, malls, and larger restaurants — carry cash for markets and rickshaws." },
  indonesia: { name: 'Indonesia', cardAcceptance: 'moderate', cashSituations: 'warungs (local eateries), markets, and taxi tips', note: 'Cards are accepted at hotels and malls in cities like Jakarta and Bali, but smaller local eateries and markets are cash-only.' },
  thailand: { name: 'Thailand', cardAcceptance: 'moderate', cashSituations: 'street food, markets, and tuk-tuk rides', note: 'Cards work at hotels, malls, and many restaurants in tourist areas, but street food stalls and local markets are typically cash-only.' },
  singapore: { name: 'Singapore', cardAcceptance: 'high', cashSituations: 'some hawker center stalls and small local shops', note: 'Singapore is one of the most cashless societies in the region — contactless and mobile payment are accepted almost everywhere, though a few hawker stalls remain cash-only.' },

  'united-states': { name: 'United States', cardAcceptance: 'high', cashSituations: 'tipping in some situations and small independent vendors', note: 'Cards and contactless are accepted almost everywhere, including taxis and small shops — cash is rarely essential except for some street vendors or cash tipping.' },
  canada: { name: 'Canada', cardAcceptance: 'high', cashSituations: 'small independent vendors and farmers markets', note: 'Cards and tap-to-pay are accepted almost everywhere in Canada — cash is rarely needed.' },
  mexico: { name: 'Mexico', cardAcceptance: 'moderate', cashSituations: 'street food, markets, taxis, and small towns', note: 'Cards are widely accepted in cities, hotels, and chain restaurants, but cash is still king for street food, local markets, and smaller towns.' },
  brazil: { name: 'Brazil', cardAcceptance: 'high', cashSituations: 'small local vendors and tipping', note: 'Brazil has embraced contactless and the Pix instant-payment system widely — cards work in most places, though small local vendors may still prefer cash.' },
  argentina: { name: 'Argentina', cardAcceptance: 'moderate', cashSituations: 'many everyday purchases, due to currency instability and card surcharges', note: "Argentina's economic volatility means many businesses prefer cash (often at a better exchange rate) — carrying US dollars in cash is common practice for travelers." },
  chile: { name: 'Chile', cardAcceptance: 'high', cashSituations: 'small local vendors and tipping', note: 'Cards and contactless are widely accepted across Chile, including in taxis and smaller shops.' },
  colombia: { name: 'Colombia', cardAcceptance: 'moderate', cashSituations: 'markets, small shops, and taxis', note: 'Cards are accepted at hotels, malls, and larger restaurants, but cash is still commonly used for markets, smaller shops, and taxis.' },
  peru: { name: 'Peru', cardAcceptance: 'moderate', cashSituations: 'markets, small restaurants, and rural areas', note: 'Cards work in Lima and tourist hubs like Cusco, but cash is essential for markets, smaller eateries, and rural areas.' },
  'costa-rica': { name: 'Costa Rica', cardAcceptance: 'high', cashSituations: 'small sodas (local eateries) and tipping', note: 'Cards are widely accepted across Costa Rica, including at many small businesses — cash is mainly useful for tipping and very small local eateries.' },

  'united-kingdom': { name: 'United Kingdom', cardAcceptance: 'high', cashSituations: 'small independent vendors and market stalls', note: 'The UK is highly cashless — contactless is the default almost everywhere, including public transport.' },
  ireland: { name: 'Ireland', cardAcceptance: 'high', cashSituations: 'small independent vendors', note: 'Cards and contactless are accepted almost everywhere in Ireland — cash is rarely needed.' },
  france: { name: 'France', cardAcceptance: 'high', cashSituations: 'small bakeries/markets and tipping', note: 'Cards are widely accepted, though some small bakeries, markets, and cafes still prefer cash for small amounts.' },
  germany: { name: 'Germany', cardAcceptance: 'moderate', cashSituations: 'many restaurants, cafes, and small shops, which surprisingly still prefer cash', note: "Germany is notably more cash-reliant than its neighbors — many restaurants and small businesses still don't accept cards, so carry cash as a backup." },
  italy: { name: 'Italy', cardAcceptance: 'high', cashSituations: 'small cafes and markets', note: 'Cards and contactless are widely accepted, though some very small cafes and markets may prefer cash for small purchases.' },
  spain: { name: 'Spain', cardAcceptance: 'high', cashSituations: 'small tapas bars and markets', note: 'Cards and contactless are widely accepted across Spain, including small tapas bars, though cash is handy for markets.' },
  netherlands: { name: 'Netherlands', cardAcceptance: 'high', cashSituations: 'very few situations — some small vendors', note: 'The Netherlands is highly cashless — debit cards and contactless (often preferred over cash) are accepted almost everywhere.' },
  portugal: { name: 'Portugal', cardAcceptance: 'high', cashSituations: 'small cafes and markets', note: 'Cards and contactless (via Multibanco) are widely accepted across Portugal.' },
  greece: { name: 'Greece', cardAcceptance: 'moderate', cashSituations: 'small tavernas, island shops, and taxis', note: 'Cards work in most cities and larger businesses, but smaller tavernas, island shops, and taxis (especially outside Athens) may prefer or require cash.' },
  austria: { name: 'Austria', cardAcceptance: 'moderate', cashSituations: 'small shops, cafes, and markets', note: 'Austria still leans more on cash than many neighbors — carry some for small shops and traditional cafes.' },
  switzerland: { name: 'Switzerland', cardAcceptance: 'high', cashSituations: 'small mountain huts and markets', note: 'Cards, contactless, and mobile payment are widely accepted across Switzerland, even in smaller towns.' },
  poland: { name: 'Poland', cardAcceptance: 'high', cashSituations: 'small local shops and markets', note: 'Poland has rapidly adopted contactless payment — cards are accepted almost everywhere in cities.' },
  'czech-republic': { name: 'Czech Republic', cardAcceptance: 'high', cashSituations: 'small shops and markets', note: "Cards and contactless are widely accepted in the Czech Republic, including in Prague's tourist areas." },
  norway: { name: 'Norway', cardAcceptance: 'high', cashSituations: 'almost none — Norway is nearly cashless', note: 'Norway is one of the most cashless societies in the world — cards and mobile payment are accepted virtually everywhere, and some businesses no longer accept cash at all.' },
  sweden: { name: 'Sweden', cardAcceptance: 'high', cashSituations: 'almost none — Sweden is nearly cashless', note: 'Sweden is famously cashless — cards and mobile payment are the default, and many businesses no longer accept cash at all.' },
  denmark: { name: 'Denmark', cardAcceptance: 'high', cashSituations: 'almost none', note: 'Denmark is highly cashless — cards and mobile payment are accepted almost everywhere.' },
  iceland: { name: 'Iceland', cardAcceptance: 'high', cashSituations: 'almost none', note: 'Iceland is nearly cashless — cards are accepted for even very small purchases, and carrying cash is rarely necessary.' },

  japan: { name: 'Japan', cardAcceptance: 'moderate', cashSituations: 'small restaurants, temples/shrines, rural areas, and some taxis', note: 'Japan is more cash-reliant than its tech reputation suggests — many small restaurants, temples, and rural businesses are cash-only, so carry yen.' },
  'south-korea': { name: 'South Korea', cardAcceptance: 'high', cashSituations: 'small traditional markets', note: 'South Korea has excellent card and contactless acceptance almost everywhere, including convenience stores and taxis.' },
  malaysia: { name: 'Malaysia', cardAcceptance: 'moderate', cashSituations: 'hawker stalls, markets, and small shops', note: 'Cards are accepted at malls, hotels, and chain restaurants, but hawker stalls and local markets typically expect cash.' },
  philippines: { name: 'Philippines', cardAcceptance: 'moderate', cashSituations: 'markets, jeepneys/tricycles, and small local eateries', note: 'Cards work in malls and hotels, but cash is essential for local transport, markets, and small eateries.' },

  israel: { name: 'Israel', cardAcceptance: 'high', cashSituations: 'small shops and markets', note: 'Cards and contactless are widely accepted across Israel, including in taxis.' },
  jordan: { name: 'Jordan', cardAcceptance: 'moderate', cashSituations: 'markets, taxis, and small shops', note: 'Cards are accepted at hotels and larger restaurants, but cash is needed for taxis, markets, and smaller vendors.' },
  kenya: { name: 'Kenya', cardAcceptance: 'moderate', cashSituations: 'markets, matatus (minibuses), and small vendors', note: 'Kenya has widespread mobile money (M-Pesa) among locals, but foreign cards mainly work at hotels and larger businesses — cash or a local mobile money setup helps for everyday purchases.' },
  'south-africa': { name: 'South Africa', cardAcceptance: 'high', cashSituations: 'small vendors and tipping', note: 'Cards and contactless are widely accepted across South Africa, including at most restaurants and shops.' },

  australia: { name: 'Australia', cardAcceptance: 'high', cashSituations: 'small independent vendors and markets', note: 'Australia is highly cashless — contactless is the default almost everywhere, including taxis and market stalls.' },
  'new-zealand': { name: 'New Zealand', cardAcceptance: 'high', cashSituations: 'small independent vendors', note: 'Cards and contactless (EFTPOS) are widely accepted across New Zealand, including in smaller towns.' },
};

const CARD_LABELS = {
  high: 'high — cards and contactless are accepted almost everywhere, including small vendors and taxis',
  moderate: 'moderate — accepted at most hotels, restaurants, and shops, but cash is still common for smaller purchases',
  low: 'low — this is largely a cash economy, with cards mainly accepted at hotels and higher-end venues',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s card acceptance is ${CARD_LABELS[data.cardAcceptance]}. Keep cash on hand for ${data.cashSituations}.`;

  return {
    country, countryName: data.name, cardAcceptance: data.cardAcceptance,
    cardAcceptanceLabel: CARD_LABELS[data.cardAcceptance], cashSituations: data.cashSituations, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/cashless-payment-checker/calculate
// @access Public
exports.calculateCashlessPayment = (req, res) => {
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
// @route POST /api/tools/cashless-payment-checker/pdf
// @access Public
exports.generateCashlessPaymentPdf = async (req, res) => {
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
      [email, firstName || null, 'cashless-payment-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Card & Cash Payment Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cashless-payment-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Card acceptance: ${result.cardAcceptanceLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.cardAcceptance === 'low'
        ? "Plan on cash as your primary payment method here — set up a local mobile payment app if one exists, and withdraw cash from ATMs on arrival rather than relying on card swipes."
        : "Bring a card with no foreign transaction fees, and enable it for international use before you fly — most banks require a heads-up or the card gets blocked on first use abroad.",
      `Carry some local cash for: ${result.cashSituations}.`,
      'Keep a small backup cash reserve even in highly cashless countries — card readers do occasionally go down, and rural or remote spots have less reliable connectivity.',
      'Payment norms shift quickly (mobile payment adoption especially) — this guide reflects general current patterns, so it\'s still worth asking locally on arrival.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💳 Your ${result.countryName} card & cash payment guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your card and cash payment check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond payment logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send cashless-payment-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCashlessPaymentPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
