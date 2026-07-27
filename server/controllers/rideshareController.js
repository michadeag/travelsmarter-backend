const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Rideshare app availability per country, reused from Tool #3's country
// list. status: 'full' | 'limited' | 'unavailable'.
const COUNTRIES = {
  france: { name: 'France', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates normally throughout France alongside local alternative Bolt.' },
  austria: { name: 'Austria', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates normally in Vienna and other major cities, alongside Bolt.' },
  'czech-republic': { name: 'Czech Republic', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates normally in Prague, though Bolt is equally or more popular locally.' },
  denmark: { name: 'Denmark', status: 'unavailable', primaryApp: null, localAlternative: 'Viggo, local taxis', note: 'Uber exited Denmark in 2017 due to regulatory disputes and has not returned — use Viggo or a local taxi instead.' },
  germany: { name: 'Germany', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'Bolt, FreeNow', note: 'Uber operates only through licensed limousine/taxi partners due to German regulations, so it behaves more like a taxi-hailing app than classic rideshare. Bolt and FreeNow are widely used alternatives.' },
  greece: { name: 'Greece', status: 'full', primaryApp: 'Uber Taxi', localAlternative: 'Beat, FreeNow', note: 'Uber operates as "Uber Taxi" (hailing licensed taxis) in Athens; Beat is a very popular local alternative.' },
  hungary: { name: 'Hungary', status: 'unavailable', primaryApp: null, localAlternative: 'Bolt', note: 'Uber was banned and exited Hungary in 2016 after a regulatory dispute — Bolt is the dominant ride-hailing app in Budapest instead.' },
  iceland: { name: 'Iceland', status: 'unavailable', primaryApp: null, localAlternative: 'Hopp, local taxis', note: 'Uber has never operated in Iceland — Hopp is the popular local ride-hailing app.' },
  italy: { name: 'Italy', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'FreeNow, itTaxi', note: 'Uber operates in a limited form (mainly Uber Black in Milan and Rome) due to taxi-lobby regulations — regular UberX-style service is largely unavailable.' },
  netherlands: { name: 'Netherlands', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt, FreeNow', note: 'Uber operates normally throughout the Netherlands alongside Bolt and FreeNow.' },
  portugal: { name: 'Portugal', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates normally in Lisbon and other major cities, alongside Bolt.' },
  spain: { name: 'Spain', status: 'full', primaryApp: 'Uber', localAlternative: 'Cabify', note: 'Uber operates normally, though Cabify is a very popular Spanish-founded alternative used widely too.' },
  sweden: { name: 'Sweden', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates normally throughout Sweden alongside Bolt.' },
  switzerland: { name: 'Switzerland', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates normally throughout Switzerland alongside Bolt.' },
  ireland: { name: 'Ireland', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'FreeNow', note: 'Uber operates as a hybrid model connecting you with licensed taxi drivers rather than classic private-hire rideshare — FreeNow is equally or more widely used.' },
  'united-kingdom': { name: 'United Kingdom', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt, FreeNow', note: 'Uber operates normally throughout the UK alongside Bolt and FreeNow.' },
  turkey: { name: 'Turkey', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'BiTaksi', note: 'Uber has faced repeated restrictions in Istanbul and operates in a limited capacity — BiTaksi is the dominant local ride-hailing app.' },
  japan: { name: 'Japan', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'GO', note: 'Uber mainly functions as a taxi-hailing interface in Tokyo rather than full rideshare, due to Japanese regulations — GO (formerly JapanTaxi) is the dominant local app.' },
  thailand: { name: 'Thailand', status: 'unavailable', primaryApp: null, localAlternative: 'Grab', note: 'Uber sold its Southeast Asia operations to Grab in 2018 and exited the region — Grab is now the dominant ride-hailing app.' },
  indonesia: { name: 'Indonesia', status: 'unavailable', primaryApp: null, localAlternative: 'Grab, Gojek', note: 'Uber exited Southeast Asia in 2018 — Grab and the Indonesian super-app Gojek are dominant instead.' },
  singapore: { name: 'Singapore', status: 'unavailable', primaryApp: null, localAlternative: 'Grab', note: 'Uber sold its Southeast Asia business to Grab in 2018 — Grab is the dominant ride-hailing app in Singapore.' },
  'south-korea': { name: 'South Korea', status: 'unavailable', primaryApp: null, localAlternative: 'Kakao T', note: 'Uber\'s classic rideshare model has faced regulatory bans in South Korea — Kakao T is the dominant local ride-hailing app.' },
  'hong-kong': { name: 'Hong Kong', status: 'limited', primaryApp: 'Uber (gray area)', localAlternative: 'Local taxis', note: 'Uber operates in a legal gray area in Hong Kong alongside plentiful metered taxis.' },
  vietnam: { name: 'Vietnam', status: 'unavailable', primaryApp: null, localAlternative: 'Grab', note: 'Uber exited Southeast Asia in 2018 — Grab is the dominant ride-hailing app in Vietnam.' },
  philippines: { name: 'Philippines', status: 'unavailable', primaryApp: null, localAlternative: 'Grab', note: 'Uber exited Southeast Asia in 2018 — Grab is the dominant ride-hailing app in the Philippines.' },
  malaysia: { name: 'Malaysia', status: 'unavailable', primaryApp: null, localAlternative: 'Grab', note: 'Uber exited Southeast Asia in 2018 — Grab is the dominant ride-hailing app in Malaysia.' },
  china: { name: 'China', status: 'unavailable', primaryApp: null, localAlternative: 'Didi', note: 'Uber sold its China operations to Didi in 2016 and exited the market — Didi is now dominant (note: Didi\'s app may require a China-based phone number).' },
  india: { name: 'India', status: 'full', primaryApp: 'Uber', localAlternative: 'Ola', note: 'Uber operates widely across India alongside the dominant local competitor Ola.' },
  maldives: { name: 'Maldives', status: 'unavailable', primaryApp: null, localAlternative: 'Resort transfers, local taxis', note: 'Neither Uber nor Grab operate in the Maldives — resorts typically arrange boat/seaplane transfers, and local taxis serve Malé.' },
  taiwan: { name: 'Taiwan', status: 'full', primaryApp: 'Uber', localAlternative: 'Local taxis', note: 'Uber operates normally throughout Taiwan alongside plentiful metered taxis.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'PickMe', note: 'Uber has limited coverage in Sri Lanka — PickMe is the dominant local ride-hailing app.' },
  cambodia: { name: 'Cambodia', status: 'unavailable', primaryApp: null, localAlternative: 'Grab', note: 'Uber does not operate in Cambodia — Grab is the dominant ride-hailing app.' },
  australia: { name: 'Australia', status: 'full', primaryApp: 'Uber', localAlternative: 'DiDi, local taxis', note: 'Uber operates normally throughout Australia alongside DiDi and traditional taxis.' },
  'new-zealand': { name: 'New Zealand', status: 'full', primaryApp: 'Uber', localAlternative: 'Ola', note: 'Uber operates normally throughout New Zealand alongside Ola.' },
  fiji: { name: 'Fiji', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Neither Uber nor a major rideshare app operates in Fiji — use metered local taxis or arrange transfers through your hotel.' },
  'french-polynesia': { name: 'French Polynesia', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in French Polynesia — use local taxis or hotel-arranged transfers.' },
  mexico: { name: 'Mexico', status: 'full', primaryApp: 'Uber', localAlternative: 'DiDi', note: 'Uber operates widely across Mexico alongside DiDi, which is equally popular in many cities.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'full', primaryApp: 'Uber', localAlternative: 'Local taxis', note: 'Uber operates in Santo Domingo and other major areas; resort areas often rely more on local taxis and hotel transfers.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'full', primaryApp: 'Uber', localAlternative: 'Local taxis', note: 'Uber operates normally throughout Puerto Rico, the same as the mainland US.' },
  bahamas: { name: 'Bahamas', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis (fixed rates)', note: 'Uber does not operate in the Bahamas — local taxis use government-set fixed rates by destination zone.' },
  jamaica: { name: 'Jamaica', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in Jamaica — use licensed local taxis, ideally arranged through your hotel.' },
  aruba: { name: 'Aruba', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis (fixed rates)', note: 'Uber does not operate in Aruba — local taxis use a published fixed-rate fare chart.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in Turks and Caicos — use local taxis, often arranged through your resort.' },
  'st-lucia': { name: 'St. Lucia', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in St. Lucia — use local taxis, often arranged through your resort.' },
  'costa-rica': { name: 'Costa Rica', status: 'limited', primaryApp: 'Uber (gray area)', localAlternative: 'Red taxis (official)', note: 'Uber operates in a legal gray area alongside Costa Rica\'s official red taxis, which remain the more established option.' },
  panama: { name: 'Panama', status: 'full', primaryApp: 'Uber', localAlternative: 'DiDi', note: 'Uber operates normally in Panama City alongside DiDi.' },
  belize: { name: 'Belize', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in Belize — use licensed local taxis.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in the Cayman Islands — use local taxis.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in Antigua and Barbuda — use local taxis, often arranged through your resort.' },
  curacao: { name: 'Curaçao', status: 'unavailable', primaryApp: null, localAlternative: 'Local taxis', note: 'Uber does not operate in Curaçao — use local taxis.' },
  canada: { name: 'Canada', status: 'full', primaryApp: 'Uber', localAlternative: 'Local taxis', note: 'Uber operates normally throughout Canada\'s major cities, the same as the US.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'full', primaryApp: 'Uber', localAlternative: 'Careem', note: 'Uber operates widely in the UAE alongside Careem (which Uber itself owns), both very reliable.' },
  morocco: { name: 'Morocco', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'Careem, local taxis', note: 'Uber has faced bans and restrictions in Morocco and operates inconsistently — Careem has similar limitations; local petit taxis are the reliable fallback.' },
  'south-africa': { name: 'South Africa', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates widely across South Africa\'s major cities alongside Bolt.' },
  qatar: { name: 'Qatar', status: 'full', primaryApp: 'Uber', localAlternative: 'Careem', note: 'Uber operates normally in Doha alongside Careem.' },
  israel: { name: 'Israel', status: 'limited', primaryApp: 'Uber (limited)', localAlternative: 'Gett', note: 'Uber mainly offers premium/executive service in Israel due to regulations — Gett is the dominant local ride-hailing app.' },
  tanzania: { name: 'Tanzania', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates in Dar es Salaam alongside Bolt; coverage is thinner in Zanzibar, where local taxis are more common.' },
  kenya: { name: 'Kenya', status: 'full', primaryApp: 'Uber', localAlternative: 'Bolt', note: 'Uber operates in Nairobi alongside Bolt, which is equally or more popular locally.' },
  argentina: { name: 'Argentina', status: 'limited', primaryApp: 'Uber (gray area)', localAlternative: 'Cabify', note: 'Uber has faced legal disputes and periodic restrictions in Buenos Aires — Cabify is a well-established alternative with fewer regulatory issues.' },
  peru: { name: 'Peru', status: 'full', primaryApp: 'Uber', localAlternative: 'DiDi, InDriver', note: 'Uber operates normally in Lima alongside DiDi and InDriver.' },
  chile: { name: 'Chile', status: 'full', primaryApp: 'Uber', localAlternative: 'Cabify, DiDi', note: 'Uber operates normally in Santiago alongside Cabify and DiDi.' },
  colombia: { name: 'Colombia', status: 'limited', primaryApp: 'Uber (gray area)', localAlternative: 'DiDi, Cabify', note: 'Uber has faced legal challenges and periodic bans in Colombia — DiDi and Cabify are popular, more established alternatives.' },
  brazil: { name: 'Brazil', status: 'full', primaryApp: 'Uber', localAlternative: '99', note: 'Uber operates widely across Brazil alongside 99 (owned by Didi), which is equally or more popular in many cities.' },
  'united-states': { name: 'United States', status: 'full', primaryApp: 'Uber', localAlternative: 'Lyft', note: 'Uber and Lyft both operate nationwide in every major and mid-size city, though coverage and wait times thin out considerably in rural areas.' },
};

const STATUS_LABELS = { full: 'Uber operates normally', limited: 'Uber operates with limitations', unavailable: 'Uber is not available' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `In ${data.name}: ${STATUS_LABELS[data.status]}${data.status !== 'full' ? ` — use ${data.localAlternative} instead` : ''}.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel: STATUS_LABELS[data.status],
    primaryApp: data.primaryApp, localAlternative: data.localAlternative, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/rideshare-checker/calculate
// @access Public
exports.calculateRideshare = (req, res) => {
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
// @route POST /api/tools/rideshare-checker/pdf
// @access Public
exports.generateRideshareePdf = async (req, res) => {
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
      [email, firstName || null, 'rideshare-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Rideshare & Taxi Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rideshare-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Recommended app: ${result.localAlternative}`);

    pdfService.heading(doc, 'Before you land');
    pdfService.bulletList(doc, [
      `Download ${result.localAlternative} and set up payment before you arrive — some apps require a local phone number or don't work well without a data connection at the airport.`,
      'Screenshot your hotel address in the local language/script if you\'re headed somewhere with a different alphabet — it helps drivers immensely.',
      'Where rideshare isn\'t available, ask your hotel to arrange or recommend trusted local taxis rather than hailing unmarked cars.',
      'Keep some local cash on hand even in rideshare-friendly destinations — not every driver or backup taxi accepts cards.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚗 Your ${result.countryName} rideshare guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your rideshare check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond getting around? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send rideshare-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateRideshareePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
