const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Driving side + International Driving Permit requirement per country,
// reused from Tool #3's country list. side: 'left' | 'right'.
// idpStatus: 'required' | 'recommended' | 'not_required'.
const COUNTRIES = {
  france: { name: 'France', side: 'right', idpStatus: 'recommended', note: "France doesn't typically demand an IDP from US visitors, but many rental companies require one alongside your US license, especially for longer stays." },
  austria: { name: 'Austria', side: 'right', idpStatus: 'required', note: 'Austria officially requires an International Driving Permit alongside your US license to drive legally.' },
  'czech-republic': { name: 'Czech Republic', side: 'right', idpStatus: 'recommended', note: "An IDP isn't strictly enforced for short tourist stays, but it's recommended and often requested by rental companies." },
  denmark: { name: 'Denmark', side: 'right', idpStatus: 'recommended', note: "Denmark generally accepts a US license for short stays, but an IDP is recommended and sometimes required by rental agencies." },
  germany: { name: 'Germany', side: 'right', idpStatus: 'recommended', note: 'Germany generally accepts a US license for short tourist stays but strongly recommends carrying an IDP, and many rental companies require one.' },
  greece: { name: 'Greece', side: 'right', idpStatus: 'required', note: 'Greece officially requires an International Driving Permit for US license holders to drive legally.' },
  hungary: { name: 'Hungary', side: 'right', idpStatus: 'recommended', note: "An IDP isn't strictly enforced for short tourist stays, but it's recommended and often requested by rental companies." },
  iceland: { name: 'Iceland', side: 'right', idpStatus: 'recommended', note: 'Iceland generally accepts a US license for short stays, but an IDP is recommended, particularly for winter/rural rentals.' },
  italy: { name: 'Italy', side: 'right', idpStatus: 'required', note: 'Italy officially requires an International Driving Permit alongside a US license for foreign drivers.' },
  netherlands: { name: 'Netherlands', side: 'right', idpStatus: 'recommended', note: "The Netherlands generally accepts a US license for short stays, but an IDP is recommended and sometimes required by rental agencies." },
  portugal: { name: 'Portugal', side: 'right', idpStatus: 'recommended', note: "Portugal generally accepts a US license for short stays, but an IDP is recommended and often requested by rental companies." },
  spain: { name: 'Spain', side: 'right', idpStatus: 'required', note: 'Spain officially requires an International Driving Permit for US license holders to drive legally.' },
  sweden: { name: 'Sweden', side: 'right', idpStatus: 'recommended', note: "Sweden generally accepts a US license for short stays, but an IDP is recommended and sometimes required by rental agencies." },
  switzerland: { name: 'Switzerland', side: 'right', idpStatus: 'recommended', note: "Switzerland generally accepts a US license for short stays, but an IDP is recommended and often requested by rental companies." },
  ireland: { name: 'Ireland', side: 'left', idpStatus: 'recommended', note: "Ireland doesn't require an IDP for short-term US visitors, but it's recommended, particularly as backup ID for rental car companies." },
  'united-kingdom': { name: 'United Kingdom', side: 'left', idpStatus: 'not_required', note: 'The UK does not require an IDP for US visitors driving short-term with a valid US license.' },
  turkey: { name: 'Turkey', side: 'right', idpStatus: 'recommended', note: "Turkey recommends carrying an IDP alongside your US license, and it's often required by rental car companies." },
  japan: { name: 'Japan', side: 'left', idpStatus: 'required', note: 'Japan requires an International Driving Permit (1949 Geneva Convention format) for most US visitors — a US license alone is not valid for driving.' },
  thailand: { name: 'Thailand', side: 'left', idpStatus: 'required', note: 'Thailand requires an IDP for foreign visitors to drive legally; a US license alone is not accepted.' },
  indonesia: { name: 'Indonesia', side: 'left', idpStatus: 'required', note: 'Indonesia requires an IDP for foreign visitors to drive, including in Bali.' },
  singapore: { name: 'Singapore', side: 'left', idpStatus: 'recommended', note: 'Singapore accepts a valid US license for short visits but recommends carrying an IDP as well.' },
  'south-korea': { name: 'South Korea', side: 'right', idpStatus: 'required', note: 'South Korea requires an International Driving Permit for foreign visitors to drive.' },
  'hong-kong': { name: 'Hong Kong', side: 'left', idpStatus: 'recommended', note: 'Hong Kong generally accepts a US license for short visits, but an IDP is recommended, particularly for rentals.' },
  vietnam: { name: 'Vietnam', side: 'right', idpStatus: 'required', note: 'Vietnam requires an IDP (and in some cases a Vietnamese license) for foreign visitors to drive legally.' },
  philippines: { name: 'Philippines', side: 'right', idpStatus: 'recommended', note: 'The Philippines generally accepts a US license for short stays, but an IDP is recommended and often requested by rental agencies.' },
  malaysia: { name: 'Malaysia', side: 'left', idpStatus: 'recommended', note: 'Malaysia generally accepts a US license for short stays, but an IDP is recommended and often requested by rental agencies.' },
  china: { name: 'China', side: 'right', idpStatus: 'not_required', note: "Mainland China does not recognize the IDP — foreign visitors generally cannot drive there without obtaining a Chinese driving license, so self-drive rentals are effectively unavailable." },
  india: { name: 'India', side: 'left', idpStatus: 'required', note: 'India requires an International Driving Permit for foreign visitors to drive legally.' },
  maldives: { name: 'Maldives', side: 'left', idpStatus: 'not_required', note: "Most visitors to the Maldives never drive — inter-island transport is by boat or seaplane, and self-drive rentals are uncommon outside Malé." },
  taiwan: { name: 'Taiwan', side: 'right', idpStatus: 'required', note: 'Taiwan requires an International Driving Permit alongside your home license for foreign visitors to drive.' },
  'sri-lanka': { name: 'Sri Lanka', side: 'left', idpStatus: 'required', note: 'Sri Lanka requires an International Driving Permit for foreign visitors to drive legally.' },
  cambodia: { name: 'Cambodia', side: 'right', idpStatus: 'recommended', note: 'Cambodia generally accepts a US license for short stays, but an IDP is recommended and often requested by rental agencies.' },
  australia: { name: 'Australia', side: 'left', idpStatus: 'recommended', note: 'Most Australian states accept a valid US license for short visits, but carrying an IDP alongside it is recommended.' },
  'new-zealand': { name: 'New Zealand', side: 'left', idpStatus: 'recommended', note: 'New Zealand accepts a valid US license for short visits, but carrying an IDP alongside it is recommended.' },
  fiji: { name: 'Fiji', side: 'left', idpStatus: 'recommended', note: 'Fiji generally accepts a US license for short stays, but an IDP is recommended and often requested by rental agencies.' },
  'french-polynesia': { name: 'French Polynesia', side: 'right', idpStatus: 'recommended', note: 'French Polynesia generally accepts a US license for short stays, but an IDP is recommended and often requested by rental agencies.' },
  mexico: { name: 'Mexico', side: 'right', idpStatus: 'not_required', note: "Mexico doesn't require an IDP — a valid US driver's license is accepted for driving and car rentals." },
  'dominican-republic': { name: 'Dominican Republic', side: 'right', idpStatus: 'recommended', note: "The Dominican Republic generally accepts a US license for visitors, but an IDP is recommended and sometimes requested by rental agencies." },
  'puerto-rico': { name: 'Puerto Rico', side: 'right', idpStatus: 'not_required', note: "Puerto Rico is a US territory — your regular US driver's license is valid, no IDP needed." },
  bahamas: { name: 'Bahamas', side: 'left', idpStatus: 'not_required', note: "The Bahamas accepts a valid US driver's license for visitor stays up to 3 months; no IDP required." },
  jamaica: { name: 'Jamaica', side: 'left', idpStatus: 'recommended', note: "Jamaica generally accepts a valid US license for visitors up to a few months, but an IDP is recommended as backup ID." },
  aruba: { name: 'Aruba', side: 'right', idpStatus: 'not_required', note: "Aruba accepts a valid US driver's license for visitors; no IDP required for short stays." },
  'turks-and-caicos': { name: 'Turks and Caicos', side: 'left', idpStatus: 'not_required', note: "Turks and Caicos accepts a valid US driver's license for visitor stays up to a few months; no IDP required." },
  'st-lucia': { name: 'St. Lucia', side: 'left', idpStatus: 'recommended', note: 'St. Lucia requires visitors to obtain a local visitor\'s driving permit (available through rental agencies or the police), rather than relying on an IDP.' },
  'costa-rica': { name: 'Costa Rica', side: 'right', idpStatus: 'not_required', note: "Costa Rica accepts a valid US driver's license for stays up to 90 days; no IDP required." },
  panama: { name: 'Panama', side: 'right', idpStatus: 'not_required', note: "Panama accepts a valid US driver's license for visitors for up to 90 days." },
  belize: { name: 'Belize', side: 'right', idpStatus: 'not_required', note: "Belize accepts a valid US driver's license for visitors for up to 3 months, despite its British colonial history it drives on the right." },
  'cayman-islands': { name: 'Cayman Islands', side: 'left', idpStatus: 'recommended', note: 'The Cayman Islands require visitors to obtain a local temporary driving permit from a rental agency rather than relying on an IDP.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', side: 'left', idpStatus: 'recommended', note: 'Antigua and Barbuda require visitors to buy a local temporary driving permit, obtainable through rental agencies.' },
  curacao: { name: 'Curaçao', side: 'right', idpStatus: 'not_required', note: "Curaçao accepts a valid US driver's license for visitors; no IDP required for short stays." },
  canada: { name: 'Canada', side: 'right', idpStatus: 'not_required', note: "Canada accepts a valid US driver's license for visitors; no IDP required." },
  'united-arab-emirates': { name: 'United Arab Emirates', side: 'right', idpStatus: 'recommended', note: 'The UAE generally accepts US licenses for visitors and rental cars, though carrying an IDP is recommended as backup ID.' },
  morocco: { name: 'Morocco', side: 'right', idpStatus: 'required', note: 'Morocco requires an International Driving Permit for foreign visitors to drive legally.' },
  'south-africa': { name: 'South Africa', side: 'left', idpStatus: 'recommended', note: 'South Africa accepts a valid US license if it includes a photo and is in English, but strongly recommends carrying an IDP too.' },
  qatar: { name: 'Qatar', side: 'right', idpStatus: 'recommended', note: 'Qatar accepts US licenses for short rentals but recommends carrying an IDP as well.' },
  israel: { name: 'Israel', side: 'right', idpStatus: 'not_required', note: "Israel accepts a valid US driver's license for visitors for up to a year; no IDP required." },
  tanzania: { name: 'Tanzania', side: 'left', idpStatus: 'required', note: 'Tanzania requires an International Driving Permit for foreign visitors to drive legally.' },
  kenya: { name: 'Kenya', side: 'left', idpStatus: 'required', note: 'Kenya requires an International Driving Permit (or a temporary local permit) for foreign visitors to drive.' },
  argentina: { name: 'Argentina', side: 'right', idpStatus: 'recommended', note: 'Argentina generally accepts a US license but strongly recommends carrying an IDP too, particularly for rentals.' },
  peru: { name: 'Peru', side: 'right', idpStatus: 'recommended', note: 'Peru accepts a US license for a short grace period, but requires (or strongly recommends) an IDP for longer stays and most rentals ask for one.' },
  chile: { name: 'Chile', side: 'right', idpStatus: 'recommended', note: 'Chile accepts a valid US license for short stays but recommends carrying an IDP as well.' },
  colombia: { name: 'Colombia', side: 'right', idpStatus: 'recommended', note: 'Colombia generally accepts a US license for visitors, but an IDP is recommended and often requested by rental agencies.' },
  brazil: { name: 'Brazil', side: 'right', idpStatus: 'required', note: 'Brazil requires an International Driving Permit alongside your home license for foreign visitors to drive.' },
};

const SIDE_LABELS = { left: 'left', right: 'right' };
const IDP_LABELS = {
  required: 'you need an International Driving Permit (IDP)',
  recommended: 'an International Driving Permit (IDP) is recommended',
  not_required: 'no International Driving Permit is required — your US license is enough',
};
const IDP_STATUS_LABELS = { required: 'IDP required', recommended: 'IDP recommended', not_required: 'IDP not required' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name} drives on the ${SIDE_LABELS[data.side]} — and ${IDP_LABELS[data.idpStatus]}.`;

  return {
    country, countryName: data.name, side: data.side,
    idpStatus: data.idpStatus, idpStatusLabel: IDP_STATUS_LABELS[data.idpStatus],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/driving-checker/calculate
// @access Public
exports.calculateDriving = (req, res) => {
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
// @route POST /api/tools/driving-checker/pdf
// @access Public
exports.generateDrivingPdf = async (req, res) => {
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
      [email, firstName || null, 'driving-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Driving Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="driving-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.idpStatusLabel);

    pdfService.heading(doc, 'Before you drive');
    pdfService.bulletList(doc, [
      result.idpStatus === 'not_required'
        ? 'Bring your regular US driver\'s license — no extra paperwork needed for a short visit.'
        : 'Get your IDP before you leave the US — it\'s issued by AAA or the National Auto Club, costs around $20, and can\'t be obtained abroad.',
      `Remember ${result.countryName} drives on the ${result.side} — give yourself an extra day to adjust before tackling busy roads or highways.`,
      'Rental counters often ask for both your US license and IDP together, plus a credit card in the driver\'s name.',
      'Photograph both sides of your license and IDP before you travel, in case either is lost.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚗 Your ${result.countryName} driving guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your driving check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond getting around? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send driving-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDrivingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
