const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// ATM withdrawal fees + Dynamic Currency Conversion (DCC) prevalence per
// country. DCC is the "charge this in your home currency instead?" prompt
// at foreign ATMs/card terminals — always decline it, since it applies a
// worse exchange rate with a hidden markup, typically 3-10% worse than
// your card network's real rate. atmFeeLow/High are rough flat-fee USD
// estimates per withdrawal, independent of amount.
const COUNTRIES = {
  thailand: { name: 'Thailand', atmFeeLow: 6, atmFeeHigh: 7, dccRisk: 'common', note: 'Thai banks charge a well-known flat foreign card fee (around 220 THB) on every withdrawal regardless of amount — withdraw larger amounts less often to reduce the number of fees you pay.' },
  indonesia: { name: 'Indonesia', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'DCC prompts are extremely common at Bali ATMs and card terminals — always choose to be charged in Indonesian Rupiah, never your home currency.' },
  vietnam: { name: 'Vietnam', atmFeeLow: 2, atmFeeHigh: 4, dccRisk: 'common', note: 'Local bank ATMs sometimes have lower fees than foreign-bank-branded ones — Vietcombank ATMs are commonly cited as a lower-fee option.' },
  malaysia: { name: 'Malaysia', atmFeeLow: 2, atmFeeHigh: 4, dccRisk: 'occasional', note: 'Fees and DCC prompts vary by bank — Maybank and CIMB are commonly used by travelers.' },
  singapore: { name: 'Singapore', atmFeeLow: 3, atmFeeHigh: 5, dccRisk: 'occasional', note: 'A highly banked, low-cash economy — you may withdraw less often than in neighboring countries.' },
  philippines: { name: 'Philippines', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'Fees and withdrawal limits per transaction vary significantly by bank — BPI and BDO are commonly used.' },
  china: { name: 'China', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'occasional', note: 'Foreign cards work at Bank of China and ICBC ATMs, though acceptance can be inconsistent — mobile payment apps dominate daily transactions.' },
  india: { name: 'India', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'common', note: 'DCC prompts are common at both ATMs and card terminals — always decline and pay in Indian Rupees.' },
  japan: { name: 'Japan', atmFeeLow: 1, atmFeeHigh: 3, dccRisk: 'occasional', note: '7-Eleven (Seven Bank) ATMs are the most reliable and low-fee option for foreign cards, available nationwide.' },
  'south-korea': { name: 'South Korea', atmFeeLow: 2, atmFeeHigh: 4, dccRisk: 'occasional', note: 'Global ATMs at convenience stores (marked "Global" or with foreign card logos) are the most reliable option.' },

  france: { name: 'France', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'common', note: 'DCC prompts are frequent at both ATMs and card terminals in tourist areas — always choose to pay in euros.' },
  germany: { name: 'Germany', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'occasional', note: 'Germany remains relatively cash-heavy, so budget for more frequent withdrawals than in neighboring countries.' },
  italy: { name: 'Italy', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'DCC prompts are very frequent, especially in tourist centers — always choose to pay in euros, never your home currency.' },
  spain: { name: 'Spain', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'DCC prompts are very frequent, especially in tourist centers — always choose to pay in euros, never your home currency.' },
  netherlands: { name: 'Netherlands', atmFeeLow: 2, atmFeeHigh: 4, dccRisk: 'occasional', note: 'One of the more card-friendly, low-cash European countries.' },
  portugal: { name: 'Portugal', atmFeeLow: 2, atmFeeHigh: 4, dccRisk: 'common', note: 'Multibanco ATMs are widespread and reliable — still, always decline any DCC prompt.' },
  greece: { name: 'Greece', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'DCC prompts are common on the islands especially — always choose to pay in euros.' },
  austria: { name: 'Austria', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'occasional', note: 'Standard European ATM landscape — decline any DCC prompt.' },
  switzerland: { name: 'Switzerland', atmFeeLow: 4, atmFeeHigh: 7, dccRisk: 'occasional', note: 'Higher cost of living generally means higher flat ATM fees too, even relative to other Western European countries.' },
  iceland: { name: 'Iceland', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'A famously card-first economy — cards are accepted almost everywhere, but DCC prompts at card terminals are common, so watch for them.' },
  norway: { name: 'Norway', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'rare', note: 'One of the most cashless economies in the world — you may barely need to withdraw cash at all.' },
  sweden: { name: 'Sweden', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'rare', note: 'One of the most cashless economies in the world — you may barely need to withdraw cash at all.' },
  denmark: { name: 'Denmark', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'rare', note: 'One of the most cashless economies in the world — you may barely need to withdraw cash at all.' },
  poland: { name: 'Poland', atmFeeLow: 2, atmFeeHigh: 4, dccRisk: 'common', note: 'DCC prompts are common — always choose to pay in Polish Złoty, not your home currency.' },
  'czech-republic': { name: 'Czech Republic', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'common', note: 'Prague ATMs in particular are known for aggressive DCC prompts and sometimes poor default exchange rates — always decline and pay in Czech Koruna.' },
  turkey: { name: 'Turkey', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'DCC prompts are very common — always choose to pay in Turkish Lira, never your home currency.' },
  'united-kingdom': { name: 'United Kingdom', atmFeeLow: 0, atmFeeHigh: 3, dccRisk: 'occasional', note: 'Free ATMs (marked "no fee" or "free withdrawal") are widespread — avoid ATMs charging a flat fee where possible.' },

  'united-states': { name: 'United States', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'rare', note: 'Bank-branded ATMs sometimes charge both a network fee and your home bank\'s out-of-network fee — using your own bank\'s ATM network avoids double fees.' },
  canada: { name: 'Canada', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'rare', note: 'Similar to the US — using your own bank\'s ATM network avoids double fees.' },
  mexico: { name: 'Mexico', atmFeeLow: 3, atmFeeHigh: 8, dccRisk: 'common', note: 'Fees vary widely by bank — DCC prompts are very common, always choose to pay in Mexican Pesos.' },
  brazil: { name: 'Brazil', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'occasional', note: 'Foreign card acceptance at ATMs can be inconsistent — Banco24Horas and Bradesco are commonly cited as reliable options.' },
  argentina: { name: 'Argentina', atmFeeLow: 5, atmFeeHigh: 10, dccRisk: 'occasional', note: 'ATM withdrawal limits per transaction tend to be low, meaning more transactions (and more fees) for a given total amount — check current limits before your trip.' },
  chile: { name: 'Chile', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'occasional', note: 'Fees vary by bank — Banco Estado is commonly cited as a lower-fee option.' },
  colombia: { name: 'Colombia', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'occasional', note: 'Fees vary by bank — always decline any DCC prompt.' },
  peru: { name: 'Peru', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'occasional', note: 'Fees vary by bank — always decline any DCC prompt.' },
  'costa-rica': { name: 'Costa Rica', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'occasional', note: 'Fees vary by bank — always decline any DCC prompt.' },
  'dominican-republic': { name: 'Dominican Republic', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'common', note: 'DCC prompts are common at resort-area ATMs especially — always choose to pay in Dominican Pesos.' },

  'united-arab-emirates': { name: 'United Arab Emirates', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'common', note: 'DCC prompts are common at both ATMs and card terminals in Dubai especially — always choose to pay in Dirhams.' },
  'saudi-arabia': { name: 'Saudi Arabia', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'occasional', note: 'Fees vary by bank — always decline any DCC prompt.' },
  israel: { name: 'Israel', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'occasional', note: 'Fees vary by bank — always decline any DCC prompt.' },
  egypt: { name: 'Egypt', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'common', note: 'DCC prompts are common — always choose to pay in Egyptian Pounds, never your home currency.' },
  morocco: { name: 'Morocco', atmFeeLow: 3, atmFeeHigh: 7, dccRisk: 'common', note: 'DCC prompts are common — always choose to pay in Moroccan Dirhams.' },
  kenya: { name: 'Kenya', atmFeeLow: 4, atmFeeHigh: 8, dccRisk: 'occasional', note: 'Mobile money (M-Pesa) is widely used alongside cash — foreign card ATM access is more limited outside major cities.' },
  'south-africa': { name: 'South Africa', atmFeeLow: 3, atmFeeHigh: 6, dccRisk: 'occasional', note: 'Fees vary by bank — always decline any DCC prompt.' },
  nigeria: { name: 'Nigeria', atmFeeLow: 4, atmFeeHigh: 9, dccRisk: 'occasional', note: 'Foreign card ATM access is more limited than in many other countries — plan withdrawals in advance in major cities.' },

  australia: { name: 'Australia', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'occasional', note: 'DCC is legally required to be optional and clearly disclosed — you can always decline it and pay in Australian Dollars.' },
  'new-zealand': { name: 'New Zealand', atmFeeLow: 2, atmFeeHigh: 5, dccRisk: 'occasional', note: 'Similar to Australia — DCC must be optional and disclosed, always decline it.' },
};

function computeResult({ country, amount }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');
  const amountNum = parseFloat(amount);
  if (!amountNum || amountNum <= 0) throw new Error('A valid withdrawal amount is required');

  const feeLow = data.atmFeeLow;
  const feeHigh = data.atmFeeHigh;
  const rateLow = ((feeLow / amountNum) * 100).toFixed(1);
  const rateHigh = ((feeHigh / amountNum) * 100).toFixed(1);

  const headline = `Withdrawing $${amountNum} in ${data.name} typically costs $${feeLow}-${feeHigh} in ATM fees (about ${rateLow}-${rateHigh}% of the amount) — plus more if you accept a Dynamic Currency Conversion prompt.`;

  return {
    country, countryName: data.name, amount: amountNum, feeLow, feeHigh, rateLow, rateHigh,
    dccRisk: data.dccRisk, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/atm-fee-checker/calculate
// @access Public
exports.calculateAtmFee = (req, res) => {
  try {
    const { country, amount } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country, amount });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/atm-fee-checker/pdf
// @access Public
exports.generateAtmFeePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, country, amount } = req.body;
    if (!email || !country || !amount) {
      return res.status(400).json({ success: false, error: 'email, country and amount are required' });
    }

    const result = computeResult({ country, amount });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'atm-fee-checker',
        JSON.stringify({ country, amount }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} ATM Fee Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="atm-fee-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Dynamic Currency Conversion risk: ${result.dccRisk}`);

    pdfService.heading(doc, 'Before you withdraw');
    pdfService.bulletList(doc, [
      'Always choose to be charged in the local currency, never your home currency, when an ATM or card terminal asks — that "convenience" is Dynamic Currency Conversion, and it applies a worse exchange rate with a hidden markup.',
      'Withdraw larger amounts less frequently rather than small amounts often — flat ATM fees add up fast if you withdraw in small increments.',
      'Check whether your home bank has partner banks abroad or refunds foreign ATM fees — some travel-focused cards and accounts waive these fees entirely.',
      'Notify your bank of your travel dates before you go, so a foreign withdrawal doesn\'t get flagged as suspicious and blocked.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💳 Your ${result.countryName} ATM fee check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your ATM fee check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond ATM fees? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send atm-fee-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAtmFeePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
