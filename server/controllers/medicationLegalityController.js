const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// General guidance on prescription/OTC medication import restrictions per
// country. restrictionLevel: 'high' (several common medications outright
// banned or need advance government approval) | 'moderate' (most
// prescriptions travel fine with documentation, but some categories need
// extra paperwork or are quantity-capped) | 'low' (most medications
// accepted with standard documentation). This is general travel
// information, not medical or legal advice — always confirm with the
// destination's embassy and carry your prescription/doctor's letter.
const COUNTRIES = {
  japan: { name: 'Japan', restrictionLevel: 'high', commonlyRestricted: 'ADHD stimulants (Adderall), pseudoephedrine-based decongestants (Sudafed, some Vicks products), and certain codeine-containing painkillers', note: "Japan is one of the strictest countries for medication imports — some ADHD stimulants and decongestants are banned outright regardless of prescription. Larger quantities of allowed medications may require a Yakkan Shoumei import certificate arranged in advance." },
  'united-arab-emirates': { name: 'United Arab Emirates', restrictionLevel: 'high', commonlyRestricted: 'codeine, ADHD stimulants (Adderall), sedatives (Xanax/Valium-class), and CBD products', note: 'The UAE has strict controlled-substance laws — travelers have been detained over medications that are routine prescriptions at home. Carry the original prescription and a doctor\'s letter, and check the Ministry of Health\'s controlled drug list before you fly.' },
  'saudi-arabia': { name: 'Saudi Arabia', restrictionLevel: 'high', commonlyRestricted: 'codeine, strong sedatives, and ADHD stimulants', note: "Similar to the UAE — controlled substances require documentation, and some common Western prescriptions are restricted or banned outright." },
  singapore: { name: 'Singapore', restrictionLevel: 'high', commonlyRestricted: 'ADHD stimulants, strong sedatives/sleep aids, and codeine above certain quantities', note: "Singapore's drug laws are strict generally — some psychiatric and sedative medications require prior approval from the Health Sciences Authority for larger quantities." },
  china: { name: 'China', restrictionLevel: 'high', commonlyRestricted: 'ADHD stimulants, strong sedatives, and certain psychiatric medications', note: 'Psychotropic and narcotic medications face strict import scrutiny — carry your prescription and consider a doctor\'s letter for anything beyond a small personal supply.' },
  'south-korea': { name: 'South Korea', restrictionLevel: 'high', commonlyRestricted: 'Adderall/ADHD stimulants, pseudoephedrine-based decongestants, and certain sedatives', note: 'South Korea is notably strict on ADHD stimulants — Adderall in particular is effectively banned without special permit, even with a valid foreign prescription.' },
  indonesia: { name: 'Indonesia', restrictionLevel: 'moderate', commonlyRestricted: 'codeine-containing medications and strong sedatives', note: 'Most prescriptions travel fine with documentation, but codeine and certain psychotropic medications need extra paperwork for larger quantities.' },
  thailand: { name: 'Thailand', restrictionLevel: 'moderate', commonlyRestricted: 'codeine-containing medications and certain sedatives', note: 'Personal-use quantities with a valid prescription are generally fine, though larger amounts of controlled substances need an import permit.' },
  vietnam: { name: 'Vietnam', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most standard prescriptions are fine with documentation, but opioid and sedative medications face extra scrutiny.' },
  malaysia: { name: 'Malaysia', restrictionLevel: 'moderate', commonlyRestricted: 'ADHD stimulants and sedatives', note: 'Standard prescriptions generally travel fine, though stimulant and sedative medications may need documentation.' },
  philippines: { name: 'Philippines', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most medications are accepted with a prescription, though controlled substances need documentation.' },
  india: { name: 'India', restrictionLevel: 'moderate', commonlyRestricted: 'codeine, sedatives, and certain psychiatric medications', note: 'A range of psychotropic and opioid medications are restricted or need a permit — carry your prescription and doctor\'s letter.' },
  turkey: { name: 'Turkey', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though quantities of controlled substances are capped for personal import.' },
  egypt: { name: 'Egypt', restrictionLevel: 'high', commonlyRestricted: 'tramadol, codeine, and sedatives, even in modest quantities', note: 'Egypt has notably strict rules on tramadol and codeine specifically — travelers have faced serious issues over routine prescriptions without documentation.' },
  morocco: { name: 'Morocco', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though opioid and sedative medications face extra scrutiny.' },
  jordan: { name: 'Jordan', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though controlled substances need extra paperwork.' },
  israel: { name: 'Israel', restrictionLevel: 'low', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation — carry your prescription and original packaging.' },
  kenya: { name: 'Kenya', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though controlled substances face extra scrutiny.' },
  'south-africa': { name: 'South Africa', restrictionLevel: 'low', commonlyRestricted: 'large quantities of controlled substances without a prescription', note: 'Most prescription medications are accepted with standard documentation.' },
  'united-states': { name: 'United States', restrictionLevel: 'low', commonlyRestricted: 'large quantities without prescription documentation', note: 'Most prescription medications are accepted with standard documentation — CBP recommends keeping medication in original, labeled packaging.' },
  canada: { name: 'Canada', restrictionLevel: 'low', commonlyRestricted: 'large quantities without documentation', note: 'Most prescription medications are accepted with standard documentation and a reasonable personal-use supply.' },
  mexico: { name: 'Mexico', restrictionLevel: 'high', commonlyRestricted: 'ADHD stimulants (Adderall), sedatives (Valium/Xanax-class), and some opioid painkillers', note: 'Mexico has stricter controlled-substance rules than many travelers expect — there have been real cases of tourists detained over routine prescriptions like Adderall or Valium-class medications without proper documentation.' },
  brazil: { name: 'Brazil', restrictionLevel: 'moderate', commonlyRestricted: 'ADHD stimulants and sedatives', note: 'Most medications need to be declared, and controlled substances (ANVISA-regulated) require documentation.' },
  argentina: { name: 'Argentina', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though controlled substances face extra scrutiny.' },
  chile: { name: 'Chile', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  colombia: { name: 'Colombia', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though controlled substances face extra scrutiny.' },
  peru: { name: 'Peru', restrictionLevel: 'moderate', commonlyRestricted: 'opioid painkillers and sedatives', note: 'Most prescriptions travel fine with documentation, though controlled substances face extra scrutiny.' },
  'costa-rica': { name: 'Costa Rica', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  'united-kingdom': { name: 'United Kingdom', restrictionLevel: 'moderate', commonlyRestricted: 'large quantities of controlled drugs (opioids, some ADHD medications) without a personal licence', note: 'Standard personal-use quantities are generally fine with a prescription, but larger supplies of controlled drugs may require a personal import licence.' },
  ireland: { name: 'Ireland', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  france: { name: 'France', restrictionLevel: 'moderate', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Standard personal-use quantities are generally fine, though it can be worth carrying a certificate for controlled medications.' },
  germany: { name: 'Germany', restrictionLevel: 'moderate', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Standard personal-use quantities are generally fine with a prescription and original packaging.' },
  italy: { name: 'Italy', restrictionLevel: 'moderate', commonlyRestricted: 'codeine-containing medications and large quantities of controlled substances', note: 'Italy is stricter on codeine than some neighboring countries — some common over-the-counter codeine products elsewhere are prescription-only here.' },
  spain: { name: 'Spain', restrictionLevel: 'moderate', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Standard personal-use quantities are generally fine with a prescription.' },
  netherlands: { name: 'Netherlands', restrictionLevel: 'low', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  portugal: { name: 'Portugal', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  greece: { name: 'Greece', restrictionLevel: 'high', commonlyRestricted: 'codeine-containing medications (even common over-the-counter painkillers from other countries) and strong sedatives', note: "Greece is notably strict on codeine — some routine over-the-counter painkillers elsewhere require a doctor's note here, and this has caught many tourists off guard." },
  austria: { name: 'Austria', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  switzerland: { name: 'Switzerland', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  poland: { name: 'Poland', restrictionLevel: 'moderate', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Standard personal-use quantities are generally fine with a prescription.' },
  'czech-republic': { name: 'Czech Republic', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  norway: { name: 'Norway', restrictionLevel: 'moderate', commonlyRestricted: 'codeine-containing medications and sedatives (benzodiazepines)', note: 'Norway has fairly strict personal-import limits and documentation requirements for codeine and benzodiazepine-class medications specifically.' },
  sweden: { name: 'Sweden', restrictionLevel: 'moderate', commonlyRestricted: 'codeine-containing medications and sedatives', note: 'Similar to Norway — codeine and sedative medications face stricter personal-import rules than many other categories.' },
  denmark: { name: 'Denmark', restrictionLevel: 'moderate', commonlyRestricted: 'large quantities of controlled substances without documentation', note: 'Standard personal-use quantities are generally fine with a prescription.' },
  iceland: { name: 'Iceland', restrictionLevel: 'low', commonlyRestricted: 'controlled substances without documentation', note: 'Most prescription medications are accepted with standard documentation.' },
  australia: { name: 'Australia', restrictionLevel: 'moderate', commonlyRestricted: 'ADHD stimulants and codeine-containing medications (prescription-only even for visitors)', note: 'Australia made codeine-containing products prescription-only in 2018 — bring documentation, and ADHD stimulants may require prior approval for larger quantities.' },
  'new-zealand': { name: 'New Zealand', restrictionLevel: 'moderate', commonlyRestricted: 'pseudoephedrine-based decongestants and ADHD stimulants', note: "New Zealand's Medsafe rules restrict pseudoephedrine-based decongestants and some ADHD medications — check before you pack your usual cold/allergy medicine." },
};

const RESTRICTION_LABELS = {
  high: "high — several common prescription medications are outright banned or require advance government approval, even with a valid prescription",
  moderate: 'moderate — most prescriptions travel fine with proper documentation, but some stimulants, opioids, or sedatives need extra paperwork or are capped in quantity',
  low: "low — most prescription medications are accepted with standard documentation (original packaging, prescription, doctor's letter)",
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s medication import restrictions are ${RESTRICTION_LABELS[data.restrictionLevel]}. Commonly restricted: ${data.commonlyRestricted}.`;

  return {
    country, countryName: data.name, restrictionLevel: data.restrictionLevel,
    restrictionLevelLabel: RESTRICTION_LABELS[data.restrictionLevel],
    commonlyRestricted: data.commonlyRestricted, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/medication-legality-checker/calculate
// @access Public
exports.calculateMedicationLegality = (req, res) => {
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
// @route POST /api/tools/medication-legality-checker/pdf
// @access Public
exports.generateMedicationLegalityPdf = async (req, res) => {
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
      [email, firstName || null, 'medication-legality-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Medication Import Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="medication-legality-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Restriction level: ${result.restrictionLevelLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      'Keep all medication in its original, pharmacy-labeled packaging — an unlabeled pill organizer is the fastest way to turn a routine prescription into a problem at customs.',
      "Carry a doctor's letter (on letterhead, listing the medication, dosage, and medical reason) in addition to the prescription itself — it's the single most useful document for a customs question.",
      result.restrictionLevel === 'high'
        ? "Contact the destination's embassy or consulate before you fly to confirm current rules for your specific medication — regulations for this destination change and enforcement can be inconsistent."
        : 'Bring only the quantity you need for your trip plus a small buffer — unusually large quantities draw more scrutiny than a clearly personal supply.',
      'This is general travel guidance, not medical or legal advice — always verify with the destination\'s embassy for your specific medication before you travel.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💊 Your ${result.countryName} medication import guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your medication import check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>This is general travel guidance, not medical or legal advice — always confirm with the destination's embassy for your specific medication.</p>
<p>Want automatic price alerts and trip-planning tools that go beyond medication logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send medication-legality-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateMedicationLegalityPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
