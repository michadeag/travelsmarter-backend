const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Internet censorship level + VPN legality per country. level: 'heavy'
// (many common apps/sites blocked, VPN genuinely necessary) | 'moderate'
// (some specific services/content restricted) | 'light' (narrow, rarely
// affects tourists) | 'none' (no notable restrictions). vpnLegal:
// 'legal' | 'restricted' (only licensed/approved VPNs are technically
// legal) | 'gray-area' (commonly used by travelers despite unclear rules).
const COUNTRIES = {
  china: { name: 'China', level: 'heavy', vpnLegal: 'restricted', note: "Google (including Gmail and Maps), WhatsApp, Instagram, Facebook, X/Twitter, and YouTube are all blocked by the Great Firewall. Only government-approved VPNs are technically legal, though many travelers use commercial VPNs in practice — install one before you arrive, since VPN provider websites are often blocked too." },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 'moderate', vpnLegal: 'restricted', note: "Voice/video calls over apps like WhatsApp, FaceTime, and Skype have historically been blocked (regular messaging usually still works). Using a VPN specifically to access blocked content is illegal — VPNs for general privacy/security are more of a gray area in practice." },
  'saudi-arabia': { name: 'Saudi Arabia', level: 'moderate', vpnLegal: 'restricted', note: 'Similar to the UAE — VoIP calling over some apps has faced restrictions at various points, alongside general content filtering. VPN use to bypass content restrictions specifically is against local regulations.' },
  turkey: { name: 'Turkey', level: 'moderate', vpnLegal: 'legal', note: 'Wikipedia was blocked for several years (since restored) and social media has occasionally been throttled during major news events — VPN use is legal and common.' },
  vietnam: { name: 'Vietnam', level: 'moderate', vpnLegal: 'gray-area', note: 'The government monitors social media and can restrict specific political content, but everyday app access (Google, WhatsApp, Instagram) is generally unaffected for tourists.' },
  egypt: { name: 'Egypt', level: 'moderate', vpnLegal: 'gray-area', note: 'VoIP calling has faced intermittent restrictions historically — general browsing and social media access is typically unaffected for tourists.' },
  morocco: { name: 'Morocco', level: 'moderate', vpnLegal: 'gray-area', note: 'VoIP calls (WhatsApp/Skype voice) have been restricted at various points, sometimes lifted and reinstated — text messaging generally still works.' },
  india: { name: 'India', level: 'light', vpnLegal: 'legal', note: 'Specific apps have occasionally been banned (notably TikTok) for regulatory reasons, but general internet access is unrestricted for tourists — VPN use is legal.' },
  indonesia: { name: 'Indonesia', level: 'light', vpnLegal: 'legal', note: 'Occasional site blocking exists, but general everyday app access is unaffected for tourists.' },
  thailand: { name: 'Thailand', level: 'light', vpnLegal: 'legal', note: 'Some content related to the monarchy can be restricted, but everyday app and internet access is unaffected for tourists.' },
  singapore: { name: 'Singapore', level: 'light', vpnLegal: 'legal', note: 'Some content is filtered for licensing/decency reasons, but everyday app access is unaffected for tourists.' },

  'united-states': { name: 'United States', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  canada: { name: 'Canada', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  mexico: { name: 'Mexico', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  brazil: { name: 'Brazil', level: 'light', vpnLegal: 'legal', note: 'Specific apps (notably a brief nationwide court-ordered block of X/Twitter in 2024) have occasionally been restricted, but this is uncommon and typically short-lived.' },
  argentina: { name: 'Argentina', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  chile: { name: 'Chile', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  colombia: { name: 'Colombia', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  peru: { name: 'Peru', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  'costa-rica': { name: 'Costa Rica', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },

  'united-kingdom': { name: 'United Kingdom', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  ireland: { name: 'Ireland', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  france: { name: 'France', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  germany: { name: 'Germany', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  italy: { name: 'Italy', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  spain: { name: 'Spain', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  netherlands: { name: 'Netherlands', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  portugal: { name: 'Portugal', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  greece: { name: 'Greece', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  austria: { name: 'Austria', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  switzerland: { name: 'Switzerland', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  poland: { name: 'Poland', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  'czech-republic': { name: 'Czech Republic', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  norway: { name: 'Norway', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  sweden: { name: 'Sweden', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  denmark: { name: 'Denmark', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  iceland: { name: 'Iceland', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },

  japan: { name: 'Japan', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  'south-korea': { name: 'South Korea', level: 'light', vpnLegal: 'legal', note: 'A small number of North Korea-affiliated sites are blocked for national security reasons — everyday app access is unaffected for tourists.' },
  malaysia: { name: 'Malaysia', level: 'light', vpnLegal: 'legal', note: 'Some content is filtered for religious/decency reasons, but everyday app access is unaffected for tourists.' },
  philippines: { name: 'Philippines', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },

  israel: { name: 'Israel', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  jordan: { name: 'Jordan', level: 'light', vpnLegal: 'legal', note: 'Occasional site blocking exists, but everyday app access is generally unaffected for tourists.' },
  kenya: { name: 'Kenya', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  'south-africa': { name: 'South Africa', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },

  australia: { name: 'Australia', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
  'new-zealand': { name: 'New Zealand', level: 'none', vpnLegal: 'legal', note: 'No notable internet restrictions for typical tourist use.' },
};

const LEVEL_LABELS = {
  heavy: 'heavy — many common apps and sites are blocked, and a VPN is genuinely necessary for normal use',
  moderate: 'moderate — some specific services or content types are restricted, though most everyday apps work fine',
  light: 'light — occasional, narrow restrictions exist but rarely affect typical tourist use',
  none: 'minimal — no notable internet restrictions for typical tourist use',
};

const VPN_LABELS = {
  legal: 'VPN use is legal and common',
  restricted: 'only government-approved/licensed VPNs are technically legal',
  'gray-area': 'VPN legality is somewhat unclear in practice, though commonly used by travelers',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s internet censorship level is ${LEVEL_LABELS[data.level]}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel: LEVEL_LABELS[data.level],
    vpnLegal: data.vpnLegal, vpnLabel: VPN_LABELS[data.vpnLegal], note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/vpn-censorship-checker/calculate
// @access Public
exports.calculateVpnCensorship = (req, res) => {
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
// @route POST /api/tools/vpn-censorship-checker/pdf
// @access Public
exports.generateVpnCensorshipPdf = async (req, res) => {
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
      [email, firstName || null, 'vpn-censorship-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Internet & VPN Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="vpn-censorship-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `VPN status: ${result.vpnLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.level === 'heavy'
        ? 'Download and set up your VPN before you arrive — VPN provider websites and app stores are often themselves restricted once you\'re already in a heavily censored country.'
        : 'A VPN is optional for most travel here, but still useful for general privacy on public wifi.',
      'Test your VPN connection before you rely on it for anything important — not all VPN protocols work reliably in every country, and having a backup app installed is worth the extra few minutes.',
      'Download offline maps and messaging alternatives in advance if you\'re heading somewhere with heavy restrictions — don\'t assume you can set everything up on arrival.',
      'This guide reflects general, widely-known patterns — internet restrictions can change quickly around elections, protests, or major events, so check current status close to your travel dates.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🌐 Your ${result.countryName} internet & VPN guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your internet censorship check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond internet access? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send vpn-censorship-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateVpnCensorshipPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
