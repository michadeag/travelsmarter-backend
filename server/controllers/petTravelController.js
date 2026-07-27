const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Pet travel/import rules per country, reused from Tool #3's country list.
// status: 'easy' | 'moderate' | 'strict'. 'strict' generally implies a real
// chance of mandatory quarantine and/or months of advance preparation.
const COUNTRIES = {
  france: { name: 'France', status: 'moderate', note: 'EU rules apply — your pet needs a microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  austria: { name: 'Austria', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  'czech-republic': { name: 'Czech Republic', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  denmark: { name: 'Denmark', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  germany: { name: 'Germany', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  greece: { name: 'Greece', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  hungary: { name: 'Hungary', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  iceland: { name: 'Iceland', status: 'strict', note: 'One of the strictest pet-entry countries — an import permit and mandatory quarantine (historically around 2 weeks at a state-approved facility) are required, and applications need to start months in advance.' },
  italy: { name: 'Italy', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  netherlands: { name: 'Netherlands', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  portugal: { name: 'Portugal', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  spain: { name: 'Spain', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  sweden: { name: 'Sweden', status: 'moderate', note: 'EU rules apply — microchip, rabies vaccination at least 21 days before travel, and an EU health certificate. No quarantine for properly prepared pets.' },
  switzerland: { name: 'Switzerland', status: 'moderate', note: "Rules mirror the EU standard — microchip, rabies vaccination at least 21 days before travel, and a health certificate, even though Switzerland isn't in the EU." },
  ireland: { name: 'Ireland', status: 'moderate', note: 'EU rules apply, plus mandatory tapeworm treatment for dogs 1-5 days before arrival, since Ireland is an island nation trying to stay tapeworm-free.' },
  'united-kingdom': { name: 'United Kingdom', status: 'moderate', note: 'Requires an Animal Health Certificate, microchip, rabies vaccination, and mandatory tapeworm treatment for dogs 1-5 days before arrival.' },
  turkey: { name: 'Turkey', status: 'moderate', note: 'Requires a microchip, rabies vaccination, and a health certificate issued shortly before travel — no quarantine for properly prepared pets.' },
  japan: { name: 'Japan', status: 'strict', note: 'Requires advance notification to Japan\'s Animal Quarantine Service at least 40 days before arrival, plus a rabies blood titer test with a mandatory waiting period — start the paperwork months ahead.' },
  thailand: { name: 'Thailand', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination — no routine quarantine once documents are in order.' },
  indonesia: { name: 'Indonesia', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination, arranged in advance through Indonesian authorities.' },
  singapore: { name: 'Singapore', status: 'strict', note: 'Requires an import license from Singapore\'s animal authority, and quarantine may be required depending on your pet\'s country of origin — plan well ahead.' },
  'south-korea': { name: 'South Korea', status: 'moderate', note: 'Requires a health certificate, microchip, rabies vaccination, and advance notification to Korean quarantine authorities.' },
  'hong-kong': { name: 'Hong Kong', status: 'moderate', note: "Requires an import permit and rabies vaccination — pets from approved rabies-free or controlled countries can generally avoid quarantine with proper prior paperwork." },
  vietnam: { name: 'Vietnam', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination, arranged in advance.' },
  philippines: { name: 'Philippines', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination, arranged in advance.' },
  malaysia: { name: 'Malaysia', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination, arranged in advance.' },
  china: { name: 'China', status: 'strict', note: "Import rules are complex and strictly enforced, generally including quarantine on arrival — bringing a pet for a casual visit is genuinely difficult and often not practical." },
  india: { name: 'India', status: 'moderate', note: 'Requires a No Objection Certificate (NOC) import permit, health certificate, microchip, and rabies vaccination.' },
  maldives: { name: 'Maldives', status: 'strict', note: "Pets are effectively not permitted for tourists under Maldivian regulations, and most resorts don't allow them — this isn't a realistic destination to bring a pet to." },
  taiwan: { name: 'Taiwan', status: 'strict', note: 'Requires quarantine unless your pet has a prior rabies blood titer test and completes a mandatory waiting period before arrival — similar to Japan\'s protocol.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination, arranged in advance.' },
  cambodia: { name: 'Cambodia', status: 'moderate', note: 'Requires an import permit, health certificate, microchip, and rabies vaccination, arranged in advance.' },
  australia: { name: 'Australia', status: 'strict', note: 'One of the hardest countries to bring a pet into — expect mandatory quarantine, an import permit, blood tests, and a preparation timeline that can run several months.' },
  'new-zealand': { name: 'New Zealand', status: 'strict', note: 'Similarly strict to Australia — mandatory quarantine, an import permit, extensive veterinary documentation, and months of advance preparation.' },
  fiji: { name: 'Fiji', status: 'strict', note: 'Requires quarantine and an import permit, since Fiji maintains rabies-free status — plan well ahead.' },
  'french-polynesia': { name: 'French Polynesia', status: 'moderate', note: 'Follows French import rules, with a health certificate, microchip, and rabies vaccination required — quarantine is possible depending on origin.' },
  mexico: { name: 'Mexico', status: 'easy', note: 'One of the easier destinations — a health certificate and proof of rabies vaccination are generally all that\'s required, with no routine quarantine.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'easy', note: "As a US territory, bringing a pet is essentially the same as domestic US travel — no special import process." },
  bahamas: { name: 'Bahamas', status: 'strict', note: 'Maintains rabies-free status, so an import permit is required and quarantine has historically applied — check current requirements well ahead of travel.' },
  jamaica: { name: 'Jamaica', status: 'strict', note: 'Maintains rabies-free status, so an import permit is required and quarantine has historically applied — check current requirements well ahead of travel.' },
  aruba: { name: 'Aruba', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  'st-lucia': { name: 'St. Lucia', status: 'strict', note: 'Maintains rabies-free status, so an import permit is required and quarantine may apply — check current requirements well ahead of travel.' },
  'costa-rica': { name: 'Costa Rica', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  panama: { name: 'Panama', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  belize: { name: 'Belize', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'strict', note: 'Maintains rabies-free status, so an import permit is required and quarantine may apply — check current requirements well ahead of travel.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  curacao: { name: 'Curaçao', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  canada: { name: 'Canada', status: 'easy', note: 'Straightforward for dogs and cats from the US with proof of rabies vaccination — no routine quarantine.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'moderate', note: 'Requires an import permit, microchip, and rabies vaccination — arranged through UAE authorities before travel.' },
  morocco: { name: 'Morocco', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  'south-africa': { name: 'South Africa', status: 'moderate', note: 'Requires an import permit, veterinary health certificate, microchip, and rabies vaccination.' },
  qatar: { name: 'Qatar', status: 'moderate', note: 'Requires an import permit, microchip, and rabies vaccination — arranged through Qatari authorities before travel.' },
  israel: { name: 'Israel', status: 'moderate', note: 'Requires an import permit, microchip, and rabies vaccination, arranged shortly before travel.' },
  tanzania: { name: 'Tanzania', status: 'moderate', note: 'Requires an import permit, health certificate, and rabies vaccination — worth noting pets aren\'t practical for most safari itineraries regardless.' },
  kenya: { name: 'Kenya', status: 'moderate', note: 'Requires an import permit, health certificate, and rabies vaccination — worth noting pets aren\'t practical for most safari itineraries regardless.' },
  argentina: { name: 'Argentina', status: 'easy', note: 'Relatively accessible — a health certificate and proof of rabies vaccination are generally sufficient, with no routine quarantine.' },
  peru: { name: 'Peru', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  chile: { name: 'Chile', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  colombia: { name: 'Colombia', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
  brazil: { name: 'Brazil', status: 'moderate', note: 'Requires a health certificate, microchip, and rabies vaccination, arranged shortly before travel.' },
};

const STATUS_LABELS = { easy: 'straightforward', moderate: 'doable with preparation', strict: 'difficult — expect quarantine and months of lead time' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `Bringing a pet to ${data.name}: ${STATUS_LABELS[data.status]}.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel: STATUS_LABELS[data.status],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/pet-travel-checker/calculate
// @access Public
exports.calculatePetTravel = (req, res) => {
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
// @route POST /api/tools/pet-travel-checker/pdf
// @access Public
exports.generatePetTravelPdf = async (req, res) => {
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
      [email, firstName || null, 'pet-travel-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Pet Travel Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pet-travel-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      result.status === 'strict'
        ? 'Start the process months in advance — quarantine requirements and blood titer tests often have mandatory waiting periods that can\'t be rushed at any price.'
        : 'Start the paperwork a few weeks before travel — a health certificate is usually only valid for a limited window before departure, so timing matters.',
      'Confirm your airline\'s own pet policy separately from the country\'s import rules — cabin/cargo eligibility, carrier size limits, and breed restrictions vary widely by airline.',
      'Book a vet appointment specifically for travel paperwork — not every vet is set up to issue the exact certificate format your destination requires.',
      'Check the return trip requirements too — some countries make it easier to enter than to bring your pet back out again.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🐾 Your ${result.countryName} pet travel guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your pet travel check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the pet paperwork? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send pet-travel-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePetTravelPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
