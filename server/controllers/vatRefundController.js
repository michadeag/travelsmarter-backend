const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// VAT/GST tourist refund availability per country. refundAvailable:
// 'yes' (a general tourist refund scheme exists) | 'no' (no general
// scheme — either never had one, or abolished it). vatRate is the
// standard rate; minimumSpend only applies when a refund scheme exists.
const COUNTRIES = {
  china: { name: 'China', refundAvailable: 'yes', vatRate: 13, minimumSpend: '¥500 per store per day', note: 'China\'s tourist refund scheme is limited to designated stores in select pilot cities (Beijing, Shanghai, Hainan, and others) — look for "Tax Free" signage rather than assuming any shop qualifies.' },
  'united-arab-emirates': { name: 'United Arab Emirates', refundAvailable: 'yes', vatRate: 5, minimumSpend: 'AED 250', note: 'The UAE runs a well-established digital tax-free system — register your purchases in-store and validate at the airport before departure.' },
  'saudi-arabia': { name: 'Saudi Arabia', refundAvailable: 'yes', vatRate: 15, minimumSpend: 'SAR 250 (approximate)', note: 'Saudi Arabia introduced a tourist VAT refund scheme in 2021 — purchases must be from registered retailers and validated before departure.' },
  turkey: { name: 'Turkey', refundAvailable: 'yes', vatRate: 18, minimumSpend: 'varies by store (often around TRY 100+)', note: 'Turkey has long offered tax-free shopping — look for "Tax Free" shop signage and get your form stamped at customs before checking in your luggage.' },
  vietnam: { name: 'Vietnam', refundAvailable: 'yes', vatRate: 10, minimumSpend: 'VND 2,000,000', note: 'Refunds are processed at international airport refund counters — keep receipts and goods accessible for inspection before check-in.' },
  egypt: { name: 'Egypt', refundAvailable: 'no', vatRate: 14, minimumSpend: null, note: 'Egypt does not currently offer a general, reliable tourist VAT refund scheme.' },
  morocco: { name: 'Morocco', refundAvailable: 'no', vatRate: 20, minimumSpend: null, note: 'Morocco does not offer a general tourist VAT refund scheme.' },
  india: { name: 'India', refundAvailable: 'no', vatRate: 18, minimumSpend: null, note: 'India does not currently operate a functioning tourist GST refund scheme at scale, despite occasional proposals.' },
  indonesia: { name: 'Indonesia', refundAvailable: 'yes', vatRate: 11, minimumSpend: 'IDR 500,000 per receipt', note: 'Refunds are available at major international airports (Bali/Denpasar, Jakarta) for purchases from VAT-registered stores.' },
  thailand: { name: 'Thailand', refundAvailable: 'yes', vatRate: 7, minimumSpend: 'THB 2,000 per store, THB 2,000 total minimum claim', note: 'Get your VAT refund form stamped by customs before check-in if your goods are for carry-on inspection — some purchases require showing the physical item.' },
  singapore: { name: 'Singapore', refundAvailable: 'yes', vatRate: 9, minimumSpend: 'SGD 100', note: 'Singapore uses an electronic tourist refund scheme (eTRS) — most purchases are tracked digitally rather than needing paper forms.' },
  'united-states': { name: 'United States', refundAvailable: 'no', vatRate: 0, minimumSpend: null, note: 'The US has no federal VAT — sales tax varies by state and there is no national tourist refund scheme (a small number of individual retailers offer limited programs, but nothing standardized).' },
  canada: { name: 'Canada', refundAvailable: 'no', vatRate: 5, minimumSpend: null, note: "Canada's federal GST refund for visitors was cancelled in 2007 and has not been reinstated." },
  mexico: { name: 'Mexico', refundAvailable: 'yes', vatRate: 16, minimumSpend: 'MXN 1,200', note: 'Refunds are available at major international airports for purchases from participating stores — keep your passport handy when shopping.' },
  brazil: { name: 'Brazil', refundAvailable: 'no', vatRate: 17, minimumSpend: null, note: 'Brazil does not have a reliable, widely available general tourist VAT refund scheme.' },
  argentina: { name: 'Argentina', refundAvailable: 'yes', vatRate: 21, minimumSpend: 'varies by retailer', note: 'A tax-free shopping scheme is available through participating retailers, with refund processing at major airports.' },
  chile: { name: 'Chile', refundAvailable: 'no', vatRate: 19, minimumSpend: null, note: 'Chile does not offer a general tourist VAT refund scheme.' },
  colombia: { name: 'Colombia', refundAvailable: 'no', vatRate: 19, minimumSpend: null, note: 'Colombia does not offer a reliable, general tourist VAT refund scheme.' },
  peru: { name: 'Peru', refundAvailable: 'no', vatRate: 18, minimumSpend: null, note: 'Peru does not offer a general tourist VAT refund scheme.' },
  'costa-rica': { name: 'Costa Rica', refundAvailable: 'no', vatRate: 13, minimumSpend: null, note: 'Costa Rica does not offer a general tourist VAT refund scheme.' },
  'united-kingdom': { name: 'United Kingdom', refundAvailable: 'no', vatRate: 20, minimumSpend: null, note: "The UK abolished tax-free shopping for tourists in January 2021 (post-Brexit) — many travelers are still surprised by this, since it was widely available before then." },
  ireland: { name: 'Ireland', refundAvailable: 'yes', vatRate: 23, minimumSpend: 'no strict minimum', note: 'As an EU member, Ireland offers VAT refunds on qualifying purchases — validate your forms at customs before leaving the EU.' },
  france: { name: 'France', refundAvailable: 'yes', vatRate: 20, minimumSpend: '€100.01 per store, same day', note: 'Use the PABLO electronic validation kiosks at the airport before check-in — it\'s faster than the paper stamp process.' },
  germany: { name: 'Germany', refundAvailable: 'yes', vatRate: 19, minimumSpend: '€50', note: 'Get your Tax Free form stamped by customs before checking in luggage that contains the purchased goods.' },
  italy: { name: 'Italy', refundAvailable: 'yes', vatRate: 22, minimumSpend: '€70.01', note: 'Validate your refund forms at the OTELLO electronic kiosks or customs desk before departure.' },
  spain: { name: 'Spain', refundAvailable: 'yes', vatRate: 21, minimumSpend: 'no strict minimum', note: 'Spain uses the DIVA electronic validation system — scan your form at the airport kiosk before checking in your luggage.' },
  netherlands: { name: 'Netherlands', refundAvailable: 'yes', vatRate: 21, minimumSpend: '€50', note: 'Validate your refund forms at customs before departure — Schiphol has dedicated tax refund desks.' },
  portugal: { name: 'Portugal', refundAvailable: 'yes', vatRate: 23, minimumSpend: '€50 (varies by retailer)', note: 'Validate your refund forms at customs before departure.' },
  greece: { name: 'Greece', refundAvailable: 'yes', vatRate: 24, minimumSpend: '€50', note: 'Validate your refund forms at customs before departure — allow extra time during peak summer travel.' },
  austria: { name: 'Austria', refundAvailable: 'yes', vatRate: 20, minimumSpend: '€75.01', note: 'Validate your refund forms at customs before departure.' },
  switzerland: { name: 'Switzerland', refundAvailable: 'yes', vatRate: 8.1, minimumSpend: 'CHF 300', note: 'Switzerland isn\'t in the EU and runs its own refund scheme — get your form stamped at Swiss customs before departure.' },
  poland: { name: 'Poland', refundAvailable: 'yes', vatRate: 23, minimumSpend: 'PLN 200', note: 'Validate your refund forms at customs before departure.' },
  'czech-republic': { name: 'Czech Republic', refundAvailable: 'yes', vatRate: 21, minimumSpend: 'CZK 2,001', note: 'Validate your refund forms at customs before departure.' },
  norway: { name: 'Norway', refundAvailable: 'yes', vatRate: 25, minimumSpend: 'NOK 315', note: "Norway isn't in the EU and runs its own tax-free scheme — validate at the airport before departure." },
  sweden: { name: 'Sweden', refundAvailable: 'yes', vatRate: 25, minimumSpend: 'SEK 200', note: 'Validate your refund forms at customs before departure.' },
  denmark: { name: 'Denmark', refundAvailable: 'yes', vatRate: 25, minimumSpend: 'DKK 300', note: 'Validate your refund forms at customs before departure.' },
  iceland: { name: 'Iceland', refundAvailable: 'yes', vatRate: 24, minimumSpend: 'ISK 6,000', note: 'Validate your refund forms at Keflavík Airport customs before departure.' },
  japan: { name: 'Japan', refundAvailable: 'yes', vatRate: 10, minimumSpend: '¥5,000 per store per day', note: "Japan's system works differently from Europe's — many stores deduct tax immediately at checkout when you show your passport, rather than refunding at the airport afterward." },
  'south-korea': { name: 'South Korea', refundAvailable: 'yes', vatRate: 10, minimumSpend: 'KRW 30,000+', note: 'Some stores offer immediate in-store deduction; others require processing at airport refund kiosks before departure.' },
  malaysia: { name: 'Malaysia', refundAvailable: 'no', vatRate: 10, minimumSpend: null, note: "Malaysia does not currently have a tourist refund scheme — the previous GST refund program ended when GST was replaced by SST in 2018." },
  philippines: { name: 'Philippines', refundAvailable: 'yes', vatRate: 12, minimumSpend: '₱3,000 per receipt (approximate)', note: 'The Philippines introduced a tourist VAT refund law in 2024 — rollout is still expanding, so confirm participating stores before relying on it for your trip.' },
  israel: { name: 'Israel', refundAvailable: 'yes', vatRate: 17, minimumSpend: 'USD 100 equivalent', note: 'Refunds are processed at Ben Gurion Airport — keep receipts and purchased goods accessible for inspection.' },
  jordan: { name: 'Jordan', refundAvailable: 'no', vatRate: 16, minimumSpend: null, note: 'Jordan does not offer a general tourist VAT refund scheme.' },
  kenya: { name: 'Kenya', refundAvailable: 'no', vatRate: 16, minimumSpend: null, note: 'Kenya does not offer a general tourist VAT refund scheme.' },
  'south-africa': { name: 'South Africa', refundAvailable: 'yes', vatRate: 15, minimumSpend: 'ZAR 250', note: 'Refunds are processed by the VAT Refund Administrator desks at major international airports — keep goods available for inspection.' },
  australia: { name: 'Australia', refundAvailable: 'yes', vatRate: 10, minimumSpend: 'AUD 300 (from the same supplier)', note: "Australia's Tourist Refund Scheme (TRS) requires goods purchased within 60 days of departure and carried as accessible baggage for inspection." },
  'new-zealand': { name: 'New Zealand', refundAvailable: 'no', vatRate: 15, minimumSpend: null, note: 'New Zealand does not offer a tourist GST refund scheme.' },
};

const REFUND_LABELS = {
  yes: 'available — you can reclaim VAT/GST on eligible purchases as a visitor',
  no: 'not available — this country does not offer a general VAT/GST refund scheme for tourists',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = data.refundAvailable === 'yes'
    ? `${data.name}'s VAT/GST refund for tourists is ${REFUND_LABELS.yes}. Standard rate: ${data.vatRate}%. Minimum spend: ${data.minimumSpend}.`
    : `${data.name}'s VAT/GST refund for tourists is ${REFUND_LABELS.no}. Standard rate: ${data.vatRate}%.`;

  return {
    country, countryName: data.name, refundAvailable: data.refundAvailable,
    refundAvailableLabel: REFUND_LABELS[data.refundAvailable], vatRate: data.vatRate,
    minimumSpend: data.minimumSpend, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/vat-refund-checker/calculate
// @access Public
exports.calculateVatRefund = (req, res) => {
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
// @route POST /api/tools/vat-refund-checker/pdf
// @access Public
exports.generateVatRefundPdf = async (req, res) => {
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
      [email, firstName || null, 'vat-refund-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Tax-Free Shopping Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="vat-refund-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Refund available: ${result.refundAvailableLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.refundAvailable === 'yes'
        ? 'Ask for a tax-free form at the point of sale — most stores won\'t issue one automatically unless you request it and show your passport.'
        : 'Don\'t plan your shopping budget around a refund here — factor the full price, including tax, into your spending.',
      result.refundAvailable === 'yes'
        ? 'Keep purchased goods accessible (not in checked luggage) in case customs asks to inspect them before validating your refund.'
        : 'Duty-free shops in the departure area (after security) are a separate system from VAT refunds and remain available regardless.',
      'Arrive with extra time at the airport if you\'re processing refund paperwork — validation queues can be long during peak travel periods.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧾 Your ${result.countryName} tax-free shopping guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your VAT/GST refund check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond shopping logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send vat-refund-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateVatRefundPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
