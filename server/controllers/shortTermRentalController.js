const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Short-term rental (Airbnb-style) regulation level per country.
// level: 'heavy' (registration/licensing required, possible bans in some
// cities) | 'moderate' (registration or night-caps in some cities) |
// 'light' (broadly permitted with few specific rules). Rules change
// often and are frequently city-specific — this is a general orientation,
// not a substitute for checking the listing's own license status.
const COUNTRIES = {
  spain: { name: 'Spain', level: 'heavy', note: "Barcelona has moved to phase out most short-term tourist apartment licenses entirely by 2028, and several other Spanish cities have tightened registration rules — always verify the listing has a valid license number displayed." },
  'united-states': { name: 'United States', level: 'heavy', note: 'Regulation is set city-by-city, not nationally — New York City in particular has very strict registration rules that have sharply reduced listings, while many other US cities remain far more permissive.' },
  france: { name: 'France', level: 'heavy', note: 'Paris requires registration and caps most rentals at 120 nights per year for a primary residence — several other French cities have adopted similar rules.' },
  netherlands: { name: 'Netherlands', level: 'heavy', note: 'Amsterdam caps short-term rentals at 30 nights per year and requires registration, with permits limited in some neighborhoods.' },
  japan: { name: 'Japan', level: 'heavy', note: "The Minpaku law requires official registration and caps most private rentals at 180 days per year — unregistered listings are illegal to book, though enforcement of individual listings can be hard for guests to verify." },
  singapore: { name: 'Singapore', level: 'heavy', note: 'Short-term rentals of private residential property under 3 months are effectively illegal — this is one of the strictest markets in the world for this.' },
  greece: { name: 'Greece', level: 'heavy', note: 'Athens and several popular islands have paused new short-term rental licenses in central/high-density areas to control oversupply.' },

  italy: { name: 'Italy', level: 'moderate', note: 'A national identification code (CIN) is now required for most short-term rental listings, with additional city-level rules (Venice, Florence, Milan) layered on top.' },
  germany: { name: 'Germany', level: 'moderate', note: 'Berlin requires registration and limits whole-apartment rentals without a permit — other German cities have their own, generally less strict, rules.' },
  portugal: { name: 'Portugal', level: 'moderate', note: 'Lisbon has suspended new "Alojamento Local" licenses in several central districts, though existing licensed listings continue operating.' },
  'united-kingdom': { name: 'United Kingdom', level: 'moderate', note: 'London caps short-term whole-home rentals at 90 nights per year without special planning permission.' },
  australia: { name: 'Australia', level: 'moderate', note: 'Regulation varies significantly by state and city — Sydney and parts of NSW have registration requirements, while other regions remain more permissive.' },
  'new-zealand': { name: 'New Zealand', level: 'moderate', note: "Regulation varies by council — Queenstown and Auckland have introduced stricter rules than smaller towns." },
  canada: { name: 'Canada', level: 'moderate', note: "Toronto and Vancouver require registration and restrict rentals to a host's primary residence in many cases — rules vary significantly by province and city." },
  croatia: { name: 'Croatia', level: 'moderate', note: 'National registration is required, though enforcement and specific caps vary by municipality.' },
  thailand: { name: 'Thailand', level: 'moderate', note: 'Short-term rentals technically fall under hotel licensing law in many areas, creating a legal gray zone — enforcement varies significantly by location.' },
  mexico: { name: 'Mexico', level: 'moderate', note: 'Mexico City has introduced registration requirements and a night-cap for short-term rentals given rapid growth in the market.' },
  austria: { name: 'Austria', level: 'moderate', note: 'Vienna and other cities have registration and zoning requirements that vary by district.' },
  switzerland: { name: 'Switzerland', level: 'moderate', note: 'Regulation varies by canton and municipality — some resort towns have tighter caps than major cities.' },

  vietnam: { name: 'Vietnam', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific regulation, though this is evolving as the market grows.' },
  indonesia: { name: 'Indonesia', level: 'light', note: 'Bali has discussed tighter regulation given rapid growth, but enforcement remains inconsistent as of writing — broadly permissive in practice.' },
  philippines: { name: 'Philippines', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  malaysia: { name: 'Malaysia', level: 'light', note: 'Regulation is limited and inconsistently enforced — broadly permissive in practice, though some condominium buildings set their own rules.' },
  india: { name: 'India', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  'south-korea': { name: 'South Korea', level: 'moderate', note: 'Short-term rental hosting is technically restricted to licensed properties or foreigner-designated zones in many areas — check listing legitimacy carefully.' },
  china: { name: 'China', level: 'moderate', note: 'Short-term rental platforms operate but require host registration with local authorities in most cities.' },

  turkey: { name: 'Turkey', level: 'moderate', note: 'Short-term rentals now require a permit under national rules introduced in recent years — unlicensed listings can face fines.' },
  israel: { name: 'Israel', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 'moderate', note: 'Dubai requires hosts to obtain a permit through Dubai Tourism (DET) — unlicensed listings are technically illegal.' },
  'saudi-arabia': { name: 'Saudi Arabia', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation as the tourism sector expands.' },
  egypt: { name: 'Egypt', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  morocco: { name: 'Morocco', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation, though some riads/guesthouses require separate tourism licenses.' },
  jordan: { name: 'Jordan', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },

  brazil: { name: 'Brazil', level: 'light', note: 'Short-term rentals are broadly permitted nationally, though some individual condominium buildings restrict them via their own bylaws.' },
  argentina: { name: 'Argentina', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  chile: { name: 'Chile', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  colombia: { name: 'Colombia', level: 'moderate', note: 'Registration with the national tourism registry (RNT) is required for short-term rental hosts.' },
  peru: { name: 'Peru', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  'costa-rica': { name: 'Costa Rica', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },

  poland: { name: 'Poland', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  norway: { name: 'Norway', level: 'light', note: 'Short-term rentals of a primary residence are broadly permitted, with only modest limits on rental income.' },
  sweden: { name: 'Sweden', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  denmark: { name: 'Denmark', level: 'moderate', note: 'A national cap limits short-term rental of a primary residence to around 70-100 days per year without registering as a business.' },
  iceland: { name: 'Iceland', level: 'moderate', note: 'Hosts must register and are capped at 90 days per year (or a set income threshold) before requiring a full operating license.' },
  ireland: { name: 'Ireland', level: 'heavy', note: 'Short-term letting in "Rent Pressure Zones" (most cities) requires planning permission for anything beyond renting a room in your own home — enforcement has increased significantly.' },
  'czech-republic': { name: 'Czech Republic', level: 'light', note: 'Prague has discussed tighter rules given tourism volume, but regulation remains relatively light in practice as of writing.' },

  'south-africa': { name: 'South Africa', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
  kenya: { name: 'Kenya', level: 'light', note: 'Short-term rentals are broadly permitted with minimal specific national regulation.' },
};

const LEVEL_LABELS = {
  heavy: 'heavily regulated — expect registration/licensing requirements and possible bans or caps in some cities',
  moderate: 'moderately regulated — some cities require registration or cap the number of nights per year',
  light: 'lightly regulated — short-term rentals are broadly permitted with few specific restrictions',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name} is ${LEVEL_LABELS[data.level]}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel: LEVEL_LABELS[data.level],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/short-term-rental-checker/calculate
// @access Public
exports.calculateShortTermRental = (req, res) => {
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
// @route POST /api/tools/short-term-rental-checker/pdf
// @access Public
exports.generateShortTermRentalPdf = async (req, res) => {
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
      [email, firstName || null, 'short-term-rental-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Short-Term Rental Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="short-term-rental-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.levelLabel);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      'Check whether the listing displays a registration or license number, especially in cities with strict rules — unlicensed listings can be shut down or reported, sometimes disrupting a confirmed booking.',
      "Read recent reviews for any mention of last-minute cancellations due to regulatory issues — it's one of the clearest warning signs of a non-compliant listing.",
      'Have a backup hotel option in mind for cities with heavy regulation, in case a booking falls through unexpectedly close to your travel date.',
      'Rules change relatively often and are frequently city-specific — this guide reflects general, widely-known patterns rather than a real-time official source.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🏠 Your ${result.countryName} short-term rental guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your short-term rental regulation check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond booking rules? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send short-term-rental-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateShortTermRentalPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
