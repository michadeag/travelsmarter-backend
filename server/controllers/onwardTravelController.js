const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Proof of onward/return travel enforcement per destination — distinct
// from visaController.js (whether you need a visa at all) and
// passportValidityController.js (passport validity buffers). Many
// countries technically require evidence you'll leave (a return or
// onward ticket) before letting you board or clear immigration, but
// actual enforcement varies enormously — this is about whether you'll
// realistically get stopped, not what the law says on paper.
// enforcementLevel: 'rare' (essentially never checked for typical
// tourists) | 'inconsistent' (technically required, enforcement varies
// by airline/agent/nationality — some travelers get asked, most don't)
// | 'strict' (well-documented, routinely enforced — often at the
// check-in counter before you even board, not just at the border).
const COUNTRIES = {
  france: { name: 'France', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays — Schengen entry focuses on your 90-day window, not a specific exit ticket." },
  austria: { name: 'Austria', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  'czech-republic': { name: 'Czech Republic', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  denmark: { name: 'Denmark', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  germany: { name: 'Germany', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  greece: { name: 'Greece', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  hungary: { name: 'Hungary', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  iceland: { name: 'Iceland', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  italy: { name: 'Italy', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  netherlands: { name: 'Netherlands', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  portugal: { name: 'Portugal', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  spain: { name: 'Spain', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  sweden: { name: 'Sweden', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  switzerland: { name: 'Switzerland', enforcementLevel: 'rare', note: "Onward travel proof is essentially never checked for typical tourist stays within the Schengen area." },
  ireland: { name: 'Ireland', enforcementLevel: 'inconsistent', note: "Ireland isn't in Schengen, and its border agents are known to ask more questions than most of Europe — a return ticket and proof of funds can occasionally be requested at immigration." },
  'united-kingdom': { name: 'United Kingdom', enforcementLevel: 'inconsistent', note: "UK Border Force occasionally asks for a return or onward ticket, especially if other aspects of your trip look questionable — airlines can also refuse boarding without one in some cases." },
  turkey: { name: 'Turkey', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  japan: { name: 'Japan', enforcementLevel: 'rare', note: "The entry card technically asks about your onward plans, but strict enforcement of a physical onward ticket is uncommon for most nationalities." },
  thailand: { name: 'Thailand', enforcementLevel: 'strict', note: "One of the most notorious destinations for this — airlines routinely deny boarding without proof of onward or return travel, and immigration can also ask on arrival. One-way travelers should book a refundable onward ticket or use a proof-of-onward-travel rental service." },
  indonesia: { name: 'Indonesia', enforcementLevel: 'strict', note: "Onward or return travel proof is commonly requested, especially for visa-on-arrival and visa-exempt entries — well-documented cases of travelers being denied boarding without it, particularly to Bali." },
  singapore: { name: 'Singapore', enforcementLevel: 'inconsistent', note: "Immigration can ask for onward travel proof, particularly for longer or open-ended stays — generally smooth for short visits, but it's a real possibility." },
  'south-korea': { name: 'South Korea', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'hong-kong': { name: 'Hong Kong', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  vietnam: { name: 'Vietnam', enforcementLevel: 'inconsistent', note: "Some airlines check for onward travel proof, especially for e-visa holders — enforcement varies by airline and check-in agent." },
  philippines: { name: 'Philippines', enforcementLevel: 'strict', note: "Airlines commonly check for proof of onward or return travel before boarding, and immigration can ask too — a well-documented requirement that catches one-way travelers off guard." },
  malaysia: { name: 'Malaysia', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, especially by airlines at check-in — enforcement isn't universal but happens often enough to plan for." },
  china: { name: 'China', enforcementLevel: 'inconsistent', note: "Visa requirements for most nationalities make this largely moot, but onward travel proof is sometimes requested for visa-free or transit entries." },
  india: { name: 'India', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked beyond what's needed for your e-visa application itself." },
  maldives: { name: 'Maldives', enforcementLevel: 'rare', note: "Resort-based tourism arrivals are generally smooth, with onward travel proof rarely checked in practice." },
  taiwan: { name: 'Taiwan', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'sri-lanka': { name: 'Sri Lanka', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested as part of the ETA/visa process or at the airport — not universal, but worth having ready." },
  cambodia: { name: 'Cambodia', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, particularly for visa-on-arrival entries — enforcement varies." },
  australia: { name: 'Australia', enforcementLevel: 'inconsistent', note: "Airlines sometimes check for onward or return travel proof tied to your ETA/visa conditions, especially for visitor visas without a fixed return date." },
  'new-zealand': { name: 'New Zealand', enforcementLevel: 'strict', note: "Well-documented for strict enforcement — airlines routinely require proof of onward or return travel before boarding, and immigration checks on arrival too. One-way travelers should book a refundable ticket or onward-travel proof in advance." },
  fiji: { name: 'Fiji', enforcementLevel: 'strict', note: "Proof of onward or return travel is commonly and consistently requested, both by airlines at check-in and immigration on arrival." },
  'french-polynesia': { name: 'French Polynesia', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, particularly for longer stays without a fixed return." },
  mexico: { name: 'Mexico', enforcementLevel: 'inconsistent', note: "Technically required by immigration rules, but enforcement is spotty in practice — some airlines check at check-in, others don't ask at all." },
  'dominican-republic': { name: 'Dominican Republic', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical resort-area tourist stays." },
  'puerto-rico': { name: 'Puerto Rico', enforcementLevel: 'rare', note: "As a US territory, entry is essentially a domestic-style arrival for US citizens — onward travel proof is not a real concern." },
  bahamas: { name: 'Bahamas', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, though enforcement is inconsistent for typical short resort stays." },
  jamaica: { name: 'Jamaica', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested by immigration, particularly for longer or open-ended stays." },
  aruba: { name: 'Aruba', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'turks-and-caicos': { name: 'Turks and Caicos', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'st-lucia': { name: 'St. Lucia', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'costa-rica': { name: 'Costa Rica', enforcementLevel: 'strict', note: "Extremely well documented for strict enforcement — airlines routinely require proof of onward or return travel before boarding, and immigration checks on arrival. This catches long-term and one-way travelers off guard constantly." },
  panama: { name: 'Panama', enforcementLevel: 'strict', note: "Well documented for consistent enforcement — airlines commonly require proof of onward or return travel before boarding, and immigration checks on arrival too." },
  belize: { name: 'Belize', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, particularly for longer stays without a fixed return." },
  'cayman-islands': { name: 'Cayman Islands', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  curacao: { name: 'Curaçao', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  canada: { name: 'Canada', enforcementLevel: 'inconsistent', note: "Airlines sometimes check for onward or return travel proof, especially for visitor visa holders without a fixed return date — enforcement varies by airline." },
  'united-arab-emirates': { name: 'United Arab Emirates', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  morocco: { name: 'Morocco', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  'south-africa': { name: 'South Africa', enforcementLevel: 'inconsistent', note: "There are well-documented cases of travelers being asked for proof of onward travel and sufficient funds, particularly for visa-on-arrival nationalities — worth having ready even though it's not universal." },
  qatar: { name: 'Qatar', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  israel: { name: 'Israel', enforcementLevel: 'inconsistent', note: "Border agents are known to be thorough with questioning generally, and onward travel proof can come up as part of that, though it's not a universal requirement." },
  tanzania: { name: 'Tanzania', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  kenya: { name: 'Kenya', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  argentina: { name: 'Argentina', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  peru: { name: 'Peru', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, particularly for longer stays without a fixed return." },
  chile: { name: 'Chile', enforcementLevel: 'rare', note: "Onward travel proof is rarely checked for typical tourist stays." },
  colombia: { name: 'Colombia', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested by immigration, particularly for longer or open-ended stays." },
  brazil: { name: 'Brazil', enforcementLevel: 'inconsistent', note: "Onward travel proof is sometimes requested, particularly for longer stays without a fixed return." },
  'united-states': { name: 'United States', enforcementLevel: 'inconsistent', note: "Airlines can and do deny boarding without proof of onward or return travel for visitors without a visa (ESTA/Visa Waiver Program) — well documented, though not every check-in agent asks." },
};

const ENFORCEMENT_LABELS = {
  rare: 'Rare — Essentially Never Checked',
  inconsistent: 'Inconsistent — Sometimes Asked, Not Universal',
  strict: 'Strict — Routinely Enforced, Often at Check-In',
};

const DISCLAIMER = "Enforcement varies by airline, individual agent, and your specific visa/entry type — this reflects general patterns, not a guarantee either way. If you're traveling one-way or with an open-ended itinerary to anywhere rated inconsistent or strict, consider a refundable onward ticket or a proof-of-onward-travel booking service as a low-cost safety net.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const enforcementLabel = ENFORCEMENT_LABELS[data.enforcementLevel];
  const headline = `${data.name}: ${enforcementLabel}.`;

  return {
    country, countryName: data.name, enforcementLevel: data.enforcementLevel, enforcementLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/onward-travel-checker/calculate
// @access Public
exports.calculateOnwardTravel = (req, res) => {
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
// @route POST /api/tools/onward-travel-checker/pdf
// @access Public
exports.generateOnwardTravelPdf = async (req, res) => {
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
      [email, firstName || null, 'onward-travel-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Proof of Onward Travel Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="onward-travel-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.enforcementLabel);

    pdfService.heading(doc, 'If you\'re traveling one-way or open-ended');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'A fully refundable flight booking (cancel it after you board, or keep it as a real backup plan) is the simplest fix.',
      'Proof-of-onward-travel rental services (like OnwardTicket or BestOnwardTicket) generate a real, verifiable-looking reservation for a small fee if you have no fixed return date.',
      'Bus or train tickets to a neighboring country can also count as "onward travel" in many cases — it doesn\'t have to be a flight.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🎫 Your ${result.countryName} proof of onward travel guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the proof of onward travel check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond onward travel? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send onward-travel-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateOnwardTravelPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
