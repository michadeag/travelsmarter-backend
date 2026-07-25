const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Emergency numbers per country, reused from Tool #3's country list.
// unifiedNumber is a single number that reaches all emergency services
// (or is the primary one to use); null means the country uses separate
// numbers per service instead.
const COUNTRIES = {
  france: { name: 'France', unifiedNumber: '112', police: '17', fire: '18', ambulance: '15', note: 'The EU-wide 112 number works everywhere in France and connects to all emergency services, including from a foreign mobile phone.' },
  austria: { name: 'Austria', unifiedNumber: '112', police: '133', fire: '122', ambulance: '144', note: 'The EU-wide 112 number works everywhere in Austria and connects to all emergency services.' },
  'czech-republic': { name: 'Czech Republic', unifiedNumber: '112', police: '158', fire: '150', ambulance: '155', note: 'The EU-wide 112 number works everywhere in the Czech Republic and connects to all emergency services.' },
  denmark: { name: 'Denmark', unifiedNumber: '112', police: '114', fire: '112', ambulance: '112', note: 'The EU-wide 112 number works everywhere in Denmark and connects to all emergency services.' },
  germany: { name: 'Germany', unifiedNumber: '112', police: '110', fire: '112', ambulance: '112', note: 'The EU-wide 112 number works everywhere in Germany for fire/medical; use 110 specifically for police.' },
  greece: { name: 'Greece', unifiedNumber: '112', police: '100', fire: '199', ambulance: '166', note: 'The EU-wide 112 number works everywhere in Greece and connects to all emergency services.' },
  hungary: { name: 'Hungary', unifiedNumber: '112', police: '107', fire: '105', ambulance: '104', note: 'The EU-wide 112 number works everywhere in Hungary and connects to all emergency services.' },
  iceland: { name: 'Iceland', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Iceland uses a single unified 112 number for all emergencies, including non-emergency assistance.' },
  italy: { name: 'Italy', unifiedNumber: '112', police: '113', fire: '115', ambulance: '118', note: 'The EU-wide 112 number works everywhere in Italy and connects to all emergency services.' },
  netherlands: { name: 'Netherlands', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'The Netherlands uses a single unified 112 number for all emergencies.' },
  portugal: { name: 'Portugal', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Portugal uses a single unified 112 number for all emergencies.' },
  spain: { name: 'Spain', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Spain uses a single unified 112 number for all emergencies.' },
  sweden: { name: 'Sweden', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Sweden uses a single unified 112 number for all emergencies.' },
  switzerland: { name: 'Switzerland', unifiedNumber: '112', police: '117', fire: '118', ambulance: '144', note: 'The EU-wide 112 number (Switzerland is not in the EU but participates) works for general emergencies; use 117 specifically for police.' },
  ireland: { name: 'Ireland', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Ireland uses 112 or the traditional 999 — both reach all emergency services.' },
  'united-kingdom': { name: 'United Kingdom', unifiedNumber: '999', police: '999', fire: '999', ambulance: '999', note: 'The UK uses 999 as its traditional number; 112 also works and reaches the same services.' },
  turkey: { name: 'Turkey', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Turkey unified all emergency services under a single 112 number.' },
  japan: { name: 'Japan', unifiedNumber: null, police: '110', fire: '119', ambulance: '119', note: 'Japan does not have a single unified emergency number — use 110 for police, 119 for fire or medical emergencies.' },
  thailand: { name: 'Thailand', unifiedNumber: null, police: '191', fire: '199', ambulance: '1669', note: 'Thailand uses separate numbers by service — 191 for police, 199 for fire, 1669 for medical emergencies.' },
  indonesia: { name: 'Indonesia', unifiedNumber: '112', police: '110', fire: '113', ambulance: '118', note: 'Indonesia has rolled out a unified 112 number, though the traditional service-specific numbers still work too.' },
  singapore: { name: 'Singapore', unifiedNumber: null, police: '999', fire: '995', ambulance: '995', note: 'Singapore uses 999 for police and 995 for fire or medical emergencies.' },
  'south-korea': { name: 'South Korea', unifiedNumber: null, police: '112', fire: '119', ambulance: '119', note: 'South Korea uses 112 for police and 119 for fire or medical emergencies.' },
  'hong-kong': { name: 'Hong Kong', unifiedNumber: '999', police: '999', fire: '999', ambulance: '999', note: 'Hong Kong uses a single 999 number for all emergency services.' },
  vietnam: { name: 'Vietnam', unifiedNumber: null, police: '113', fire: '114', ambulance: '115', note: 'Vietnam uses separate numbers by service — 113 for police, 114 for fire, 115 for ambulance.' },
  philippines: { name: 'Philippines', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'The Philippines has a unified national emergency hotline at 911.' },
  malaysia: { name: 'Malaysia', unifiedNumber: '999', police: '999', fire: '999', ambulance: '999', note: 'Malaysia uses a single 999 number for all emergency services.' },
  china: { name: 'China', unifiedNumber: null, police: '110', fire: '119', ambulance: '120', note: 'China uses separate numbers by service — 110 for police, 119 for fire, 120 for medical emergencies.' },
  india: { name: 'India', unifiedNumber: '112', police: '100', fire: '101', ambulance: '102', note: 'India has rolled out a unified 112 number nationwide, though the traditional service-specific numbers still work too.' },
  maldives: { name: 'Maldives', unifiedNumber: null, police: '119', fire: '118', ambulance: '102', note: 'The Maldives uses separate numbers by service — 119 for police, 118 for fire, 102 for ambulance.' },
  taiwan: { name: 'Taiwan', unifiedNumber: null, police: '110', fire: '119', ambulance: '119', note: 'Taiwan uses 110 for police and 119 for fire or medical emergencies.' },
  'sri-lanka': { name: 'Sri Lanka', unifiedNumber: '119', police: '119', fire: '110', ambulance: '110', note: 'Sri Lanka uses 119 as the main police/emergency hotline; 110 covers fire and ambulance.' },
  cambodia: { name: 'Cambodia', unifiedNumber: null, police: '117', fire: '118', ambulance: '119', note: 'Cambodia uses separate numbers by service — 117 for police, 118 for fire, 119 for ambulance.' },
  australia: { name: 'Australia', unifiedNumber: '000', police: '000', fire: '000', ambulance: '000', note: 'Australia uses a single 000 number for all emergency services.' },
  'new-zealand': { name: 'New Zealand', unifiedNumber: '111', police: '111', fire: '111', ambulance: '111', note: 'New Zealand uses a single 111 number for all emergency services.' },
  fiji: { name: 'Fiji', unifiedNumber: '911', police: '911', fire: '911', ambulance: '917', note: 'Fiji uses 911 for police and fire; 917 is the dedicated ambulance number.' },
  'french-polynesia': { name: 'French Polynesia', unifiedNumber: null, police: '17', fire: '18', ambulance: '15', note: 'French Polynesia follows the French emergency number system — 17 for police, 18 for fire, 15 for medical.' },
  mexico: { name: 'Mexico', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Mexico uses a unified 911 number nationwide for all emergency services.' },
  'dominican-republic': { name: 'Dominican Republic', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'The Dominican Republic uses a unified 911 number for all emergency services.' },
  'puerto-rico': { name: 'Puerto Rico', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Puerto Rico uses 911, the same as the rest of the US.' },
  bahamas: { name: 'Bahamas', unifiedNumber: '911', police: '919', fire: '919', ambulance: '911', note: 'The Bahamas uses 911 in most areas, though 919 is also used for police/fire on some islands.' },
  jamaica: { name: 'Jamaica', unifiedNumber: null, police: '119', fire: '110', ambulance: '110', note: 'Jamaica uses 119 for police and 110 for fire or ambulance.' },
  aruba: { name: 'Aruba', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Aruba uses a unified 911 number for all emergency services.' },
  'turks-and-caicos': { name: 'Turks and Caicos', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Turks and Caicos uses a unified 911 number for all emergency services.' },
  'st-lucia': { name: 'St. Lucia', unifiedNumber: '911', police: '999', fire: '911', ambulance: '911', note: 'St. Lucia uses 911 as the main emergency number; 999 also reaches police.' },
  'costa-rica': { name: 'Costa Rica', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Costa Rica uses a unified 911 number for all emergency services.' },
  panama: { name: 'Panama', unifiedNumber: '911', police: '104', fire: '103', ambulance: '911', note: 'Panama uses 911 as the general emergency number, alongside some service-specific numbers.' },
  belize: { name: 'Belize', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Belize uses a unified 911 number for all emergency services.' },
  'cayman-islands': { name: 'Cayman Islands', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'The Cayman Islands use a unified 911 number for all emergency services.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Antigua and Barbuda use a unified 911 number for all emergency services.' },
  curacao: { name: 'Curaçao', unifiedNumber: '911', police: '911', fire: '911', ambulance: '912', note: 'Curaçao uses 911 for police/fire and 912 as a dedicated ambulance line.' },
  canada: { name: 'Canada', unifiedNumber: '911', police: '911', fire: '911', ambulance: '911', note: 'Canada uses 911, the same as the US, for all emergency services nationwide.' },
  'united-arab-emirates': { name: 'United Arab Emirates', unifiedNumber: null, police: '999', fire: '997', ambulance: '998', note: 'The UAE uses separate numbers by service — 999 for police, 997 for fire, 998 for ambulance.' },
  morocco: { name: 'Morocco', unifiedNumber: null, police: '19', fire: '15', ambulance: '15', note: 'Morocco uses 19 for police and 15 for fire or medical emergencies.' },
  'south-africa': { name: 'South Africa', unifiedNumber: '112', police: '10111', fire: '10177', ambulance: '10177', note: '112 works from any mobile phone and reaches all services; 10111 is the dedicated police line.' },
  qatar: { name: 'Qatar', unifiedNumber: '999', police: '999', fire: '999', ambulance: '999', note: 'Qatar uses a unified 999 number for all emergency services.' },
  israel: { name: 'Israel', unifiedNumber: null, police: '100', fire: '102', ambulance: '101', note: 'Israel uses separate numbers by service — 100 for police, 102 for fire, 101 for ambulance.' },
  tanzania: { name: 'Tanzania', unifiedNumber: '112', police: '112', fire: '112', ambulance: '112', note: 'Tanzania uses a unified 112 number for all emergency services, including in Zanzibar.' },
  kenya: { name: 'Kenya', unifiedNumber: '999', police: '999', fire: '999', ambulance: '999', note: 'Kenya uses 999 as the main emergency number; 112 also works from mobile phones.' },
  argentina: { name: 'Argentina', unifiedNumber: '911', police: '911', fire: '100', ambulance: '107', note: 'Argentina uses 911 as the general emergency number in most major cities, including Buenos Aires.' },
  peru: { name: 'Peru', unifiedNumber: null, police: '105', fire: '116', ambulance: '106', note: 'Peru uses separate numbers by service — 105 for police, 116 for fire, 106 for ambulance.' },
  chile: { name: 'Chile', unifiedNumber: null, police: '133', fire: '132', ambulance: '131', note: 'Chile uses separate numbers by service — 133 for police (Carabineros), 132 for fire, 131 for ambulance.' },
  colombia: { name: 'Colombia', unifiedNumber: '123', police: '123', fire: '123', ambulance: '123', note: 'Colombia uses a unified 123 number for all emergency services.' },
  brazil: { name: 'Brazil', unifiedNumber: null, police: '190', fire: '193', ambulance: '192', note: 'Brazil uses separate numbers by service — 190 for police, 192 for ambulance (SAMU), 193 for fire.' },
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = data.unifiedNumber
    ? `In ${data.name}, dial ${data.unifiedNumber} for any emergency.`
    : `${data.name} uses separate numbers: ${data.police} for police, ${data.fire} for fire, ${data.ambulance} for ambulance.`;

  return {
    country, countryName: data.name,
    unifiedNumber: data.unifiedNumber, police: data.police, fire: data.fire, ambulance: data.ambulance,
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/emergency-number-checker/calculate
// @access Public
exports.calculateEmergencyNumbers = (req, res) => {
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
// @route POST /api/tools/emergency-number-checker/pdf
// @access Public
exports.generateEmergencyPdf = async (req, res) => {
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
      [email, firstName || null, 'emergency-number-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Emergency Numbers`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="emergency-number-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Police: ${result.police} · Fire: ${result.fire} · Ambulance: ${result.ambulance}`);

    pdfService.heading(doc, 'If you need help as a US citizen abroad');
    pdfService.bulletList(doc, [
      'For serious emergencies (arrest, death, or crisis situations), contact the nearest US Embassy or Consulate — find current contact details at state.gov before you travel.',
      'The US State Department\'s Smart Traveler Enrollment Program (STEP) lets you register your trip so the embassy can reach you in an emergency or crisis.',
      'Save these emergency numbers in your phone before you land — data/wifi may not be available right when you need them.',
      'Local emergency operators may not speak English fluently in some destinations — knowing a few key phrases or having a translation app ready can help.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚨 Your ${result.countryName} emergency numbers`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here are the emergency numbers for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond safety prep? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send emergency-number-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateEmergencyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
