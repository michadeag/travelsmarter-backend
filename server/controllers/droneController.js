const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Drone/photography rules per country, reused from Tool #3's country
// list. status: 'easy' | 'restricted' | 'banned'.
const COUNTRIES = {
  france: { name: 'France', status: 'easy', note: "Register your drone online via France's AlphaTango platform before flying if it weighs over 250g — otherwise routine EU rules apply. Avoid flying near the Eiffel Tower, government buildings, and Paris's no-fly zones; photography is otherwise unrestricted." },
  austria: { name: 'Austria', status: 'easy', note: 'Register your drone with Austro Control if it weighs over 250g — standard EU rules apply, and flying is generally straightforward outside city centers and airports.' },
  'czech-republic': { name: 'Czech Republic', status: 'easy', note: "Register your drone under EU rules before flying — generally accessible, though Prague's historic center has no-fly restrictions." },
  denmark: { name: 'Denmark', status: 'easy', note: "Register your drone under EU rules before flying — straightforward outside central Copenhagen's no-fly zones." },
  germany: { name: 'Germany', status: 'easy', note: 'Register and label your drone under EU rules, and carry proof of liability insurance — generally accessible outside city centers and near airports.' },
  greece: { name: 'Greece', status: 'restricted', note: 'Drone flying is banned at archaeological sites, including the Acropolis, without special permission — register under EU rules for flights elsewhere.' },
  hungary: { name: 'Hungary', status: 'easy', note: "Register your drone under EU rules before flying — generally accessible outside central Budapest's no-fly zones." },
  iceland: { name: 'Iceland', status: 'easy', note: 'Register your drone under EU-aligned rules — many national parks and protected natural sites restrict drone flying, so check specific locations.' },
  italy: { name: 'Italy', status: 'restricted', note: 'Drone flying is banned or heavily restricted in historic centers like Rome, Venice, and Florence, and near the Vatican — register with ENAC and carry insurance for flights elsewhere.' },
  netherlands: { name: 'Netherlands', status: 'easy', note: "Register your drone under EU rules — central Amsterdam has strict no-fly zones, but flying is straightforward elsewhere." },
  portugal: { name: 'Portugal', status: 'easy', note: 'Register your drone under EU rules before flying — generally accessible outside city centers and airports.' },
  spain: { name: 'Spain', status: 'restricted', note: 'Spain enforces some of the strictest tourist drone rules in Europe — flying without a permit in cities is largely banned, and drones are commonly confiscated.' },
  sweden: { name: 'Sweden', status: 'easy', note: "Register your drone under EU rules before flying — generally accessible outside central Stockholm's no-fly zones." },
  switzerland: { name: 'Switzerland', status: 'easy', note: 'Register your drone with FOCA before flying — Swiss rules mirror EU standards and are generally straightforward to follow.' },
  ireland: { name: 'Ireland', status: 'easy', note: "Register your drone with the IAA before flying — generally accessible outside Dublin's city center and airport zones." },
  'united-kingdom': { name: 'United Kingdom', status: 'easy', note: 'Register for a Flyer ID and Operator ID with the UK CAA before flying, even for a short visit — otherwise straightforward outside restricted zones.' },
  turkey: { name: 'Turkey', status: 'banned', note: "Tourist drone use is effectively banned — permits from Turkey's civil aviation authority are required and rarely practical to obtain for a short visit; drones are commonly confiscated at customs." },
  japan: { name: 'Japan', status: 'restricted', note: 'Flying over populated areas (which covers most of Tokyo and other cities) requires advance permission from Japan\'s aviation authority — plan well ahead if you want to fly.' },
  thailand: { name: 'Thailand', status: 'restricted', note: "Camera drones must be registered with Thailand's NBTC and CAAT, ideally before you arrive — plan ahead, as this isn't a same-day process." },
  indonesia: { name: 'Indonesia', status: 'restricted', note: 'Drone flying requires registration and permits, and many temples in Bali restrict drones entirely — check specific site rules before flying.' },
  singapore: { name: 'Singapore', status: 'restricted', note: "Nearly any drone flight requires a permit in Singapore's small, dense airspace — impractical for most casual tourist use." },
  'south-korea': { name: 'South Korea', status: 'restricted', note: 'Drone flying near the DMZ, military installations, and much of central Seoul requires special permits — check restricted zones carefully before flying.' },
  'hong-kong': { name: 'Hong Kong', status: 'easy', note: 'Register your drone with the Civil Aviation Department if it weighs over 250g — generally accessible outside restricted zones.' },
  vietnam: { name: 'Vietnam', status: 'banned', note: 'Tourist drone use is effectively banned — permits require weeks of advance government approval, and drones are commonly confiscated at customs on arrival.' },
  philippines: { name: 'Philippines', status: 'restricted', note: 'Drone flying requires a permit from CAAP — plan ahead, especially for flights near airports or government sites.' },
  malaysia: { name: 'Malaysia', status: 'restricted', note: 'Camera drones require registration and permits from CAAM — plan ahead before your trip.' },
  china: { name: 'China', status: 'banned', note: 'Tourist drone use is effectively banned in mainland China — drones are commonly confiscated at customs, and permits are rarely practical to obtain for visitors.' },
  india: { name: 'India', status: 'restricted', note: "Drone registration is required through India's Digital Sky platform, and rules for foreign tourists remain bureaucratic and restrictive — check current requirements well before you travel." },
  maldives: { name: 'Maldives', status: 'restricted', note: 'Flying over inhabited islands and most resorts requires prior permission — many resorts allow drones with advance approval, so ask before you arrive.' },
  taiwan: { name: 'Taiwan', status: 'easy', note: 'Register your camera drone before flying — generally accessible outside restricted zones near airports and government buildings.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'restricted', note: "Drone flying requires a permit from Sri Lanka's Civil Aviation Authority — plan ahead, as this isn't a same-day process." },
  cambodia: { name: 'Cambodia', status: 'restricted', note: 'Drone flying is banned around Angkor Wat without special authorization — permits are required elsewhere too.' },
  australia: { name: 'Australia', status: 'easy', note: 'Register your drone with CASA if it weighs over 250g — generally straightforward outside restricted zones near airports.' },
  'new-zealand': { name: 'New Zealand', status: 'easy', note: "Follow New Zealand CAA's basic rules for recreational drones — generally tourist-friendly outside restricted areas." },
  fiji: { name: 'Fiji', status: 'restricted', note: "Drone flying requires a permit from Fiji's Civil Aviation Authority — plan ahead before your trip." },
  'french-polynesia': { name: 'French Polynesia', status: 'restricted', note: 'Drone flying requires registration, and many resort lagoons restrict drones — check with your resort or the relevant authority before flying.' },
  mexico: { name: 'Mexico', status: 'easy', note: 'Register your drone with AFAC before flying — generally accessible for tourists outside restricted zones.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'restricted', note: 'Drone flying requires a permit from IDAC, particularly near airports and government buildings.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'easy', note: 'As US territory, standard FAA drone registration rules apply — generally straightforward outside restricted zones.' },
  bahamas: { name: 'Bahamas', status: 'easy', note: 'Register with the Bahamas Civil Aviation Authority before flying — the process is accessible for short-term visitors.' },
  jamaica: { name: 'Jamaica', status: 'restricted', note: 'Drone flying requires a permit from the Jamaica Civil Aviation Authority — plan ahead before your trip.' },
  aruba: { name: 'Aruba', status: 'restricted', note: 'Drone flying requires a permit — plan ahead before your trip.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'restricted', note: 'Drone flying requires a permit from the Civil Aviation Authority — plan ahead before your trip.' },
  'st-lucia': { name: 'St. Lucia', status: 'restricted', note: 'Drone flying requires a permit — plan ahead before your trip.' },
  'costa-rica': { name: 'Costa Rica', status: 'easy', note: 'Recreational drone flying is generally allowed with basic rules — national parks often restrict or ban drones, so check specific locations.' },
  panama: { name: 'Panama', status: 'restricted', note: "Drone flying requires a permit from Panama's AAC — plan ahead before your trip." },
  belize: { name: 'Belize', status: 'easy', note: 'Register your drone before flying — the process is relatively accessible for visitors.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'restricted', note: 'Drone flying requires a permit from the Cayman Islands Airports Authority — plan ahead before your trip.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'restricted', note: 'Drone flying requires a permit — plan ahead before your trip.' },
  curacao: { name: 'Curaçao', status: 'restricted', note: 'Drone flying requires a permit — plan ahead before your trip.' },
  canada: { name: 'Canada', status: 'easy', note: 'Register your drone online with Transport Canada and pass a basic exam if it weighs 250g-25kg — a straightforward same-day process.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'banned', note: 'Tourist drone use is effectively banned — drones are commonly confiscated at Dubai and Abu Dhabi airports, and GCAA permits are rarely practical to obtain for visitors.' },
  morocco: { name: 'Morocco', status: 'banned', note: 'Tourist drones are commonly confiscated at customs — a special import permit obtained well in advance is required, and this is rarely practical for a short visit.' },
  'south-africa': { name: 'South Africa', status: 'easy', note: 'Register your camera drone with SACAA before flying — generally accessible outside restricted zones.' },
  qatar: { name: 'Qatar', status: 'banned', note: 'Tourist drone use is effectively banned — permits are very difficult to obtain, and drones are commonly confiscated at customs.' },
  israel: { name: 'Israel', status: 'restricted', note: 'Drone flying requires a permit due to security concerns, especially near borders and in Jerusalem — plan ahead before your trip.' },
  tanzania: { name: 'Tanzania', status: 'restricted', note: 'Drone flying requires a permit from the TCAA, and most national parks (including popular safari areas) ban drones entirely.' },
  kenya: { name: 'Kenya', status: 'restricted', note: 'Drone flying requires a permit from the KCAA, and most national parks (including popular safari areas) ban drones entirely.' },
  argentina: { name: 'Argentina', status: 'easy', note: 'Register your drone with ANAC before flying — generally accessible for tourists outside restricted zones.' },
  peru: { name: 'Peru', status: 'restricted', note: 'Drone flying is banned at Machu Picchu and most archaeological sites without special authorization — register with DGAC for flights elsewhere.' },
  chile: { name: 'Chile', status: 'easy', note: 'Register your drone with the DGAC before flying — generally accessible outside restricted zones.' },
  colombia: { name: 'Colombia', status: 'easy', note: 'Register your drone with Aerocivil before flying — generally accessible outside restricted zones.' },
  brazil: { name: 'Brazil', status: 'easy', note: "Register your drone via Brazil's SISANT platform before flying — generally accessible outside restricted zones." },
};

const STATUS_LABELS = { easy: 'drone-friendly with basic registration', restricted: 'restricted — permits required for most areas', banned: 'effectively banned for tourists' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}: drones are ${STATUS_LABELS[data.status]}.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel: STATUS_LABELS[data.status],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/drone-checker/calculate
// @access Public
exports.calculateDrone = (req, res) => {
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
// @route POST /api/tools/drone-checker/pdf
// @access Public
exports.generateDronePdf = async (req, res) => {
  try {
    const { email, firstName, country } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['drone-checker', firstName || null, 'drone-checker',
        JSON.stringify({ country }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Drone & Photography Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="drone-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you pack your drone');
    pdfService.bulletList(doc, [
      result.status === 'banned'
        ? 'Consider leaving your drone at home — confiscation at customs is common, and even a "confiscated, returned on departure" process can eat hours of your trip.'
        : 'Complete any required registration before you fly, not after you land — most authorities don\'t offer same-day approval.',
      'Never fly near airports, military installations, government buildings, or large public gatherings, regardless of what\'s technically permitted — these are the fastest way to have a drone confiscated anywhere in the world.',
      'Photographing military sites, government buildings, and some infrastructure (bridges, ports) can be restricted even without a drone — check local norms, not just drone-specific rules.',
      'Keep your drone registration certificate and any permits on you (digital copies work) — customs and local authorities may ask to see them.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📸 Your ${result.countryName} drone & photography guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your drone check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the drone bag? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send drone-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDronePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
