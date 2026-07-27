const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Car rental minimum age + young-driver surcharge rules per country.
// strictness: 'lenient' | 'standard' | 'strict' — mostly informational
// (drives the PDF/page copy), the actual math only needs minAge/youngThreshold.
const COUNTRIES = {
  'united-states': { name: 'United States', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a $25-35/day young-driver surcharge for drivers under 25.', note: "Some companies charge extra even at 21-24, and a few won't rent to under-21s at all — policy varies by rental company and state." },
  canada: { name: 'Canada', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a $20-30/day young-driver surcharge for drivers under 25.', note: 'Policy varies by province and rental company.' },
  'united-kingdom': { name: 'United Kingdom', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a £15-25/day young-driver surcharge for drivers under 25.', note: 'Most agencies also require you to have held a full license for at least 1 year.' },
  ireland: { name: 'Ireland', minAge: 23, youngThreshold: 25, strictness: 'strict', feeNote: 'Steep young-driver surcharges — often €20-40/day for drivers under 25.', note: "One of the strictest markets in Europe — many agencies won't rent to under-23s at all." },
  france: { name: 'France', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €20-30/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  germany: { name: 'Germany', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €15-30/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  italy: { name: 'Italy', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €20-35/day young-driver surcharge for drivers under 25.', note: 'Most agencies also require you to have held a full license for at least 1 year.' },
  spain: { name: 'Spain', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €15-30/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  netherlands: { name: 'Netherlands', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €15-25/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  portugal: { name: 'Portugal', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €15-25/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  greece: { name: 'Greece', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a €15-25/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  austria: { name: 'Austria', minAge: 19, youngThreshold: 25, strictness: 'lenient', feeNote: 'Typically a €15-25/day young-driver surcharge for drivers under 25.', note: 'One of the more lenient minimum ages in Western Europe.' },
  switzerland: { name: 'Switzerland', minAge: 20, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a CHF 20-35/day young-driver surcharge for drivers under 25.', note: 'Minimum age sometimes drops to 19 depending on the company and car category.' },
  iceland: { name: 'Iceland', minAge: 20, youngThreshold: 25, strictness: 'strict', feeNote: 'Significant young-driver surcharges, often ISK 3,000-6,000/day.', note: '4x4 and larger vehicles usually require a higher minimum age (23) given Iceland\'s rough terrain and weather.' },
  norway: { name: 'Norway', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a NOK 200-400/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  sweden: { name: 'Sweden', minAge: 20, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a SEK 200-400/day young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  poland: { name: 'Poland', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  'czech-republic': { name: 'Czech Republic', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },

  japan: { name: 'Japan', minAge: 18, youngThreshold: 21, strictness: 'lenient', feeNote: 'Modest young-driver fee, if any, for drivers under 21.', note: "One of the more lenient major markets — requires a valid International Driving Permit alongside your regular license." },
  'south-korea': { name: 'South Korea', minAge: 21, youngThreshold: 26, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 26.', note: 'Also requires an International Driving Permit for most foreign visitors.' },
  thailand: { name: 'Thailand', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Larger vehicles sometimes require a minimum age of 22-23.' },
  vietnam: { name: 'Vietnam', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Self-drive rentals are less common — many visitors hire a car with a driver instead.' },
  indonesia: { name: 'Indonesia', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Self-drive rentals are less common in tourist areas — many visitors hire a driver instead.' },
  malaysia: { name: 'Malaysia', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  singapore: { name: 'Singapore', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: "Singapore's tightly regulated roads mean strict adherence to license and age requirements." },
  china: { name: 'China', minAge: 21, youngThreshold: 25, strictness: 'strict', feeNote: 'Not generally applicable.', note: "Foreign driving licenses generally aren't accepted for self-drive rental — most visitors can't rent a car directly at all without a Chinese license." },
  india: { name: 'India', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Self-drive rentals are less common — many visitors hire a car with a driver instead.' },
  philippines: { name: 'Philippines', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },

  mexico: { name: 'Mexico', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  brazil: { name: 'Brazil', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Most agencies also require you to have held a full license for at least 1-2 years.' },
  argentina: { name: 'Argentina', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  chile: { name: 'Chile', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  colombia: { name: 'Colombia', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  peru: { name: 'Peru', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  'costa-rica': { name: 'Costa Rica', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Costa Rica also requires purchasing local mandatory insurance (TLA) on top of any coverage you already have.' },

  australia: { name: 'Australia', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically an AUD 20-35/day young-driver surcharge for drivers under 25.', note: 'Some companies allow drivers as young as 18 with a heavier surcharge.' },
  'new-zealand': { name: 'New Zealand', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically an NZD 20-35/day young-driver surcharge for drivers under 25.', note: 'Some companies allow drivers as young as 18-20 with a heavier surcharge.' },

  turkey: { name: 'Turkey', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  israel: { name: 'Israel', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Some vehicle categories require a minimum age of 23.' },
  'united-arab-emirates': { name: 'United Arab Emirates', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Luxury and SUV categories often require a minimum age of 25.' },
  'saudi-arabia': { name: 'Saudi Arabia', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  egypt: { name: 'Egypt', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Self-drive is less common for tourists — hiring a car with a driver is more typical.' },
  morocco: { name: 'Morocco', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  kenya: { name: 'Kenya', minAge: 23, youngThreshold: 25, strictness: 'strict', feeNote: 'Noticeable young-driver surcharge for drivers under 25.', note: 'Rough or unpaved roads mean some agencies set a higher minimum age, especially for 4x4 safari vehicles.' },
  nigeria: { name: 'Nigeria', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Standard across most major rental chains.' },
  'south-africa': { name: 'South Africa', minAge: 21, youngThreshold: 25, strictness: 'standard', feeNote: 'Typically a modest young-driver surcharge for drivers under 25.', note: 'Some vehicle categories require a minimum age of 23-25.' },
};

function computeResult({ country, age }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');
  const ageNum = parseInt(age, 10);
  if (!ageNum || ageNum < 1 || ageNum > 120) throw new Error('A valid age is required');

  let status;
  if (ageNum < data.minAge) status = 'too-young';
  else if (ageNum < data.youngThreshold) status = 'young-fee';
  else status = 'standard';

  const STATUS_LABELS = {
    'too-young': `below ${data.name}'s minimum rental age of ${data.minAge} — most agencies won't rent to you at all`,
    'young-fee': `old enough to rent, but under ${data.name}'s young-driver threshold of ${data.youngThreshold} — expect a surcharge`,
    standard: `above ${data.name}'s young-driver threshold — no extra age-related fee expected`,
  };

  const headline = status === 'too-young'
    ? `At ${ageNum}, you're below ${data.name}'s minimum rental age of ${data.minAge}.`
    : status === 'young-fee'
      ? `At ${ageNum}, you can rent a car in ${data.name}, but expect a young-driver surcharge.`
      : `At ${ageNum}, you're above ${data.name}'s young-driver age threshold — no extra fee expected.`;

  return {
    country, countryName: data.name, age: ageNum, minAge: data.minAge, youngThreshold: data.youngThreshold,
    status, statusLabel: STATUS_LABELS[status], feeNote: data.feeNote, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/rental-age-checker/calculate
// @access Public
exports.calculateRentalAge = (req, res) => {
  try {
    const { country, age } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country, age });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/rental-age-checker/pdf
// @access Public
exports.generateRentalAgePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, country, age } = req.body;
    if (!email || !country || !age) {
      return res.status(400).json({ success: false, error: 'email, country and age are required' });
    }

    const result = computeResult({ country, age });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'rental-age-checker',
        JSON.stringify({ country, age }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Car Rental Age Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rental-age-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `${result.feeNote} ${result.note}`);

    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      result.status === 'too-young'
        ? 'Look for a rental company that specifically advertises a lower minimum age — a few specialty or local agencies sometimes rent to younger drivers where major chains won\'t.'
        : 'Compare a few rental companies before booking — young-driver surcharges vary significantly between agencies, even in the same country.',
      'Book with a credit card in the primary driver\'s name — most agencies require the card used for the deposit to match the driver\'s ID exactly.',
      'Ask about additional-driver fees too if anyone else might drive — they\'re often charged separately from the young-driver surcharge.',
      'Rules and fees change — always confirm current minimum age and surcharge with the specific rental company before booking, not just the country-level norm.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚗 Your ${result.countryName} car rental age check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your car rental age check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond rental car paperwork? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send rental-age-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateRentalAgePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
