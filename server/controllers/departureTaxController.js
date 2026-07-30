const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Departure/exit tax collection method per country. status: 'bundled'
// (virtually always folded into the airline ticket price automatically —
// the global norm today) | 'verify' (has a track record of separate,
// sometimes cash-only, collection at certain airports — worth double-
// checking for your specific route, since practices modernize over time
// and can vary by airport within the same country).
const COUNTRIES = {
  bolivia: { name: 'Bolivia', status: 'verify', note: 'Historically required a separate departure tax at the airport, sometimes cash-only — increasingly bundled into ticket prices in recent years, but it\'s worth confirming for your specific airline and airport.' },
  nigeria: { name: 'Nigeria', status: 'verify', note: 'Some airports have historically required separate departure-related fees — worth confirming current practice with your airline before you fly.' },

  'united-states': { name: 'United States', status: 'bundled', note: 'US international departure taxes and fees are folded into your ticket price automatically — nothing extra to pay at the airport.' },
  canada: { name: 'Canada', status: 'bundled', note: 'Airport improvement fees and departure-related charges are bundled into your ticket price automatically.' },
  'united-kingdom': { name: 'United Kingdom', status: 'bundled', note: 'Air Passenger Duty (APD) is bundled into your ticket price automatically — it\'s one of the higher such fees globally, but you never pay it separately.' },
  ireland: { name: 'Ireland', status: 'bundled', note: 'Any departure-related charges are bundled into your ticket price automatically.' },
  france: { name: 'France', status: 'bundled', note: 'The "taxe de solidarité" (solidarity tax) and other departure-related charges are bundled into your ticket price automatically.' },
  germany: { name: 'Germany', status: 'bundled', note: 'Air traffic tax is bundled into your ticket price automatically.' },
  italy: { name: 'Italy', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  spain: { name: 'Spain', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  netherlands: { name: 'Netherlands', status: 'bundled', note: 'An air passenger tax is bundled into your ticket price automatically.' },
  portugal: { name: 'Portugal', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  greece: { name: 'Greece', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  austria: { name: 'Austria', status: 'bundled', note: 'An air transport levy is bundled into your ticket price automatically.' },
  switzerland: { name: 'Switzerland', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  poland: { name: 'Poland', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  'czech-republic': { name: 'Czech Republic', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  norway: { name: 'Norway', status: 'bundled', note: 'An aviation tax is bundled into your ticket price automatically.' },
  sweden: { name: 'Sweden', status: 'bundled', note: 'An aviation tax is bundled into your ticket price automatically.' },
  denmark: { name: 'Denmark', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  iceland: { name: 'Iceland', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },

  japan: { name: 'Japan', status: 'bundled', note: "Japan's International Tourist Tax (¥1,000) is bundled into your ticket price automatically." },
  'south-korea': { name: 'South Korea', status: 'bundled', note: 'An international airport usage fee is bundled into your ticket price automatically.' },
  china: { name: 'China', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  thailand: { name: 'Thailand', status: 'bundled', note: 'A tourist entry/departure-related fee is generally bundled into your ticket price or collected as part of the broader airport system, not as a separate cash payment.' },
  vietnam: { name: 'Vietnam', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  indonesia: { name: 'Indonesia', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically — historically some regional airports collected a separate fee, but this is now standard practice nationwide.' },
  philippines: { name: 'Philippines', status: 'bundled', note: 'Travel tax and terminal fees are now standard practice bundled into ticket prices or pre-collected, rather than a separate cash payment at departure.' },
  malaysia: { name: 'Malaysia', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  singapore: { name: 'Singapore', status: 'bundled', note: 'Passenger service and security fees are bundled into your ticket price automatically.' },
  india: { name: 'India', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },

  mexico: { name: 'Mexico', status: 'bundled', note: 'The Tourism Departure Tax (Derecho de No Inmigrante) is bundled into your ticket price automatically for most airlines.' },
  brazil: { name: 'Brazil', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  argentina: { name: 'Argentina', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  chile: { name: 'Chile', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  colombia: { name: 'Colombia', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  peru: { name: 'Peru', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  'costa-rica': { name: 'Costa Rica', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },

  turkey: { name: 'Turkey', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  israel: { name: 'Israel', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'bundled', note: 'Airport passenger service charges are bundled into your ticket price automatically.' },
  'saudi-arabia': { name: 'Saudi Arabia', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  egypt: { name: 'Egypt', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  morocco: { name: 'Morocco', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  jordan: { name: 'Jordan', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  kenya: { name: 'Kenya', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },
  'south-africa': { name: 'South Africa', status: 'bundled', note: 'Departure-related charges are bundled into your ticket price automatically.' },

  australia: { name: 'Australia', status: 'bundled', note: 'The Passenger Movement Charge is bundled into your ticket price automatically.' },
  'new-zealand': { name: 'New Zealand', status: 'bundled', note: 'The International Visitor Conservation and Tourism Levy and airport charges are bundled into your ticket price or visa application automatically.' },
};

const STATUS_LABELS = {
  bundled: "charges departure-related fees, but they're virtually always bundled into your airline ticket price automatically — nothing extra to pay at the airport",
  verify: "has historically required a separate departure payment (sometimes cash) at certain airports — worth verifying for your specific route, since practices modernize over time",
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name} ${STATUS_LABELS[data.status]}.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel: STATUS_LABELS[data.status],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/departure-tax-checker/calculate
// @access Public
exports.calculateDepartureTax = (req, res) => {
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
// @route POST /api/tools/departure-tax-checker/pdf
// @access Public
exports.generateDepartureTaxPdf = async (req, res) => {
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
      [email, firstName || null, 'departure-tax-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Departure Tax Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="departure-tax-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.status === 'verify' ? 'Worth double-checking before you fly' : "You're covered — nothing extra to pay");

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.status === 'verify'
        ? 'Keep a small amount of local currency cash on hand for departure, just in case — it\'s a quick problem to solve if you have it, and a stressful one if you don\'t.'
        : 'You generally don\'t need to budget separately for departure taxes — they\'re already reflected in the price you paid for your ticket.',
      'If you\'re departing from a smaller regional airport rather than the main international hub, practices can differ from the capital — it\'s worth a quick check specifically for that airport.',
      'Land border crossings (as opposed to flights) sometimes have separate exit fee practices from air travel — this guide covers departure by air specifically.',
      'Rules and collection methods change over time — this guide reflects general, widely-known patterns rather than a real-time official source.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛫 Your ${result.countryName} departure tax check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your departure tax check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond airport fees? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send departure-tax-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDepartureTaxPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
