const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Whether a destination's border officials commonly check for a notarized
// parental/guardian consent letter when a minor arrives with only one
// parent, a grandparent, or another adult — distinct from
// passportValidityController.js and visaRequirementController.js, which
// cover the traveler's OWN documents, not a minor's specific consent
// paperwork. enforcementLevel: 'high' (actively and consistently checked,
// real risk of being turned away or delayed without it) | 'moderate'
// (commonly requested at officer discretion, especially at land borders)
// | 'standard' (not typically checked, but every government and airline
// still recommends carrying one as universal best practice — a missing
// letter can still cause problems with an individual officer or airline
// check-in agent anywhere). This is deliberately general orientation, not
// a legal guarantee — every result, PDF, and email carries a disclaimer
// recommending a notarized letter regardless of destination.
const COUNTRIES = {
  france: { name: 'France', enforcementLevel: 'standard', note: "Not routinely checked at the border, but France (like the rest of the EU) reserves the right to ask, and a notarized letter is universally recommended regardless." },
  austria: { name: 'Austria', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'czech-republic': { name: 'Czech Republic', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  denmark: { name: 'Denmark', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  germany: { name: 'Germany', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  greece: { name: 'Greece', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  hungary: { name: 'Hungary', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  iceland: { name: 'Iceland', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  italy: { name: 'Italy', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  netherlands: { name: 'Netherlands', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  portugal: { name: 'Portugal', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  spain: { name: 'Spain', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  sweden: { name: 'Sweden', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  switzerland: { name: 'Switzerland', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  ireland: { name: 'Ireland', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'united-kingdom': { name: 'United Kingdom', enforcementLevel: 'standard', note: 'Not routinely checked, but UK Border Force reserves the right to ask, and a notarized letter is universally recommended regardless.' },
  turkey: { name: 'Turkey', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  japan: { name: 'Japan', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  thailand: { name: 'Thailand', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  indonesia: { name: 'Indonesia', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  singapore: { name: 'Singapore', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'south-korea': { name: 'South Korea', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'hong-kong': { name: 'Hong Kong', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  vietnam: { name: 'Vietnam', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  philippines: { name: 'Philippines', enforcementLevel: 'moderate', note: "The Philippines has real child-protection border-control measures, and immigration officers sometimes ask minors traveling with only one parent or a non-parent for a Travel Clearance or Affidavit of Support and Consent — carrying a notarized letter avoids delays." },
  malaysia: { name: 'Malaysia', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  china: { name: 'China', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  india: { name: 'India', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  maldives: { name: 'Maldives', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  taiwan: { name: 'Taiwan', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'sri-lanka': { name: 'Sri Lanka', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  cambodia: { name: 'Cambodia', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  australia: { name: 'Australia', enforcementLevel: 'standard', note: 'Not routinely checked, but Australian Border Force reserves the right to ask, and a notarized letter is universally recommended regardless.' },
  'new-zealand': { name: 'New Zealand', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  fiji: { name: 'Fiji', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'french-polynesia': { name: 'French Polynesia', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  mexico: { name: 'Mexico', enforcementLevel: 'moderate', note: "Mexican immigration has real child-protection border measures, and officials — especially at land borders — sometimes ask minors traveling with only one parent or a non-parent for notarized consent from the absent parent(s). Carrying one avoids delays or, in rare cases, being denied entry." },
  'dominican-republic': { name: 'Dominican Republic', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  'puerto-rico': { name: 'Puerto Rico', enforcementLevel: 'standard', note: 'As US territory, the same general US guidance applies — not routinely checked, but a notarized letter is universally recommended.' },
  bahamas: { name: 'Bahamas', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  jamaica: { name: 'Jamaica', enforcementLevel: 'moderate', note: "Jamaican immigration has real child-protection measures at the border, and officials sometimes ask minors traveling with only one parent or a non-parent for documented consent — carrying a notarized letter avoids delays." },
  aruba: { name: 'Aruba', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'turks-and-caicos': { name: 'Turks and Caicos', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'st-lucia': { name: 'St. Lucia', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'costa-rica': { name: 'Costa Rica', enforcementLevel: 'moderate', note: "Costa Rican immigration has real child-protection measures, particularly for minors DEPARTING the country without both parents — carrying a notarized consent letter for your whole trip, not just arrival, avoids issues." },
  panama: { name: 'Panama', enforcementLevel: 'moderate', note: "Panama has real child-protection border measures — minors leaving Panama without both parents are commonly asked for notarized consent, so carrying one covers both directions of your trip." },
  belize: { name: 'Belize', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  'cayman-islands': { name: 'Cayman Islands', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  curacao: { name: 'Curaçao', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  canada: { name: 'Canada', enforcementLevel: 'moderate', note: "Canada Border Services Agency actively encourages and sometimes specifically requests a notarized consent letter for minors entering with only one parent or a non-parent — one of the more consistently enforced examples among the destinations here." },
  'united-arab-emirates': { name: 'United Arab Emirates', enforcementLevel: 'moderate', note: "UAE immigration has real child-protection measures, and officials — especially for unaccompanied minors or those with a single parent or guardian — sometimes ask for notarized consent documentation." },
  morocco: { name: 'Morocco', enforcementLevel: 'moderate', note: "Morocco has real child-protection border measures, and officials sometimes ask minors traveling with only one parent or a non-parent for notarized consent — carrying one avoids delays." },
  'south-africa': { name: 'South Africa', enforcementLevel: 'high', note: "South Africa is the single most well-known example globally — border officials have historically and consistently required an unabridged birth certificate plus a notarized consent affidavit from any absent parent for minors, with real cases of families being denied entry or boarding without the correct paperwork. Check the current, exact requirement on South African Home Affairs' official site before you travel, since the specifics have changed more than once." },
  qatar: { name: 'Qatar', enforcementLevel: 'standard', note: 'Not routinely checked, but a notarized letter is universally recommended regardless of destination.' },
  israel: { name: 'Israel', enforcementLevel: 'moderate', note: "Israeli border control has real child-protection measures, and minors traveling with only one parent or a non-parent are sometimes asked for notarized consent from the absent parent(s)." },
  tanzania: { name: 'Tanzania', enforcementLevel: 'standard', note: 'Not routinely checked for foreign minors, but a notarized letter is universally recommended regardless of destination.' },
  kenya: { name: 'Kenya', enforcementLevel: 'moderate', note: "Kenya has real child-protection border measures, and officials sometimes ask minors traveling with only one parent or a non-parent for notarized consent — carrying one avoids delays." },
  argentina: { name: 'Argentina', enforcementLevel: 'moderate', note: "Argentina has real child-protection measures, particularly for minors DEPARTING the country without both parents — carrying a notarized consent letter for your whole trip, not just arrival, avoids issues." },
  peru: { name: 'Peru', enforcementLevel: 'moderate', note: "Peru has real child-protection border measures, particularly for minors DEPARTING the country without both parents — carrying a notarized consent letter for your whole trip, not just arrival, avoids issues." },
  chile: { name: 'Chile', enforcementLevel: 'moderate', note: "Chile has real, actively enforced child-protection measures — minors DEPARTING Chile without both parents are commonly required to show notarized consent, so carrying one covers both directions of your trip." },
  colombia: { name: 'Colombia', enforcementLevel: 'moderate', note: "Colombia has real child-protection measures, particularly for minors DEPARTING the country without both parents — carrying a notarized consent letter for your whole trip, not just arrival, avoids issues." },
  brazil: { name: 'Brazil', enforcementLevel: 'moderate', note: "Brazil has real, actively enforced child-protection measures — minors DEPARTING Brazil without both parents are commonly required to show notarized consent, so carrying one covers both directions of your trip." },
  'united-states': { name: 'United States', enforcementLevel: 'standard', note: "US Customs and Border Protection doesn't routinely check on entry, but individual airlines and officers retain discretion to ask, and the State Department itself recommends carrying a notarized letter for any minor traveling without both parents." },
};

const ENFORCEMENT_LABELS = {
  standard: 'Not Routinely Checked (Still Recommended)',
  moderate: 'Commonly Requested at Officer Discretion',
  high: 'Actively and Consistently Enforced',
};

const DISCLAIMER = "Regardless of the enforcement level shown, every government and airline recommends carrying a notarized parental/guardian consent letter for any minor traveling without both legal parents — it's the single cheapest, easiest way to avoid a problem with an individual officer or check-in agent anywhere in the world. Requirements can also apply on departure, not just arrival, so check both directions of your trip.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const enforcementLabel = ENFORCEMENT_LABELS[data.enforcementLevel];
  const headline = `${data.name}: ${enforcementLabel}.`;

  return {
    country, countryName: data.name, enforcementLevel: data.enforcementLevel, enforcementLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/minor-consent-checker/calculate
// @access Public
exports.calculateMinorConsent = (req, res) => {
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
// @route POST /api/tools/minor-consent-checker/pdf
// @access Public
exports.generateMinorConsentPdf = async (req, res) => {
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
      [email, firstName || null, 'minor-consent-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Minor Travel Consent Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="minor-consent-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.enforcementLabel);

    pdfService.heading(doc, 'What a good consent letter includes');
    pdfService.bulletList(doc, [
      result.disclaimer,
      "The absent parent's/guardian's full name, signature, and contact information, plus the traveling parent's or companion's name and relationship to the child.",
      'The specific travel dates and destination(s), and a statement that the absent parent consents to the trip.',
      'Notarization — a signature alone is usually not enough; getting it notarized (or apostilled, for some countries) is what makes it credible to an immigration officer.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `👨‍👩‍👧 Your ${result.countryName} minor travel consent check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the minor travel consent check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond document prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send minor-consent-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateMinorConsentPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
