const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// General travel-health orientation per country, reused from Tool #3's
// country list. This is educational general guidance, not medical advice —
// every result and PDF clearly points travelers to the CDC and a travel
// clinic for personalized recommendations.
// yellowFeverEntryRequirement: true if proof of yellow fever vaccination
// is commonly required for entry (varies by traveler's prior-country
// history — always verify with the destination's embassy).
// malariaRisk: 'none' | 'low' | 'moderate' | 'high'
const COUNTRIES = {
  france: { name: 'France', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  austria: { name: 'Austria', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'czech-republic': { name: 'Czech Republic', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  denmark: { name: 'Denmark', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  germany: { name: 'Germany', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  greece: { name: 'Greece', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  hungary: { name: 'Hungary', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  iceland: { name: 'Iceland', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  italy: { name: 'Italy', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  netherlands: { name: 'Netherlands', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  portugal: { name: 'Portugal', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  spain: { name: 'Spain', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  sweden: { name: 'Sweden', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  switzerland: { name: 'Switzerland', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  ireland: { name: 'Ireland', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'united-kingdom': { name: 'United Kingdom', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  turkey: { name: 'Turkey', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date', 'Hepatitis A (for some travelers)'] },
  japan: { name: 'Japan', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  thailand: { name: 'Thailand', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for rural/border areas'] },
  indonesia: { name: 'Indonesia', yellowFeverEntryRequirement: false, malariaRisk: 'moderate', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions outside major tourist cities', 'Japanese Encephalitis (for extended rural stays)'] },
  singapore: { name: 'Singapore', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'south-korea': { name: 'South Korea', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'hong-kong': { name: 'Hong Kong', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  vietnam: { name: 'Vietnam', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for rural areas'] },
  philippines: { name: 'Philippines', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for some rural/island areas'] },
  malaysia: { name: 'Malaysia', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for rural Borneo'] },
  china: { name: 'China', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Hepatitis A', 'Typhoid (for extended/rural travel)'] },
  india: { name: 'India', yellowFeverEntryRequirement: false, malariaRisk: 'moderate', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions', 'Japanese Encephalitis (for extended rural stays)'] },
  maldives: { name: 'Maldives', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  taiwan: { name: 'Taiwan', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'sri-lanka': { name: 'Sri Lanka', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid'] },
  cambodia: { name: 'Cambodia', yellowFeverEntryRequirement: false, malariaRisk: 'moderate', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions outside Phnom Penh/Siem Reap city centers'] },
  australia: { name: 'Australia', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'new-zealand': { name: 'New Zealand', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  fiji: { name: 'Fiji', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'french-polynesia': { name: 'French Polynesia', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  mexico: { name: 'Mexico', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Hepatitis A', 'Typhoid (for extended/rural travel)'] },
  'dominican-republic': { name: 'Dominican Republic', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for rural areas'] },
  'puerto-rico': { name: 'Puerto Rico', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  bahamas: { name: 'Bahamas', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  jamaica: { name: 'Jamaica', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Hepatitis A'] },
  aruba: { name: 'Aruba', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'turks-and-caicos': { name: 'Turks and Caicos', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'st-lucia': { name: 'St. Lucia', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'costa-rica': { name: 'Costa Rica', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for rural/coastal border areas'] },
  panama: { name: 'Panama', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Yellow fever vaccination recommended for parts east of the canal'] },
  belize: { name: 'Belize', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for rural areas'] },
  'cayman-islands': { name: 'Cayman Islands', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  curacao: { name: 'Curaçao', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  canada: { name: 'Canada', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  'united-arab-emirates': { name: 'United Arab Emirates', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  morocco: { name: 'Morocco', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Hepatitis A', 'Typhoid (for extended/rural travel)'] },
  'south-africa': { name: 'South Africa', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Hepatitis A', 'Typhoid', 'Malaria precautions for northeastern safari regions (Kruger area)'] },
  qatar: { name: 'Qatar', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  israel: { name: 'Israel', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  tanzania: { name: 'Tanzania', yellowFeverEntryRequirement: true, malariaRisk: 'high', commonRecommended: ['Yellow fever vaccination', 'Malaria prevention medication', 'Hepatitis A', 'Typhoid'] },
  kenya: { name: 'Kenya', yellowFeverEntryRequirement: true, malariaRisk: 'high', commonRecommended: ['Yellow fever vaccination', 'Malaria prevention medication', 'Hepatitis A', 'Typhoid'] },
  argentina: { name: 'Argentina', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date', 'Yellow fever recommended for northern border regions'] },
  peru: { name: 'Peru', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Yellow fever recommended for Amazon/jungle regions (not Lima or Cusco)', 'Hepatitis A', 'Typhoid', 'Altitude precautions for Cusco/Machu Picchu'] },
  chile: { name: 'Chile', yellowFeverEntryRequirement: false, malariaRisk: 'none', commonRecommended: ['Routine vaccines up to date'] },
  colombia: { name: 'Colombia', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Yellow fever recommended for most areas below 2,300m, not required for Bogotá/Cartagena city centers', 'Hepatitis A', 'Typhoid'] },
  brazil: { name: 'Brazil', yellowFeverEntryRequirement: false, malariaRisk: 'low', commonRecommended: ['Yellow fever recommended for most of the country outside coastal cities like Rio/São Paulo', 'Hepatitis A', 'Typhoid'] },
};

const MALARIA_LABELS = { none: 'No malaria risk', low: 'Low malaria risk', moderate: 'Moderate malaria risk', high: 'High malaria risk' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  let headline;
  if (data.yellowFeverEntryRequirement) {
    headline = `${data.name} commonly requires proof of yellow fever vaccination for entry — verify with the embassy based on your travel history.`;
  } else if (data.malariaRisk === 'high' || data.malariaRisk === 'moderate') {
    headline = `${data.name} has ${MALARIA_LABELS[data.malariaRisk].toLowerCase()} in parts of the country — talk to a travel clinic about prevention.`;
  } else if (data.malariaRisk === 'low') {
    headline = `${data.name} has some malaria risk in certain regions — check whether your specific itinerary is affected.`;
  } else {
    headline = `${data.name} has no significant malaria or yellow fever concerns — routine vaccines are generally sufficient.`;
  }

  return {
    country, countryName: data.name,
    yellowFeverEntryRequirement: data.yellowFeverEntryRequirement,
    malariaRisk: data.malariaRisk, malariaRiskLabel: MALARIA_LABELS[data.malariaRisk],
    commonRecommended: data.commonRecommended,
    headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/health-checker/calculate
// @access Public
exports.calculateHealthInfo = (req, res) => {
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
// @route POST /api/tools/health-checker/pdf
// @access Public
exports.generateHealthPdf = async (req, res) => {
  try {
    const { email, firstName, country } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [email, firstName || null, 'travel-health-checker',
        JSON.stringify({ country }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Travel Health Orientation`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="travel-health-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, 'This is general educational orientation, not medical advice. Requirements and recommendations depend on your health history, itinerary details, and how recently official guidance has changed — always confirm with the CDC (cdc.gov/travel) and a travel medicine clinic 4-6 weeks before departure.');

    pdfService.highlightBox(doc, `${result.countryName}: ${result.malariaRiskLabel}${result.yellowFeverEntryRequirement ? ' · Yellow fever proof commonly required for entry' : ''}`);

    pdfService.heading(doc, 'Commonly recommended for this destination');
    pdfService.bulletList(doc, result.commonRecommended);

    pdfService.heading(doc, 'Before you travel');
    pdfService.bulletList(doc, [
      'Visit a travel medicine clinic or your doctor 4-6 weeks before departure — some vaccines need time to become effective or require multiple doses.',
      'Check cdc.gov/travel for the most current, official guidance for your specific destination and itinerary.',
      'If yellow fever vaccination is required, keep your International Certificate of Vaccination (yellow card) with your passport while traveling.',
      'Malaria prevention often means prescription medication, not just a vaccine — discuss options with a travel clinic if you\'re heading to a risk area.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🩺 Your ${result.countryName} travel health orientation`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your general travel health orientation for ${result.countryName} (not medical advice — see the PDF for details):</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond health prep? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send health-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateHealthPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
