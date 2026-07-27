const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Legal drinking age per country. Distinct from the site's existing
// alcohol-checker (which covers dry countries/general availability) —
// this is specifically the minimum age to legally buy or be served
// alcohol. Some countries split beer/wine vs spirits at different ages;
// minAge reflects the lower/more permissive threshold, with the split
// noted where it matters.
const COUNTRIES = {
  'united-states': { name: 'United States', minAge: 21, note: 'One of the highest legal drinking ages in the world — enforced consistently, and ID checks are routine even for people who are clearly well over 21.' },
  canada: { name: 'Canada', minAge: 18, note: 'Varies by province — 18 in Alberta, Manitoba, and Quebec; 19 in most other provinces and territories.' },
  mexico: { name: 'Mexico', minAge: 18, note: 'Enforcement varies, but 18 is the legal standard nationwide.' },
  brazil: { name: 'Brazil', minAge: 18, note: 'Applies nationwide.' },
  argentina: { name: 'Argentina', minAge: 18, note: 'Applies nationwide.' },
  chile: { name: 'Chile', minAge: 18, note: 'Applies nationwide.' },
  colombia: { name: 'Colombia', minAge: 18, note: 'Applies nationwide.' },
  peru: { name: 'Peru', minAge: 18, note: 'Applies nationwide.' },
  'costa-rica': { name: 'Costa Rica', minAge: 18, note: 'Applies nationwide.' },

  'united-kingdom': { name: 'United Kingdom', minAge: 18, note: 'Applies to buying alcohol; 16-17 year olds can legally drink (not buy) beer, wine, or cider with a meal at a table when accompanied by an adult.' },
  ireland: { name: 'Ireland', minAge: 18, note: 'Applies nationwide.' },
  france: { name: 'France', minAge: 18, note: 'Applies nationwide since a 2009 law change (previously 16 for beer/wine).' },
  germany: { name: 'Germany', minAge: 18, note: 'Beer and wine are legal at 16 with a parent/guardian present; spirits and mixed drinks require 18.' },
  italy: { name: 'Italy', minAge: 18, note: 'Applies nationwide.' },
  spain: { name: 'Spain', minAge: 18, note: 'Applies nationwide.' },
  netherlands: { name: 'Netherlands', minAge: 18, note: 'Raised from 16 to 18 in 2014 for all alcohol, including beer and wine.' },
  portugal: { name: 'Portugal', minAge: 18, note: 'Applies nationwide.' },
  greece: { name: 'Greece', minAge: 18, note: 'Applies nationwide, though enforcement is inconsistently strict in practice.' },
  austria: { name: 'Austria', minAge: 18, note: 'Beer and wine are legal at 16 in most states; spirits require 18.' },
  switzerland: { name: 'Switzerland', minAge: 18, note: 'Beer and wine are legal at 16; spirits require 18.' },
  poland: { name: 'Poland', minAge: 18, note: 'Applies nationwide.' },
  'czech-republic': { name: 'Czech Republic', minAge: 18, note: 'Applies nationwide.' },
  norway: { name: 'Norway', minAge: 18, note: 'Beer and wine (up to 22%) are legal at 18; spirits above that require 20 and can only be bought at state-run Vinmonopolet stores.' },
  sweden: { name: 'Sweden', minAge: 18, note: 'Drinking in bars/restaurants is legal at 18, but buying alcohol above 3.5% from a shop requires 20 and can only be done at the state-run Systembolaget.' },
  denmark: { name: 'Denmark', minAge: 18, note: 'Drinks under 16.5% alcohol can be bought from 16; stronger drinks and spirits require 18.' },
  iceland: { name: 'Iceland', minAge: 20, note: 'One of the higher drinking ages in Europe — alcohol above low-strength beer can only be bought at state-run Vínbúðin stores.' },

  thailand: { name: 'Thailand', minAge: 20, note: 'Applies nationwide, and there are also restricted sale hours and alcohol-free days around elections and some religious holidays.' },
  vietnam: { name: 'Vietnam', minAge: 18, note: 'Applies nationwide.' },
  philippines: { name: 'Philippines', minAge: 18, note: 'Applies nationwide.' },
  malaysia: { name: 'Malaysia', minAge: 21, note: 'Applies to non-Muslims — alcohol sale/consumption is separately restricted for Muslims under Sharia-influenced local regulations in some states.' },
  singapore: { name: 'Singapore', minAge: 18, note: 'Applies nationwide, alongside restricted public drinking hours in designated zones.' },
  india: { name: 'India', minAge: 21, note: 'Varies significantly by state, ranging from 18 to 25 — 21 is a common threshold, but always check the specific state you\'re visiting.' },
  china: { name: 'China', minAge: 18, note: 'Applies nationwide, though enforcement is inconsistently strict in practice.' },
  'south-korea': { name: 'South Korea', minAge: 19, note: 'Uses Korean age reckoning, which can effectively mean 18 in international terms depending on birth month — 19 by Korean count is the standard reference.' },
  japan: { name: 'Japan', minAge: 20, note: "Japan kept the drinking age at 20 even after lowering the general age of adulthood to 18 in 2022 — one of the few countries where the two don't align." },

  turkey: { name: 'Turkey', minAge: 18, note: 'Applies nationwide, alongside restricted sale hours in some areas.' },
  israel: { name: 'Israel', minAge: 18, note: 'Applies nationwide.' },
  'united-arab-emirates': { name: 'United Arab Emirates', minAge: 21, note: 'Alcohol is only served in licensed venues (hotels, licensed restaurants/bars) — casual public purchase is not the norm even for those of legal age.' },
  'saudi-arabia': { name: 'Saudi Arabia', minAge: 0, note: 'Alcohol is entirely illegal in Saudi Arabia regardless of age — there is no legal drinking age because there is no legal alcohol.' },
  egypt: { name: 'Egypt', minAge: 21, note: 'Applies at licensed venues; enforcement and practice can vary outside major tourist areas.' },
  morocco: { name: 'Morocco', minAge: 18, note: 'Alcohol sale to Muslims is officially restricted, but tourists can generally purchase it at licensed venues and stores at 18.' },
  jordan: { name: 'Jordan', minAge: 18, note: 'Applies nationwide at licensed venues.' },
  kenya: { name: 'Kenya', minAge: 18, note: 'Applies nationwide.' },
  'south-africa': { name: 'South Africa', minAge: 18, note: 'Applies nationwide.' },

  australia: { name: 'Australia', minAge: 18, note: 'Applies nationwide.' },
  'new-zealand': { name: 'New Zealand', minAge: 18, note: 'Applies nationwide.' },
};

function computeResult({ country, age }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');
  const ageNum = parseInt(age, 10);
  if (!ageNum || ageNum < 1 || ageNum > 120) throw new Error('A valid age is required');

  let status;
  if (data.minAge === 0) status = 'prohibited';
  else if (ageNum < data.minAge) status = 'under';
  else if (ageNum < data.minAge + 2) status = 'just-over';
  else status = 'clear';

  const STATUS_LABELS = {
    prohibited: `alcohol is entirely illegal in ${data.name}, regardless of age`,
    under: `below ${data.name}'s legal drinking age of ${data.minAge} — you cannot legally buy or be served alcohol`,
    'just-over': `legally old enough to drink in ${data.name} (minimum age ${data.minAge}) — carry ID, since you'll likely be asked to prove your age`,
    clear: `well above ${data.name}'s legal drinking age of ${data.minAge} — no age-related restrictions apply to you`,
  };

  const headline = status === 'prohibited'
    ? `Alcohol is entirely illegal in ${data.name}, regardless of age.`
    : `At ${ageNum}, you're ${STATUS_LABELS[status]}.`;

  return {
    country, countryName: data.name, age: ageNum, minAge: data.minAge, status,
    statusLabel: STATUS_LABELS[status], note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/drinking-age-checker/calculate
// @access Public
exports.calculateDrinkingAge = (req, res) => {
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
// @route POST /api/tools/drinking-age-checker/pdf
// @access Public
exports.generateDrinkingAgePdf = async (req, res) => {
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
      [email, firstName || null, 'drinking-age-checker',
        JSON.stringify({ country, age }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Drinking Age Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="drinking-age-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you go out');
    pdfService.bulletList(doc, [
      'Always carry a valid passport or ID — a foreign driver\'s license is not always accepted as proof of age abroad, but a passport almost always is.',
      result.status === 'just-over'
        ? 'Being newly of legal age means you\'ll be asked for ID more often than locals expect for someone older — this is normal and not a sign you look underage.'
        : 'Rules can vary between regions/states within a country — this guide reflects the national or most common standard.',
      'Laws and enforcement change over time — this guide reflects general, widely-known patterns rather than a real-time legal source, so it\'s worth a quick check if you\'re close to the age threshold.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍷 Your ${result.countryName} drinking age check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your drinking age check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond legal age rules? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send drinking-age-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDrinkingAgePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
