const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Whether proof of yellow fever vaccination (the International Certificate
// of Vaccination or Prophylaxis) is a legal ENTRY requirement — distinct
// from healthController.js, which covers general vaccine/malaria advisory
// for the destination itself. requirement: 'not_required' (no entry
// requirement) | 'conditional' (required only if arriving from or having
// recently transited a country with risk of yellow fever transmission,
// typically parts of Africa and South America) | 'required' (mandatory
// for essentially all arriving travelers, regardless of origin). This is
// a real, actively-enforced border requirement — travelers without the
// certificate where required can be denied boarding, quarantined, or
// vaccinated on arrival. Rules are set by each country's health ministry
// and reviewed by WHO, and do change — every result, PDF, and email
// carries an explicit disclaimer pointing to the CDC Yellow Book and WHO
// for current, authoritative verification.
const COUNTRIES = {
  france: { name: 'France', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement, regardless of where you\'re arriving from.' },
  austria: { name: 'Austria', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  'czech-republic': { name: 'Czech Republic', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  denmark: { name: 'Denmark', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  germany: { name: 'Germany', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  greece: { name: 'Greece', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  hungary: { name: 'Hungary', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  iceland: { name: 'Iceland', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  italy: { name: 'Italy', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  netherlands: { name: 'Netherlands', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  portugal: { name: 'Portugal', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  spain: { name: 'Spain', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  sweden: { name: 'Sweden', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  switzerland: { name: 'Switzerland', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  ireland: { name: 'Ireland', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  'united-kingdom': { name: 'United Kingdom', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  turkey: { name: 'Turkey', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  japan: { name: 'Japan', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement.' },
  thailand: { name: 'Thailand', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission, typically parts of Africa or South America — irrelevant if you're flying in directly from a non-risk country." },
  indonesia: { name: 'Indonesia', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  singapore: { name: 'Singapore', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — Singapore enforces this strictly given its role as a major transit hub." },
  'south-korea': { name: 'South Korea', requirement: 'not_required', note: 'No yellow fever transmission risk and generally no entry requirement, even from at-risk countries.' },
  'hong-kong': { name: 'Hong Kong', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  vietnam: { name: 'Vietnam', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  philippines: { name: 'Philippines', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  malaysia: { name: 'Malaysia', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  china: { name: 'China', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  india: { name: 'India', requirement: 'conditional', note: "India enforces this fairly strictly — a certificate is required if you're arriving from (or have transited more than a few hours in) a country with risk of yellow fever transmission, and travelers without one risk quarantine on arrival." },
  maldives: { name: 'Maldives', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  taiwan: { name: 'Taiwan', requirement: 'not_required', note: 'No yellow fever transmission risk and generally no entry requirement, even from at-risk countries.' },
  'sri-lanka': { name: 'Sri Lanka', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  cambodia: { name: 'Cambodia', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  australia: { name: 'Australia', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — mainly relevant if your itinerary includes parts of Africa or South America." },
  'new-zealand': { name: 'New Zealand', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — mainly relevant if your itinerary includes parts of Africa or South America." },
  fiji: { name: 'Fiji', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant for most standard itineraries." },
  'french-polynesia': { name: 'French Polynesia', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant for most standard itineraries." },
  mexico: { name: 'Mexico', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination, regardless of where you\'re arriving from.' },
  'dominican-republic': { name: 'Dominican Republic', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  'puerto-rico': { name: 'Puerto Rico', requirement: 'not_required', note: 'As US territory, the same (no) requirement applies as flying to the mainland.' },
  bahamas: { name: 'Bahamas', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  jamaica: { name: 'Jamaica', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  aruba: { name: 'Aruba', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  'turks-and-caicos': { name: 'Turks and Caicos', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  'st-lucia': { name: 'St. Lucia', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  'costa-rica': { name: 'Costa Rica', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination for standard tourist itineraries.' },
  panama: { name: 'Panama', requirement: 'conditional', note: "Panama has some domestic risk areas near the Colombian border, and a certificate can be required if you're arriving from (or transiting) another country with risk of yellow fever transmission." },
  belize: { name: 'Belize', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination for standard tourist itineraries.' },
  'cayman-islands': { name: 'Cayman Islands', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  curacao: { name: 'Curaçao', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  canada: { name: 'Canada', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination.' },
  'united-arab-emirates': { name: 'United Arab Emirates', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  morocco: { name: 'Morocco', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission, most relevantly if you're connecting through sub-Saharan Africa." },
  'south-africa': { name: 'South Africa', requirement: 'conditional', note: "South Africa enforces this fairly strictly — a certificate is required if you're arriving from (or have transited more than 12 hours in) a country with risk of yellow fever transmission." },
  qatar: { name: 'Qatar', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  israel: { name: 'Israel', requirement: 'conditional', note: "A certificate is required only if you're arriving from (or have recently transited) a country with risk of yellow fever transmission — irrelevant if you're flying in directly from a non-risk country." },
  tanzania: { name: 'Tanzania', requirement: 'required', note: 'Tanzania is one of the stricter countries globally — proof of vaccination is required for essentially all arriving travelers over 1 year old, regardless of origin, not just those coming from at-risk countries.' },
  kenya: { name: 'Kenya', requirement: 'conditional', note: "Kenya has some domestic risk areas, and a certificate is required if you're arriving from (or have transited) a country with risk of yellow fever transmission — this is actively checked on arrival." },
  argentina: { name: 'Argentina', requirement: 'not_required', note: "No entry requirement for standard tourist itineraries centered on Buenos Aires and the main tourist circuit — some northern border provinces carry domestic risk if you're traveling overland from Bolivia, Brazil, or Paraguay." },
  peru: { name: 'Peru', requirement: 'conditional', note: "Peru has real domestic risk in Amazon/jungle regions (not Lima or the standard Cusco/Machu Picchu circuit) — vaccination is recommended if visiting those areas, and a certificate can be required if arriving from another at-risk country." },
  chile: { name: 'Chile', requirement: 'not_required', note: 'No yellow fever transmission risk and no entry requirement for standard tourist itineraries.' },
  colombia: { name: 'Colombia', requirement: 'conditional', note: 'Colombia has real domestic risk zones (parts of the Amazon and other regions outside the main tourist cities) — vaccination is recommended if visiting those areas, and a certificate can be required if arriving from another at-risk country.' },
  brazil: { name: 'Brazil', requirement: 'conditional', note: 'Brazil has real domestic risk zones outside Rio de Janeiro and São Paulo — vaccination is recommended if visiting the Amazon or other affected regions, and a certificate can be required if arriving from another at-risk country.' },
  'united-states': { name: 'United States', requirement: 'not_required', note: 'No entry requirement for yellow fever vaccination, regardless of where you\'re arriving from.' },
};

const REQUIREMENT_LABELS = {
  not_required: 'Not Required',
  conditional: 'Required If Arriving From an At-Risk Country',
  required: 'Required for All Travelers',
};

const DISCLAIMER = "Yellow fever certificate requirements are set by each country's health ministry, reviewed by WHO, and do change — always verify current rules on the CDC Yellow Book (Traveler's Health) or WHO's International Travel and Health pages before you fly, especially if your itinerary includes any country with risk of yellow fever transmission.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const requirementLabel = REQUIREMENT_LABELS[data.requirement];
  const headline = `${data.name}: ${requirementLabel}.`;

  return {
    country, countryName: data.name, requirement: data.requirement, requirementLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/yellow-fever-checker/calculate
// @access Public
exports.calculateYellowFever = (req, res) => {
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
// @route POST /api/tools/yellow-fever-checker/pdf
// @access Public
exports.generateYellowFeverPdf = async (req, res) => {
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
      [email, firstName || null, 'yellow-fever-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Yellow Fever Certificate Requirement`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="yellow-fever-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.requirementLabel);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If you need the vaccine, get it at least 10 days before you travel — that\'s how long it takes to become effective, and it\'s also the standard grace period built into most countries\' certificate rules.',
      'Keep your International Certificate of Vaccination or Prophylaxis (the "yellow card") with your passport — it\'s often checked at the border, not just at check-in.',
      'If you have a medical reason you can\'t be vaccinated, ask your doctor about a medical exemption letter before you travel, not at the airport.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💉 Your ${result.countryName} yellow fever certificate check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the yellow fever certificate check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond health prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send yellow-fever-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateYellowFeverPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
