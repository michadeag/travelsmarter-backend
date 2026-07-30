const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// SIM/eSIM recommendation per country, reused from Tool #3's country list.
// bestOption: 'esim' | 'physical_sim'. registrationRequired applies to
// buying a local physical SIM (passport/ID registration at point of sale).
const COUNTRIES = {
  france: { name: 'France', bestOption: 'esim', registrationRequired: false, note: 'eSIM providers like Airalo and Holafly have excellent coverage in France, and EU roaming rules mean many home carrier plans already include it.' },
  austria: { name: 'Austria', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Austria is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  'czech-republic': { name: 'Czech Republic', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in the Czech Republic is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  denmark: { name: 'Denmark', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Denmark is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  germany: { name: 'Germany', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Germany is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  greece: { name: 'Greece', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Greece is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  hungary: { name: 'Hungary', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Hungary is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  iceland: { name: 'Iceland', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage is strong around Reykjavik and the Ring Road, though it can thin out in remote highland areas.' },
  italy: { name: 'Italy', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Italy is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  netherlands: { name: 'Netherlands', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in the Netherlands is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  portugal: { name: 'Portugal', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Portugal is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  spain: { name: 'Spain', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Spain is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  sweden: { name: 'Sweden', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Sweden is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  switzerland: { name: 'Switzerland', bestOption: 'esim', registrationRequired: false, note: "Switzerland isn't in the EU, so EU 'roam like home' plans don't cover it — but eSIM coverage via Swisscom/Sunrise is excellent." },
  ireland: { name: 'Ireland', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Ireland is excellent, and EU roaming rules mean many home carrier plans already include it.' },
  'united-kingdom': { name: 'United Kingdom', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in the UK is excellent via EE, Vodafone, and Three, with no registration hassle.' },
  turkey: { name: 'Turkey', bestOption: 'esim', registrationRequired: false, note: 'Tourist eSIMs and SIMs work easily in Turkey for short trips — the passport-registration and IMEI-blocking rules mainly apply to phones used long-term (90+ days).' },
  japan: { name: 'Japan', bestOption: 'esim', registrationRequired: false, note: 'Japan has excellent eSIM coverage via Airalo and Ubigi, and physical tourist SIMs are also easy to buy at the airport with no registration hassle.' },
  thailand: { name: 'Thailand', bestOption: 'esim', registrationRequired: false, note: 'Thailand is very tourist-friendly for connectivity — AIS and dtac sell tourist SIMs at the airport with no passport registration hassle, and eSIM coverage is excellent too.' },
  indonesia: { name: 'Indonesia', bestOption: 'physical_sim', registrationRequired: true, note: 'Indonesia enforces passport/ID registration for physical SIMs; a local Telkomsel SIM tends to be more reliable in Bali and remote islands than eSIM alternatives.' },
  singapore: { name: 'Singapore', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Singapore is excellent and widely used by visitors, with no registration hassle.' },
  'south-korea': { name: 'South Korea', bestOption: 'esim', registrationRequired: false, note: 'Buying a local physical SIM requires an Alien Registration Number, which tourists don\'t have — an eSIM or pocket WiFi rental is the practical choice instead.' },
  'hong-kong': { name: 'Hong Kong', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Hong Kong is excellent and widely used by visitors, with no registration hassle.' },
  vietnam: { name: 'Vietnam', bestOption: 'physical_sim', registrationRequired: true, note: 'Vietnam requires passport registration for physical SIMs, though it\'s quick and easy at the airport; eSIM coverage is decent in cities but less reliable in rural areas.' },
  philippines: { name: 'Philippines', bestOption: 'esim', registrationRequired: false, note: 'The Philippines has good eSIM coverage via Smart and Globe, both now offering easy tourist eSIMs.' },
  malaysia: { name: 'Malaysia', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Malaysia is excellent and widely used by visitors, with no registration hassle.' },
  china: { name: 'China', bestOption: 'physical_sim', registrationRequired: true, note: "Mainland China requires passport registration for local SIMs at a carrier store, and standard international eSIMs often can't reach apps like WhatsApp or Google due to the Great Firewall — look for a China-specific VPN-friendly eSIM or a local physical SIM." },
  india: { name: 'India', bestOption: 'physical_sim', registrationRequired: true, note: 'India requires in-person passport and visa registration for physical SIMs, which can take 24-48 hours to activate — an eSIM is much faster for short trips.' },
  maldives: { name: 'Maldives', bestOption: 'esim', registrationRequired: false, note: 'eSIM and local SIMs both work well in Malé and inhabited islands, and many resorts also offer their own WiFi/data packages.' },
  taiwan: { name: 'Taiwan', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Taiwan is excellent and widely used by visitors, with no registration hassle.' },
  'sri-lanka': { name: 'Sri Lanka', bestOption: 'physical_sim', registrationRequired: true, note: 'Sri Lanka requires passport registration for SIM purchase, which is quick and done right at the airport; eSIM coverage is improving but still less universal than a physical SIM.' },
  cambodia: { name: 'Cambodia', bestOption: 'esim', registrationRequired: false, note: 'Cambodia has cheap, easy tourist SIMs (Cellcard, Smart) and improving eSIM availability, with minimal hassle either way.' },
  australia: { name: 'Australia', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Australia is excellent and widely used by visitors, with no registration hassle.' },
  'new-zealand': { name: 'New Zealand', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in New Zealand is excellent and widely used by visitors, with no registration hassle.' },
  fiji: { name: 'Fiji', bestOption: 'physical_sim', registrationRequired: true, note: 'Fiji requires ID registration for local SIMs (Vodafone/Digicel), easily done at the airport; eSIM coverage exists but is less reliable outside Nadi and Suva.' },
  'french-polynesia': { name: 'French Polynesia', bestOption: 'physical_sim', registrationRequired: true, note: 'French Polynesia has limited eSIM options — a physical Vini SIM, requiring ID, is the more reliable choice across the islands.' },
  mexico: { name: 'Mexico', bestOption: 'esim', registrationRequired: false, note: 'Mexico has strong eSIM coverage via Telcel-based providers, and physical SIMs are easy and cheap too.' },
  'dominican-republic': { name: 'Dominican Republic', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in the Dominican Republic is solid in tourist areas and Santo Domingo, with no registration hassle.' },
  'puerto-rico': { name: 'Puerto Rico', bestOption: 'esim', registrationRequired: false, note: "Puerto Rico runs on the US mobile network — if you have a US carrier plan, you likely need no SIM change at all." },
  bahamas: { name: 'Bahamas', bestOption: 'physical_sim', registrationRequired: true, note: 'The Bahamas requires ID for local SIM purchase (BTC or Aliv), and eSIM coverage is more limited across the Out Islands.' },
  jamaica: { name: 'Jamaica', bestOption: 'esim', registrationRequired: false, note: 'Jamaica has decent eSIM coverage via Digicel/Flow in main tourist areas, with no registration hassle.' },
  aruba: { name: 'Aruba', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Aruba is solid across the small island, with no registration hassle.' },
  'turks-and-caicos': { name: 'Turks and Caicos', bestOption: 'physical_sim', registrationRequired: true, note: 'Turks and Caicos has limited eSIM support — a physical Flow or Digicel SIM (ID required) is more reliable.' },
  'st-lucia': { name: 'St. Lucia', bestOption: 'physical_sim', registrationRequired: true, note: 'St. Lucia requires ID registration for local SIMs; eSIM coverage is limited outside the main towns.' },
  'costa-rica': { name: 'Costa Rica', bestOption: 'esim', registrationRequired: false, note: 'Costa Rica has solid eSIM coverage via Kolbi/Claro, and physical SIMs are easy too (passport required at purchase).' },
  panama: { name: 'Panama', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Panama is solid in Panama City and main tourist areas, with no registration hassle.' },
  belize: { name: 'Belize', bestOption: 'physical_sim', registrationRequired: true, note: 'Belize has limited eSIM support — a physical Belize Telemedia SIM (ID required) is the more reliable choice.' },
  'cayman-islands': { name: 'Cayman Islands', bestOption: 'physical_sim', registrationRequired: true, note: 'The Cayman Islands require ID for local SIM purchase (Flow/Digicel); eSIM options are limited.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', bestOption: 'physical_sim', registrationRequired: true, note: 'Antigua and Barbuda require ID registration for local SIMs; eSIM coverage is limited on the island.' },
  curacao: { name: 'Curaçao', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Curaçao is solid across the island, with no registration hassle.' },
  canada: { name: 'Canada', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Canada is good, though data plans tend to be pricier than in the US or Europe.' },
  'united-arab-emirates': { name: 'United Arab Emirates', bestOption: 'physical_sim', registrationRequired: true, note: 'The UAE requires passport (and for longer stays, Emirates ID) registration for local SIMs, easily done at airport kiosks; eSIM coverage via Etisalat/du is excellent too.' },
  morocco: { name: 'Morocco', bestOption: 'physical_sim', registrationRequired: true, note: 'Morocco requires passport registration for local SIMs (Maroc Telecom, Orange), quick at the airport; eSIM coverage is improving but less universal.' },
  'south-africa': { name: 'South Africa', bestOption: 'esim', registrationRequired: false, note: 'South Africa has strong eSIM coverage via Vodacom/MTN in major cities, with weaker coverage in remote safari areas.' },
  qatar: { name: 'Qatar', bestOption: 'physical_sim', registrationRequired: true, note: 'Qatar requires passport registration for local SIMs (Ooredoo, Vodafone), quick at the airport; eSIM coverage is excellent too.' },
  israel: { name: 'Israel', bestOption: 'esim', registrationRequired: false, note: 'Israel has excellent eSIM and tourist SIM availability, widely sold at the airport with no registration hassle.' },
  tanzania: { name: 'Tanzania', bestOption: 'physical_sim', registrationRequired: true, note: 'Tanzania requires passport registration (and sometimes a biometric photo) for local SIMs; eSIM coverage is limited outside cities and popular safari/Zanzibar areas.' },
  kenya: { name: 'Kenya', bestOption: 'physical_sim', registrationRequired: true, note: 'Kenya requires passport registration for local Safaricom/Airtel SIMs; eSIM coverage exists in cities but is patchy in rural safari areas.' },
  argentina: { name: 'Argentina', bestOption: 'esim', registrationRequired: false, note: 'Argentina has decent eSIM coverage in cities, though rural Patagonia coverage is patchy regardless of SIM type.' },
  peru: { name: 'Peru', bestOption: 'physical_sim', registrationRequired: true, note: 'Peru requires passport registration for local SIMs (Claro, Movistar); eSIM coverage is solid in cities but weaker in the Andes and Amazon.' },
  chile: { name: 'Chile', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage in Chile is solid in Santiago and main tourist areas, with no registration hassle.' },
  colombia: { name: 'Colombia', bestOption: 'physical_sim', registrationRequired: true, note: 'Colombia requires ID/passport registration for local SIMs (Claro, Tigo); eSIM coverage is strong in cities like Bogotá and Medellín.' },
  brazil: { name: 'Brazil', bestOption: 'physical_sim', registrationRequired: true, note: 'Brazil requires a CPF (Brazilian tax ID) or passport registration for local SIMs, which can be a hassle for short trips — many travelers use an eSIM instead to skip the paperwork.' },
  'united-states': { name: 'United States', bestOption: 'esim', registrationRequired: false, note: 'eSIM coverage from providers like Airalo, Google Fi, and major carriers is excellent nationwide, and no ID registration is required to activate a US SIM or eSIM.' },
};

const BEST_OPTION_LABELS = { esim: 'get an eSIM before you go', physical_sim: 'a local physical SIM is the better choice' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `In ${data.name}: ${BEST_OPTION_LABELS[data.bestOption]}${data.registrationRequired ? ' — passport/ID registration is required to buy a local SIM' : ''}.`;

  return {
    country, countryName: data.name, bestOption: data.bestOption,
    registrationRequired: data.registrationRequired, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/sim-checker/calculate
// @access Public
exports.calculateSim = (req, res) => {
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
// @route POST /api/tools/sim-checker/pdf
// @access Public
exports.generateSimPdf = async (req, res) => {
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
      [email, firstName || null, 'sim-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} SIM & eSIM Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sim-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.registrationRequired ? 'Passport/ID registration required for a local physical SIM' : 'No registration hassle to get connected');

    pdfService.heading(doc, 'Before you land');
    pdfService.bulletList(doc, [
      result.bestOption === 'esim'
        ? 'Buy your eSIM before you fly and install the profile while you still have WiFi — most providers activate the moment you land.'
        : 'Bring your passport to the SIM counter — most airports have a kiosk right past arrivals, but registration can take a few minutes of paperwork.',
      'Check that your phone is unlocked and eSIM-compatible (or carrier-unlocked for a physical SIM) before you travel.',
      'Screenshot your hotel address and a backup map before you land, in case you\'re not connected right away.',
      'Keep your home SIM safe rather than discarding it — you\'ll likely swap back the moment you land home.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📶 Your ${result.countryName} SIM & eSIM guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your connectivity check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond getting connected? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send sim-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSimPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
