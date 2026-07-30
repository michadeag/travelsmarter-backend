const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Whether a country has a dedicated digital nomad / remote work visa
// program — distinct from visaRequirementController.js, which covers
// standard tourist entry/passport rules. status: 'available' (an
// official, named remote-work visa program exists) | 'alternative' (no
// dedicated program, but a commonly-used adjacent route exists — a
// freelance visa, a treaty-based visa limited to certain nationalities,
// or an unusually generous/extendable tourist stay) | 'none' (no
// dedicated program and no notable alternative). Income thresholds and
// durations are approximate and change often — always verify on the
// destination's official immigration site before applying.
const COUNTRIES = {
  france: { name: 'France', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa — the closest option is the Talent Passport, aimed at specific skilled-worker categories, not remote workers generally.' },
  austria: { name: 'Austria', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'czech-republic': { name: 'Czech Republic', status: 'alternative', programName: 'Živnostenský list (trade license route)', minIncome: 'No fixed threshold, but proof of funds required', duration: '1 year, renewable', note: 'No official "digital nomad visa," but many remote workers use the Živno freelance trade-license route as a practical equivalent — it requires registering as a local sole trader.' },
  denmark: { name: 'Denmark', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  germany: { name: 'Germany', status: 'alternative', programName: 'Freiberufler (freelance) visa', minIncome: 'No fixed threshold, but proof of sufficient income required', duration: '1-3 years, renewable', note: 'No dedicated "digital nomad visa," but the long-established freelance (Freiberufler) visa is commonly used by remote workers and the self-employed as a practical equivalent.' },
  greece: { name: 'Greece', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~€3,500/month', duration: '1 year, renewable', note: 'An official program specifically for remote workers employed by or contracting with companies outside Greece.' },
  hungary: { name: 'Hungary', status: 'available', programName: 'White Card', minIncome: '~€2,000/month', duration: '1 year, renewable once', note: "Hungary's dedicated remote-work residence permit, aimed at non-EU nationals working remotely for employers outside Hungary." },
  iceland: { name: 'Iceland', status: 'available', programName: 'Long-Term Visa for Remote Work', minIncome: '~ISK 1,000,000/month (roughly $7,300)', duration: 'Up to 180 days, not consecutively renewable', note: "One of the highest income thresholds of any digital nomad program, and it's a one-time stay rather than an ongoing renewable residency." },
  italy: { name: 'Italy', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~€28,000/year (~€2,333/month)', duration: '1 year, renewable', note: 'Aimed at highly skilled remote workers and freelancers employed by companies outside Italy.' },
  netherlands: { name: 'Netherlands', status: 'alternative', programName: 'Dutch-American Friendship Treaty (DAFT) visa', minIncome: 'Modest capital investment requirement (a few thousand euros), not a monthly income test', duration: '2 years, renewable', note: 'No general digital nomad visa — the DAFT route is a genuinely good option, but it\'s limited specifically to US citizens under a longstanding treaty.' },
  portugal: { name: 'Portugal', status: 'available', programName: 'D8 Digital Nomad Visa', minIncome: '~€3,280/month (4x Portuguese minimum wage)', duration: '1-2 years, with a path to long-term residency', note: 'One of the most popular digital nomad visas in Europe, with a genuine path toward permanent residency if you stay.' },
  spain: { name: 'Spain', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~€2,646/month', duration: '1 year initially, renewable up to 5 years total', note: 'Also comes with a notable personal income tax break (a flat, reduced rate) for qualifying remote workers in the first several years.' },
  sweden: { name: 'Sweden', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  switzerland: { name: 'Switzerland', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa — Swiss work-permit rules are notably strict and quota-based even for skilled workers.' },
  ireland: { name: 'Ireland', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'united-kingdom': { name: 'United Kingdom', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  turkey: { name: 'Turkey', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program, though long-stay tourist residence permits are relatively accessible for other reasons.' },
  japan: { name: 'Japan', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~¥10,000,000/year (roughly $68,000) — one of the highest thresholds globally', duration: '6 months, not renewable', note: "Launched in 2024 with a notably high income bar and a short, non-renewable stay — designed for a single extended visit, not ongoing residency." },
  thailand: { name: 'Thailand', status: 'available', programName: 'Destination Thailand Visa (DTV)', minIncome: '~500,000 THB (roughly $14,000) in verifiable funds', duration: '5-year multi-entry visa, 180 days per stay', note: "Thailand's 2024 DTV effectively replaced the old informal nomad workarounds with a genuine, long multi-entry visa covering remote work, not just tourism." },
  indonesia: { name: 'Indonesia', status: 'available', programName: 'Remote Worker (E33G) Visa', minIncome: '~$60,000/year proposed threshold', duration: '1 year', note: "Aimed at foreign remote workers, most commonly used by those based in Bali — check current implementation details, as the program's rules have shifted since launch." },
  singapore: { name: 'Singapore', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'south-korea': { name: 'South Korea', status: 'available', programName: 'Workation (F-1-D) Visa', minIncome: '~$66,000/year — one of the highest thresholds globally', duration: '1 year, renewable once', note: 'A notably high income bar reflects South Korea\'s targeting of higher-earning remote professionals specifically.' },
  'hong-kong': { name: 'Hong Kong', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  vietnam: { name: 'Vietnam', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program — most remote workers rely on renewable tourist visas or business visa workarounds.' },
  philippines: { name: 'Philippines', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program currently in effect, though one has been discussed by lawmakers.' },
  malaysia: { name: 'Malaysia', status: 'available', programName: 'DE Rantau Nomad Pass', minIncome: '~$24,000/year (~$2,000/month)', duration: '3-12 months initially, renewable up to 2 years total', note: 'A dedicated program specifically branded and marketed toward remote tech workers and freelancers.' },
  china: { name: 'China', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  india: { name: 'India', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  maldives: { name: 'Maldives', status: 'alternative', programName: 'Standard tourist visa (remote work permitted)', minIncome: 'No income test', duration: 'Up to 1 year, extendable, no separate visa fee', note: "No separate nomad visa needed — the Maldives' standard free tourist visa is unusually generous (up to a year) and explicitly allows remote work during your stay." },
  taiwan: { name: 'Taiwan', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program currently in effect, though one has been discussed by officials.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  cambodia: { name: 'Cambodia', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program — most remote workers rely on renewable business visa workarounds.' },
  australia: { name: 'Australia', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa — the closest option is the Working Holiday visa, but that\'s a different category limited to eligible nationalities under 35.' },
  'new-zealand': { name: 'New Zealand', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa — the closest option is the Working Holiday visa, but that\'s a different category limited to eligible nationalities under 35.' },
  fiji: { name: 'Fiji', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'french-polynesia': { name: 'French Polynesia', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  mexico: { name: 'Mexico', status: 'alternative', programName: 'Temporary Resident Visa', minIncome: '~$2,700/month (or savings/investment equivalent)', duration: 'Up to 4 years total (1 year initially, renewable)', note: 'No visa is specifically branded "digital nomad," but the Temporary Resident Visa is widely used by remote workers as a practical, long-standing equivalent.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'available', programName: 'Digital Nomad Law (Ley 1-24)', minIncome: '~$2,796/month (average threshold)', duration: '1 year, renewable', note: 'A dedicated program with income-tax exemptions for qualifying remote workers during their stay.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'none', programName: null, minIncome: null, duration: null, note: 'As US territory, US citizens need no visa at all to live and work remotely here — not applicable as a separate visa category.' },
  bahamas: { name: 'Bahamas', status: 'available', programName: 'BEATS (Bahamas Extended Access Travel Stay)', minIncome: '~$50,000/year (approximate)', duration: '1 year, renewable', note: 'A dedicated program launched specifically to attract remote workers during extended stays.' },
  jamaica: { name: 'Jamaica', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program — most remote workers rely on standard extendable tourist stays.' },
  aruba: { name: 'Aruba', status: 'available', programName: 'One Happy Workation', minIncome: 'No strict income test commonly enforced', duration: 'Up to 90 days, extendable', note: 'A lighter-touch program built on an extended tourist stay rather than a formal separate visa category.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'st-lucia': { name: 'St. Lucia', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'costa-rica': { name: 'Costa Rica', status: 'available', programName: 'Digital Nomad Visa (Ley de Nomadas Digitales)', minIncome: '~$3,000/month single (~$4,000/month with dependents)', duration: '1 year, renewable once', note: 'Comes with a notable perk: qualifying nomads are exempt from Costa Rican income tax on foreign-earned income during their stay.' },
  panama: { name: 'Panama', status: 'available', programName: 'Short Stay Visa for Remote Workers', minIncome: '~$3,000/month', duration: '9 months to 1.5 years initially, renewable', note: 'A dedicated program specifically for remote employees and freelancers working for companies outside Panama.' },
  belize: { name: 'Belize', status: 'available', programName: 'Work Where You Vacation', minIncome: '~$75,000/year — one of the higher thresholds in the Caribbean', duration: '6 months, renewable', note: 'A dedicated remote-work program with a notably high income bar compared to most Caribbean neighbors.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'available', programName: 'Global Citizen Concierge Program', minIncome: '~$100,000/year — among the highest thresholds of any digital nomad program worldwide', duration: '2 years', note: 'Positioned as a premium program, with an income requirement well above most other countries\' digital nomad visas.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'available', programName: 'Nomad Digital Residence', minIncome: '~$50,000/year', duration: '2 years', note: 'One of the longer initial visa durations of any digital nomad program in the region.' },
  curacao: { name: 'Curaçao', status: 'available', programName: '@Home in Curaçao', minIncome: 'No strict income test commonly enforced', duration: 'Up to 6 months, extendable', note: 'A lighter-touch program built on an extended tourist stay rather than a formal separate visa category.' },
  canada: { name: 'Canada', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program — foreign remote workers most commonly enter as regular visitors, which has real limits on length of stay.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'available', programName: 'Virtual Working Programme (Dubai remote work visa)', minIncome: '~$5,000/month (~$60,000/year)', duration: '1 year, renewable', note: 'One of the earliest and best-known digital nomad visas globally, launched in 2021.' },
  morocco: { name: 'Morocco', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  'south-africa': { name: 'South Africa', status: 'available', programName: 'Remote Work Visa (Remote Work Endorsement)', minIncome: '~R650,976/year (roughly $36,000, or about $3,000/month)', duration: '1-3 years', note: 'A relatively new addition (2024), aimed at remote employees and freelancers working for companies outside South Africa.' },
  qatar: { name: 'Qatar', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  israel: { name: 'Israel', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  tanzania: { name: 'Tanzania', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program.' },
  kenya: { name: 'Kenya', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~$55,000/year (~$4,583/month)', duration: 'Up to 1 year, renewable', note: 'A dedicated program launched in 2024, targeting higher-earning remote professionals specifically.' },
  argentina: { name: 'Argentina', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~$2,500/month equivalent', duration: '180 days, renewable once', note: 'A dedicated program, though the initial stay is shorter than many Latin American peers and only renewable once.' },
  peru: { name: 'Peru', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program currently in effect, though one has been proposed by lawmakers.' },
  chile: { name: 'Chile', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa — Chile\'s "Tech Visa" is a different, startup-founder-focused category, not for remote employees generally.' },
  colombia: { name: 'Colombia', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~$684-900/month (3x Colombian minimum wage) — one of the lowest thresholds of any program', duration: 'Up to 2 years', note: 'A notably accessible income requirement compared to most other digital nomad visas, plus one of the longer total durations available.' },
  brazil: { name: 'Brazil', status: 'available', programName: 'Digital Nomad Visa', minIncome: '~$1,500/month', duration: '1 year, renewable', note: 'A dedicated program for remote workers employed by or contracting with companies outside Brazil.' },
  'united-states': { name: 'United States', status: 'none', programName: null, minIncome: null, duration: null, note: 'No dedicated digital nomad visa program — foreign remote workers most commonly enter as regular visitors, which does not authorize local employment and has real limits on length of stay.' },
};

const STATUS_LABELS = {
  available: 'Digital Nomad Visa Available',
  alternative: 'No Dedicated Program (Alternative Route Exists)',
  none: 'No Digital Nomad Visa Program',
};

const DISCLAIMER = "Digital nomad visa programs, income thresholds, and durations change frequently as countries launch, adjust, or discontinue them — always verify current requirements on the destination's official immigration or foreign ministry website before applying, and note that most programs still require you to be employed by or contracting with a company outside the destination country.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const statusLabel = STATUS_LABELS[data.status];
  const headline = data.status === 'available'
    ? `${data.name}: Digital Nomad Visa available (${data.programName}) — minimum income ${data.minIncome}, valid ${data.duration}.`
    : data.status === 'alternative'
      ? `${data.name}: No dedicated Digital Nomad Visa, but an alternative route exists (${data.programName}).`
      : `${data.name}: No Digital Nomad Visa program.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel,
    programName: data.programName, minIncome: data.minIncome, duration: data.duration,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/digital-nomad-visa-checker/calculate
// @access Public
exports.calculateDigitalNomadVisa = (req, res) => {
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
// @route POST /api/tools/digital-nomad-visa-checker/pdf
// @access Public
exports.generateDigitalNomadVisaPdf = async (req, res) => {
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
      [email, firstName || null, 'digital-nomad-visa-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Digital Nomad Visa Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="digital-nomad-visa-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you apply');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Most programs require proof you\'re employed by, or contracting with, a company or clients outside the destination country — working for a local employer usually isn\'t covered.',
      'Start gathering proof-of-income documents (pay stubs, bank statements, tax returns) early — these programs are typically paperwork-heavy.',
      'Check the destination\'s tax residency rules separately — a long enough stay can trigger local tax obligations regardless of your visa type.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💻 Your ${result.countryName} digital nomad visa check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the digital nomad visa check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond visa research? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send digital-nomad-visa-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDigitalNomadVisaPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
