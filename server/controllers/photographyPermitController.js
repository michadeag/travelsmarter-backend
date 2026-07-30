const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Ground photography/filming rules per country — distinct from
// droneController.js (aerial/drone-specific rules). status: 'easy'
// (casual photography and tripods generally unrestricted in public) |
// 'moderate' (some real restrictions — tripod permits at major landmarks,
// sensitivities around photographing people/religious sites, sensitive
// government/military zones) | 'restricted' (meaningful legal risk around
// photographing government, military, infrastructure, or people without
// consent). Commercial/professional filming (crew, lighting rigs) almost
// universally requires a permit regardless of tier — noted per country
// only where it's a particularly common trip-planning question.
const COUNTRIES = {
  france: { name: 'France', status: 'moderate', note: 'Casual street photography is generally free, but tripods require a permit at many major museums and monuments (Louvre, Musée d\'Orsay). Commercial filming in public spaces needs a permit from the local mairie.' },
  austria: { name: 'Austria', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — the usual exceptions apply for military sites and some private property.' },
  'czech-republic': { name: 'Czech Republic', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  denmark: { name: 'Denmark', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  germany: { name: 'Germany', status: 'moderate', note: 'Photography itself is unrestricted, but German privacy law ("Recht am eigenen Bild") means publishing an identifiable photo of someone without consent can create real legal exposure — be mindful with people shots you plan to post.' },
  greece: { name: 'Greece', status: 'moderate', note: 'Casual photography is generally fine, but military zones and some archaeological sites restrict tripods or require a permit for professional gear.' },
  hungary: { name: 'Hungary', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  iceland: { name: 'Iceland', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  italy: { name: 'Italy', status: 'moderate', note: 'Casual street photography is generally free, but tripods and professional gear require a permit at many major museums and monuments (Uffizi, Colosseum) — check specific site rules before you go.' },
  netherlands: { name: 'Netherlands', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  portugal: { name: 'Portugal', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  spain: { name: 'Spain', status: 'moderate', note: 'Casual photography is generally fine, but some major sites (the Alhambra, for instance) restrict tripods or require advance booking for photography access.' },
  sweden: { name: 'Sweden', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  switzerland: { name: 'Switzerland', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  ireland: { name: 'Ireland', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'united-kingdom': { name: 'United Kingdom', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — professional filming with a crew in public spaces (especially London) typically needs a local council permit.' },
  turkey: { name: 'Turkey', status: 'moderate', note: 'Casual photography is generally fine, but military and government installations are strictly off-limits and clearly signed.' },
  japan: { name: 'Japan', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — some shrine/temple interiors restrict photography of specific areas, so watch for posted signs.' },
  thailand: { name: 'Thailand', status: 'moderate', note: 'Casual photography is generally fine, but some temples restrict photographing specific statues or interiors, and tripods sometimes need advance permission at royal sites.' },
  indonesia: { name: 'Indonesia', status: 'moderate', note: 'Casual photography is generally fine, but be respectful and ask first at religious ceremonies — some are considered inappropriate to photograph without permission.' },
  singapore: { name: 'Singapore', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'south-korea': { name: 'South Korea', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'hong-kong': { name: 'Hong Kong', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  vietnam: { name: 'Vietnam', status: 'moderate', note: 'Casual photography is generally fine, but military and government installations are strictly off-limits.' },
  philippines: { name: 'Philippines', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  malaysia: { name: 'Malaysia', status: 'moderate', note: 'Casual photography is generally fine, but be respectful at religious sites — some mosques and temples restrict photography of worshippers.' },
  china: { name: 'China', status: 'restricted', note: 'Military installations, government buildings, and border/sensitive regions (Tibet, Xinjiang) are heavily restricted and sometimes even bridges or train stations are off-limits to photograph — commercial filming requires official permits and real scrutiny. Casual tourist photography of normal city life is generally fine.' },
  india: { name: 'India', status: 'moderate', note: 'Casual photography is generally fine, but military installations and some government buildings are restricted, and several major monuments (including the Taj Mahal) charge a separate fee for cameras or tripods.' },
  maldives: { name: 'Maldives', status: 'easy', note: 'Casual photography and tripods are generally unrestricted at resort islands.' },
  taiwan: { name: 'Taiwan', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'moderate', note: 'Casual photography is generally fine, but military zones are restricted, and posing disrespectfully with Buddha statues for photos is a real, sometimes legally enforced offense.' },
  cambodia: { name: 'Cambodia', status: 'moderate', note: 'Casual photography is generally fine, but Angkor Wat and other major temple complexes have specific tripod and drone rules — check current site regulations before you go.' },
  australia: { name: 'Australia', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'new-zealand': { name: 'New Zealand', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  fiji: { name: 'Fiji', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — ask first before photographing local villages or ceremonies.' },
  'french-polynesia': { name: 'French Polynesia', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  mexico: { name: 'Mexico', status: 'moderate', note: 'Casual photography is generally fine, but INAH (the archaeological authority) charges a separate fee for tripods and video cameras at ruins like Chichen Itza and Teotihuacan, and requires permits for commercial filming.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  bahamas: { name: 'Bahamas', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  jamaica: { name: 'Jamaica', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  aruba: { name: 'Aruba', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'st-lucia': { name: 'St. Lucia', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'costa-rica': { name: 'Costa Rica', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  panama: { name: 'Panama', status: 'moderate', note: 'Casual photography is generally fine, but the Panama Canal area and government buildings have specific restrictions — check posted signage before photographing canal infrastructure.' },
  belize: { name: 'Belize', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  curacao: { name: 'Curaçao', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  canada: { name: 'Canada', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'restricted', note: 'Photographing government buildings, military sites, ports, and even other people (including police) without consent is taken seriously here and can lead to real legal trouble — always ask before photographing locals, and avoid anything that looks official.' },
  morocco: { name: 'Morocco', status: 'moderate', note: 'Casual photography is generally fine, but always ask before photographing people (especially women) — it\'s considered disrespectful otherwise, and can provoke a real reaction. Government and military buildings are restricted.' },
  'south-africa': { name: 'South Africa', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — the usual exceptions apply for military and some government sites.' },
  qatar: { name: 'Qatar', status: 'restricted', note: 'Photographing government buildings, military sites, and other people without consent is taken seriously here — always ask before photographing locals, especially women.' },
  israel: { name: 'Israel', status: 'moderate', note: 'Casual photography is generally fine in most areas, but security-sensitive sites (checkpoints, military installations, some border areas) are strictly off-limits to photograph.' },
  tanzania: { name: 'Tanzania', status: 'moderate', note: 'Casual photography is generally fine, but some national parks charge a separate professional-camera or filming fee, and government/military buildings are restricted.' },
  kenya: { name: 'Kenya', status: 'moderate', note: 'Casual photography is generally fine, but some parks charge a separate professional-camera or filming fee, and government/military buildings are restricted.' },
  argentina: { name: 'Argentina', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  peru: { name: 'Peru', status: 'moderate', note: 'Casual photography is generally fine, but Machu Picchu and some other major sites restrict tripods or charge a separate fee for professional camera equipment — check current rules before you go.' },
  chile: { name: 'Chile', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public.' },
  colombia: { name: 'Colombia', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — the usual exceptions apply for military zones.' },
  brazil: { name: 'Brazil', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public — exercise normal caution and ask locally before photographing in favela areas, both for consent and personal safety.' },
  'united-states': { name: 'United States', status: 'easy', note: 'Casual photography and tripods are generally unrestricted in public spaces — the usual exceptions apply for military installations, some federal buildings, and private property.' },
};

const STATUS_LABELS = {
  easy: 'Easy',
  moderate: 'Some Restrictions',
  restricted: 'Restricted',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const statusLabel = STATUS_LABELS[data.status];
  const headline = `${data.name}: ${statusLabel} for photography and filming.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel,
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/photography-permit-checker/calculate
// @access Public
exports.calculatePhotographyPermit = (req, res) => {
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
// @route POST /api/tools/photography-permit-checker/pdf
// @access Public
exports.generatePhotographyPermitPdf = async (req, res) => {
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
      [email, firstName || null, 'photography-permit-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Photography & Filming Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="photography-permit-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you shoot');
    pdfService.bulletList(doc, [
      'Military installations, government buildings, and airports are restricted in almost every country — when in doubt, don\'t photograph anything that looks official.',
      'Professional/commercial filming (a crew, lighting rig, or paid shoot) almost always needs a local permit, regardless of how relaxed casual photography is.',
      'Always ask before photographing people, especially in a way that could be published — norms and legal expectations vary a lot by country.',
      'Rules can vary by specific site, not just country — check the exact museum, temple, or landmark\'s current photography policy before you go.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📷 Your ${result.countryName} photography & filming guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the photography check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond photography rules? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send photography-permit-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePhotographyPermitPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
