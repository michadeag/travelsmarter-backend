const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Internet speed/reliability tier + digital nomad visa availability per
// country. speedTier: 'fast' (reliable broadband/mobile, well-suited to
// video calls) | 'moderate' (workable but occasional slowdowns) | 'slow'
// (inconsistent, needs backup plans). digitalNomadVisa: 'yes' (dedicated
// program exists) | 'no' (none — standard visa/work-permit route needed)
// | 'partial' (no formal nomad visa, but long-stay options make it
// practical).
const COUNTRIES = {
  china: { name: 'China', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Domestic internet infrastructure is excellent and among the fastest in the world, though many Western apps and services are blocked (see our Internet Censorship & VPN Checker for that separately). No digital nomad visa exists — long-term remote work typically requires a standard work visa.' },
  'united-arab-emirates': { name: 'United Arab Emirates', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'The UAE has some of the fastest average internet speeds in the world and a dedicated one-year "Virtual Working Programme" remote work visa.' },
  'saudi-arabia': { name: 'Saudi Arabia', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet infrastructure is fast and reliable in major cities. No dedicated digital nomad visa exists yet, though tourist visas allow extended stays.' },
  turkey: { name: 'Turkey', speedTier: 'moderate', digitalNomadVisa: 'partial', note: "Speeds are workable in cities but can be inconsistent in rural areas. There's no dedicated nomad visa, but Turkey's long-stay tourist visa and affordable cost of living make it a popular base anyway." },
  vietnam: { name: 'Vietnam', speedTier: 'moderate', digitalNomadVisa: 'no', note: 'Wifi is widely available and fast in cafes in major cities like Hanoi and Ho Chi Minh City, though rural connectivity lags. No dedicated nomad visa exists — most remote workers use extended tourist visas.' },
  egypt: { name: 'Egypt', speedTier: 'moderate', digitalNomadVisa: 'no', note: 'City internet is generally workable, especially in Cairo, but can be inconsistent. No dedicated nomad visa — visitors typically rely on tourist visas.' },
  morocco: { name: 'Morocco', speedTier: 'moderate', digitalNomadVisa: 'no', note: 'Internet is generally reliable in cities like Marrakech and Casablanca, less so in rural areas. No formal nomad visa, though tourist stays of up to 90 days are common for remote workers.' },
  india: { name: 'India', speedTier: 'moderate', digitalNomadVisa: 'no', note: 'City internet, especially in hubs like Bangalore and Goa, is generally solid, though rural and mobile coverage can vary widely. India does not currently offer a dedicated digital nomad visa.' },
  indonesia: { name: 'Indonesia', speedTier: 'moderate', digitalNomadVisa: 'yes', note: "Bali is a well-established digital nomad hub with widespread coworking spaces, and Indonesia introduced a 'Second Home' long-stay visa that suits remote workers, though it isn't a nomad visa in the strictest sense." },
  thailand: { name: 'Thailand', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'Thailand has strong urban internet infrastructure and a large coworking scene, especially in Chiang Mai and Bangkok. The Destination Thailand Visa (DTV), introduced in 2024, is aimed specifically at remote workers.' },
  singapore: { name: 'Singapore', speedTier: 'fast', digitalNomadVisa: 'no', note: "Singapore has some of the fastest, most reliable internet in the world. There's no dedicated nomad visa, but its status as a business and tech hub means many remote workers pass through on standard passes." },

  'united-states': { name: 'United States', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable in most areas, with rural exceptions. The US does not offer a dedicated digital nomad visa — foreign remote workers typically need a standard work visa or rely on short tourist stays.' },
  canada: { name: 'Canada', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable in cities, with some rural gaps. No dedicated nomad visa exists, though visitors can work remotely for a foreign employer during a standard tourist stay.' },
  mexico: { name: 'Mexico', speedTier: 'moderate', digitalNomadVisa: 'yes', note: "Mexico has a well-established Temporary Resident Visa route that's popular with remote workers, and cities like Mexico City and Playa del Carmen have strong coworking scenes. Internet quality is generally solid in cities." },
  brazil: { name: 'Brazil', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Brazil introduced a dedicated digital nomad visa in 2022. Internet is generally reliable in major cities like São Paulo and Florianópolis, a growing remote-work hub.' },
  argentina: { name: 'Argentina', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Argentina offers a dedicated digital nomad visa. Internet is generally solid in Buenos Aires, with more variability elsewhere.' },
  chile: { name: 'Chile', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Chile has some of the best internet infrastructure in Latin America. There isn\'t a dedicated nomad visa yet, though a "Tech Visa" exists specifically for tech workers.' },
  colombia: { name: 'Colombia', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Colombia introduced a digital nomad visa in 2022. Medellín in particular has become a major remote-work hub with strong coworking infrastructure.' },
  peru: { name: 'Peru', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Peru launched a digital nomad visa in 2024. Internet quality is generally solid in Lima and Cusco, more variable elsewhere.' },
  'costa-rica': { name: 'Costa Rica', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Costa Rica has a dedicated remote worker visa. Internet is generally reliable in San José and popular coastal towns.' },

  'united-kingdom': { name: 'United Kingdom', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable nationwide. The UK does not offer a digital nomad visa — foreign remote workers typically rely on short visitor stays or standard work visas.' },
  ireland: { name: 'Ireland', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable, especially in Dublin. No dedicated nomad visa exists yet.' },
  france: { name: 'France', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet infrastructure is strong nationwide. France doesn\'t offer a specific nomad visa, though a "Talent Passport" exists for some remote professionals.' },
  germany: { name: 'Germany', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is generally fast and reliable in cities (though famously spotty in some older buildings). Germany offers a freelance visa route rather than a dedicated nomad visa.' },
  italy: { name: 'Italy', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Italy launched a digital nomad visa in 2024. Internet quality is generally solid in cities, less consistent in smaller towns and rural areas.' },
  spain: { name: 'Spain', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'Spain has a well-established digital nomad visa (since 2023) and strong internet infrastructure, making cities like Barcelona and Valencia popular remote-work bases.' },
  netherlands: { name: 'Netherlands', speedTier: 'fast', digitalNomadVisa: 'no', note: "Internet is extremely fast and reliable nationwide. There's no dedicated nomad visa, but a self-employment/freelance visa route exists for some remote workers." },
  portugal: { name: 'Portugal', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'Portugal has a well-known digital nomad visa and reliable internet infrastructure, making Lisbon and Porto major remote-work hubs.' },
  greece: { name: 'Greece', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Greece offers a digital nomad visa with tax incentives. Internet is generally solid in Athens and larger islands, more variable on smaller islands.' },
  austria: { name: 'Austria', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable. No dedicated nomad visa exists, though a freelance/self-employment permit route is available.' },
  switzerland: { name: 'Switzerland', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Switzerland has excellent, reliable internet nationwide. No dedicated nomad visa exists, and visa rules for remote work are relatively strict.' },
  poland: { name: 'Poland', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and affordable, especially in cities like Warsaw and Kraków. No dedicated nomad visa, though EU citizens face no restrictions.' },
  'czech-republic': { name: 'Czech Republic', speedTier: 'fast', digitalNomadVisa: 'no', note: "Internet is fast and reliable, especially in Prague. The Czech Republic offers a 'Zivno' freelance visa route that some remote workers use in place of a formal nomad visa." },
  norway: { name: 'Norway', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is extremely fast and reliable nationwide, even in remote areas. No dedicated nomad visa exists.' },
  sweden: { name: 'Sweden', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is extremely fast and reliable. No dedicated nomad visa exists.' },
  denmark: { name: 'Denmark', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is extremely fast and reliable. No dedicated nomad visa exists.' },
  iceland: { name: 'Iceland', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'Iceland offers a long-term visa for remote workers, subject to an income threshold. Internet is fast and reliable even in fairly remote parts of the country.' },

  japan: { name: 'Japan', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'Japan introduced a digital nomad visa in 2024. Internet is extremely fast and reliable nationwide, including in rural areas.' },
  'south-korea': { name: 'South Korea', speedTier: 'fast', digitalNomadVisa: 'yes', note: 'South Korea has some of the fastest average internet speeds in the world and launched a digital nomad visa in 2024.' },
  malaysia: { name: 'Malaysia', speedTier: 'moderate', digitalNomadVisa: 'yes', note: "Malaysia's 'DE Rantau' nomad visa program is well-established and popular. Internet is generally solid in Kuala Lumpur and Penang, more variable elsewhere." },
  philippines: { name: 'Philippines', speedTier: 'moderate', digitalNomadVisa: 'no', note: 'Internet quality has improved significantly in recent years but remains inconsistent outside Manila and Cebu. No dedicated nomad visa currently exists, though one has been proposed.' },

  israel: { name: 'Israel', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable, particularly given the strength of the local tech sector. No dedicated nomad visa exists.' },
  jordan: { name: 'Jordan', speedTier: 'moderate', digitalNomadVisa: 'no', note: 'Internet is generally workable in Amman, less consistent elsewhere. No dedicated nomad visa exists.' },
  kenya: { name: 'Kenya', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'Kenya introduced a digital nomad visa in 2024. Internet is generally solid in Nairobi, a growing tech hub, with more variability outside the city.' },
  'south-africa': { name: 'South Africa', speedTier: 'moderate', digitalNomadVisa: 'yes', note: 'South Africa introduced a remote work visa route in 2024. Internet quality is generally good in cities like Cape Town, a popular nomad base, though load-shedding (power cuts) can disrupt connectivity.' },

  australia: { name: 'Australia', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable in cities, with more variability in remote areas. No dedicated nomad visa exists, though a working holiday visa is popular with younger remote workers.' },
  'new-zealand': { name: 'New Zealand', speedTier: 'fast', digitalNomadVisa: 'no', note: 'Internet is fast and reliable in cities and most towns. No dedicated nomad visa exists, though a working holiday visa route is available for eligible nationalities.' },
};

const SPEED_LABELS = {
  fast: 'fast — reliable broadband and mobile data widely available, well-suited to video calls and heavy remote work',
  moderate: 'moderate — generally workable but expect occasional slowdowns, especially outside major cities',
  slow: 'slow — connectivity can be inconsistent, so build in backup plans for anything time-sensitive',
};

const NOMAD_LABELS = {
  yes: 'a dedicated digital nomad visa is available',
  no: 'no dedicated digital nomad visa exists — you would need a standard visa or work-permit route',
  partial: 'no formal digital nomad visa, but long-stay tourist or similar visas make extended remote work practical',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s internet is ${SPEED_LABELS[data.speedTier]}. On the visa side, ${NOMAD_LABELS[data.digitalNomadVisa]}.`;

  return {
    country, countryName: data.name, speedTier: data.speedTier, speedTierLabel: SPEED_LABELS[data.speedTier],
    digitalNomadVisa: data.digitalNomadVisa, digitalNomadVisaLabel: NOMAD_LABELS[data.digitalNomadVisa],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/internet-speed-checker/calculate
// @access Public
exports.calculateInternetSpeed = (req, res) => {
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
// @route POST /api/tools/internet-speed-checker/pdf
// @access Public
exports.generateInternetSpeedPdf = async (req, res) => {
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
      [email, firstName || null, 'internet-speed-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Internet & Remote Work Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="internet-speed-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Digital nomad visa: ${result.digitalNomadVisaLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.speedTier === 'slow'
        ? "Download a local eSIM with a generous data allowance as backup, and confirm your accommodation's wifi speed before booking if connectivity is critical to your work."
        : "Book accommodation with confirmed high-speed wifi reviews rather than assuming — individual buildings vary even in well-connected countries.",
      result.digitalNomadVisa === 'no'
        ? "Check the exact terms of your tourist visa before working remotely — many countries technically restrict any work activity, even for a foreign employer, on a standard tourist visa."
        : "Research the specific income and application requirements for the nomad visa well before you plan to travel — processing times vary widely.",
      'Have a backup connectivity plan (a second eSIM, a portable hotspot, or a known reliable coworking space) for anything time-sensitive like client calls.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📶 Your ${result.countryName} internet & remote work guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your internet & remote work check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond connectivity logistics? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send internet-speed-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateInternetSpeedPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
