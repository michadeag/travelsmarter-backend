const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Recycling and waste disposal norms per destination — particularly
// relevant for anyone staying in an Airbnb or vacation rental rather than
// a hotel with its own housekeeping. wasteLevel: 'strict' (detailed
// sorting rules with real enforcement — specific bag types, color-coded
// bins, or fines for mistakes) | 'moderate' (basic recycling is standard
// and expected, but enforcement for short-term visitors is light) |
// 'basic' (formal recycling infrastructure is limited or inconsistent —
// a general waste bin is generally fine) | 'informal' (formal waste
// infrastructure is genuinely limited, often because accommodation
// handles disposal directly for guests).
const COUNTRIES = {
  france: { name: 'France', wasteLevel: 'moderate', note: 'Household waste sorting (recycling vs general) is standard and expected, though enforcement for short-term visitors is light — follow the color-coded bins where provided.' },
  austria: { name: 'Austria', wasteLevel: 'strict', note: 'Waste sorting is detailed and taken seriously — separate bins for paper, glass, plastic, and general waste are standard, including in short-term rentals.' },
  'czech-republic': { name: 'Czech Republic', wasteLevel: 'moderate', note: 'Basic recycling (colored bins for paper, plastic, glass) is standard in cities, with light enforcement for visitors.' },
  denmark: { name: 'Denmark', wasteLevel: 'strict', note: 'Waste sorting is detailed and well-organized — separate bins for multiple material types are standard, including in Airbnbs.' },
  germany: { name: 'Germany', wasteLevel: 'strict', note: "Waste sorting (Mülltrennung) is detailed and taken very seriously — separate, often color-coded bins for paper, plastic/packaging, glass, and general waste are standard, including in short-term rentals, and getting it visibly wrong can draw pointed feedback from neighbors." },
  greece: { name: 'Greece', wasteLevel: 'basic', note: 'Formal recycling infrastructure is less developed outside major cities — a general waste bin is generally fine for a short stay.' },
  hungary: { name: 'Hungary', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for paper, plastic, glass) is standard in cities, with light enforcement for visitors.' },
  iceland: { name: 'Iceland', wasteLevel: 'strict', note: "Waste sorting is detailed and taken seriously, reflecting Iceland's strong environmental culture — separate bins for multiple material types are standard." },
  italy: { name: 'Italy', wasteLevel: 'moderate', note: 'Household waste sorting is standard, particularly in northern cities, though rules and enforcement vary noticeably by region.' },
  netherlands: { name: 'Netherlands', wasteLevel: 'strict', note: 'Waste sorting is detailed and well-organized — separate bins or bags for different material types are standard, including in short-term rentals.' },
  portugal: { name: 'Portugal', wasteLevel: 'moderate', note: 'Basic recycling (color-coded bins for paper, plastic/metal, glass) is standard in cities, with light enforcement for visitors.' },
  spain: { name: 'Spain', wasteLevel: 'moderate', note: 'Basic recycling (color-coded bins for paper, plastic, glass, organic) is standard in cities, with light enforcement for visitors.' },
  sweden: { name: 'Sweden', wasteLevel: 'strict', note: "Waste sorting is detailed and taken seriously, reflecting Sweden's strong recycling culture — separate bins for multiple material types are standard, including in apartments and short-term rentals." },
  switzerland: { name: 'Switzerland', wasteLevel: 'strict', note: 'Waste sorting is detailed and strictly enforced in many areas — official pay-per-bag trash bags are required in most municipalities, and incorrect sorting can draw fines.' },
  ireland: { name: 'Ireland', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for general waste, recycling, and often organic) is standard, with light enforcement for visitors.' },
  'united-kingdom': { name: 'United Kingdom', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for general waste and recycling) is standard, though specific rules vary noticeably by local council.' },
  turkey: { name: 'Turkey', wasteLevel: 'basic', note: 'Formal recycling infrastructure is developing but inconsistent — a general waste bin is generally fine for a short stay.' },
  japan: { name: 'Japan', wasteLevel: 'strict', note: "Waste sorting is famously detailed and taken very seriously — specific bag types, colors, and collection-day schedules apply, and getting it wrong in an Airbnb can draw real attention from neighbors or your host." },
  thailand: { name: 'Thailand', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited outside a few initiatives — a general waste bin is generally fine for a short stay.' },
  indonesia: { name: 'Indonesia', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited outside a few initiatives — a general waste bin is generally fine for a short stay.' },
  singapore: { name: 'Singapore', wasteLevel: 'moderate', note: "Recycling bins (blue bins) are widely available, though household sorting is less mandatory or enforced than in Japan or Germany — Singapore's waste rules focus more heavily on cleanliness and littering fines." },
  'south-korea': { name: 'South Korea', wasteLevel: 'strict', note: 'Waste sorting is detailed and strictly enforced — food waste is often collected and charged separately by weight, and specific district-mandated bags are required for general trash.' },
  'hong-kong': { name: 'Hong Kong', wasteLevel: 'moderate', note: 'Basic recycling bins (for paper, plastic, metal) are available in many buildings, though sorting compliance is less strictly enforced than in benchmarks like Japan or South Korea.' },
  vietnam: { name: 'Vietnam', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  philippines: { name: 'Philippines', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited outside a few cities — a general waste bin is generally fine for a short stay.' },
  malaysia: { name: 'Malaysia', wasteLevel: 'basic', note: 'Formal recycling infrastructure is developing but inconsistent — a general waste bin is generally fine for a short stay.' },
  china: { name: 'China', wasteLevel: 'moderate', note: 'Major cities (Shanghai notably) have introduced mandatory sorting rules with real fines, though enforcement and specifics vary a lot by city — check locally if staying somewhere with strict local rules.' },
  india: { name: 'India', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited and inconsistent — a general waste bin is generally fine for a short stay.' },
  maldives: { name: 'Maldives', wasteLevel: 'informal', note: 'Formal waste infrastructure is genuinely limited given the resort-island format — resorts typically handle disposal directly for guests.' },
  taiwan: { name: 'Taiwan', wasteLevel: 'strict', note: 'Waste sorting is detailed and culturally embedded — household trash and recycling trucks run on a set schedule (often with music to announce arrival), and sorting compliance is taken seriously.' },
  'sri-lanka': { name: 'Sri Lanka', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  cambodia: { name: 'Cambodia', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  australia: { name: 'Australia', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for general waste and recycling, often color-coded) is standard, with light enforcement for visitors.' },
  'new-zealand': { name: 'New Zealand', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for general waste and recycling) is standard, with light enforcement for visitors.' },
  fiji: { name: 'Fiji', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited outside main towns — resorts typically handle disposal directly for guests.' },
  'french-polynesia': { name: 'French Polynesia', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited outside Papeete — resorts typically handle disposal directly for guests.' },
  mexico: { name: 'Mexico', wasteLevel: 'basic', note: 'Formal recycling infrastructure is developing but inconsistent — a general waste bin is generally fine for a short stay.' },
  'dominican-republic': { name: 'Dominican Republic', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited outside main cities — resorts typically handle disposal directly for guests.' },
  'puerto-rico': { name: 'Puerto Rico', wasteLevel: 'moderate', note: 'Basic recycling programs exist in San Juan and other areas, though participation and enforcement are inconsistent.' },
  bahamas: { name: 'Bahamas', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited — resorts typically handle disposal directly for guests.' },
  jamaica: { name: 'Jamaica', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  aruba: { name: 'Aruba', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  'turks-and-caicos': { name: 'Turks and Caicos', wasteLevel: 'informal', note: 'Formal waste infrastructure is genuinely limited given the small size of the islands — resorts typically handle disposal directly for guests.' },
  'st-lucia': { name: 'St. Lucia', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited — resorts typically handle disposal directly for guests.' },
  'costa-rica': { name: 'Costa Rica', wasteLevel: 'moderate', note: "Recycling is culturally encouraged, reflecting Costa Rica's environmental reputation, though formal infrastructure and enforcement vary by area." },
  panama: { name: 'Panama', wasteLevel: 'basic', note: 'Formal recycling infrastructure is developing but inconsistent — a general waste bin is generally fine for a short stay.' },
  belize: { name: 'Belize', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  'cayman-islands': { name: 'Cayman Islands', wasteLevel: 'moderate', note: 'Basic recycling programs exist, though participation is not strictly enforced.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited — resorts typically handle disposal directly for guests.' },
  curacao: { name: 'Curaçao', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  canada: { name: 'Canada', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for general waste, recycling, and often organics) is standard, with light enforcement for visitors.' },
  'united-arab-emirates': { name: 'United Arab Emirates', wasteLevel: 'basic', note: 'Recycling infrastructure is developing rapidly but still inconsistent — a general waste bin is generally fine for a short stay.' },
  morocco: { name: 'Morocco', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited — a general waste bin is generally fine for a short stay.' },
  'south-africa': { name: 'South Africa', wasteLevel: 'moderate', note: 'Basic recycling programs exist in major cities, though participation and infrastructure vary noticeably by area.' },
  qatar: { name: 'Qatar', wasteLevel: 'basic', note: 'Recycling infrastructure is developing but still inconsistent — a general waste bin is generally fine for a short stay.' },
  israel: { name: 'Israel', wasteLevel: 'moderate', note: 'Basic recycling (orange bins for packaging waste) is standard in cities, with light enforcement for visitors.' },
  tanzania: { name: 'Tanzania', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited outside major cities — most trips center on safari lodges, which handle disposal directly for guests.' },
  kenya: { name: 'Kenya', wasteLevel: 'informal', note: 'Formal waste infrastructure is limited outside major cities — most trips center on safari lodges, which handle disposal directly for guests.' },
  argentina: { name: 'Argentina', wasteLevel: 'moderate', note: 'Basic recycling programs exist in Buenos Aires and other major cities, though participation and enforcement are inconsistent.' },
  peru: { name: 'Peru', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited outside Lima — a general waste bin is generally fine for a short stay.' },
  chile: { name: 'Chile', wasteLevel: 'moderate', note: 'Basic recycling programs (often via drop-off points rather than curbside collection) exist in major cities.' },
  colombia: { name: 'Colombia', wasteLevel: 'basic', note: 'Formal recycling infrastructure is developing but inconsistent — a general waste bin is generally fine for a short stay.' },
  brazil: { name: 'Brazil', wasteLevel: 'basic', note: 'Formal recycling infrastructure is limited and inconsistent outside a few cities — a general waste bin is generally fine for a short stay.' },
  'united-states': { name: 'United States', wasteLevel: 'moderate', note: 'Basic recycling (separate bins for general waste and recycling) is standard in most areas, though specific rules vary a lot by city and state.' },
};

const WASTE_LABELS = {
  strict: 'Strict — Detailed Sorting Rules, Real Enforcement',
  moderate: 'Moderate — Basic Recycling Expected',
  basic: 'Basic — General Waste Bin Is Fine',
  informal: 'Informal — Limited Formal Infrastructure',
};

const DISCLAIMER = "This reflects general norms, not a rule for every building or municipality — rules can vary by city, and short-term rentals sometimes have their own posted instructions that override the general picture. If you're staying in an Airbnb or vacation rental, check for host instructions before assuming.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const wasteLabel = WASTE_LABELS[data.wasteLevel];
  const headline = `${data.name}: ${wasteLabel}.`;

  return {
    country, countryName: data.name, wasteLevel: data.wasteLevel, wasteLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/waste-disposal-checker/calculate
// @access Public
exports.calculateWasteDisposal = (req, res) => {
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
// @route POST /api/tools/waste-disposal-checker/pdf
// @access Public
exports.generateWasteDisposalPdf = async (req, res) => {
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
      [email, firstName || null, 'waste-disposal-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Recycling & Waste Disposal Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="waste-disposal-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.wasteLabel);

    pdfService.heading(doc, 'General waste disposal tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      "If you're staying in an Airbnb or vacation rental, check the welcome guide or ask your host directly — many destinations have specific local rules that a general country-level picture can't capture.",
      "In \"strict\" destinations, incorrect sorting is sometimes visibly called out by neighbors or building staff rather than formally fined for a short-term guest — it's a social norm as much as a legal one.",
      'When in doubt anywhere, separating obvious recyclables (bottles, cans, cardboard) from general trash is rarely the wrong move, even where it isn\'t strictly required.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `♻️ Your ${result.countryName} waste disposal guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the recycling & waste disposal check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond waste disposal? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send waste-disposal-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateWasteDisposalPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
