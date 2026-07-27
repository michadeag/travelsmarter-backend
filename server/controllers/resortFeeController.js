const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Prevalence of hidden hotel "resort fees" / "destination fees" (mandatory
// per-night charges added on top of the advertised room rate, separate
// from government tourist taxes — see tourist-tax-checker for those).
// prevalence: 'high' (widespread, common practice) | 'moderate' (some
// hotels/resorts) | 'rare' (uncommon, mostly larger resort properties) |
// 'none' (hotels overwhelmingly quote the full price upfront).
const COUNTRIES = {
  china: { name: 'China', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  'united-arab-emirates': { name: 'United Arab Emirates', prevalence: 'moderate', typicalFeeRange: 'AED 15-20 per night (often a municipality fee) plus occasional resort fees at luxury properties', note: 'Dubai and Abu Dhabi hotels often add a per-night municipality fee (a government-mandated charge, not the hotel\'s own), and some luxury resorts add their own additional amenity fee on top.' },
  'saudi-arabia': { name: 'Saudi Arabia', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some luxury properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon outside a small number of luxury resorts.' },
  turkey: { name: 'Turkey', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some resort properties', note: 'Most Turkish resorts, especially all-inclusive properties, quote a genuinely all-inclusive rate — hidden fees are not the norm.' },
  vietnam: { name: 'Vietnam', prevalence: 'rare', typicalFeeRange: '$5-10 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  egypt: { name: 'Egypt', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some Red Sea resorts', note: 'Most hotels quote the full price upfront, though a small number of Red Sea resort properties add extras.' },
  morocco: { name: 'Morocco', prevalence: 'rare', typicalFeeRange: '$5-10 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  india: { name: 'India', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  indonesia: { name: 'Indonesia', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some Bali resort properties', note: 'Most hotels quote the full price upfront, though a small number of Bali resorts add extras beyond the room rate.' },
  thailand: { name: 'Thailand', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  singapore: { name: 'Singapore', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  'united-states': { name: 'United States', prevalence: 'high', typicalFeeRange: '$25-45 per night', note: "Resort fees (also called destination or amenity fees) are widespread in Las Vegas, Orlando, Miami, Hawaii, Scottsdale, and other leisure destinations. They're mandatory, rarely shown in the headline price, and typically claim to cover wifi, pool access, and gym use." },
  canada: { name: 'Canada', prevalence: 'rare', typicalFeeRange: '$10-25 per night at some resort properties', note: 'Less common than in the US, though some resort towns (Whistler, Banff) and larger hotel chains occasionally add a smaller destination fee.' },
  mexico: { name: 'Mexico', prevalence: 'high', typicalFeeRange: '$15-35 per night', note: "Common at beach resorts in Cancún, Playa del Carmen, and Los Cabos — always check whether the quoted all-inclusive rate already includes it, since it's often added separately at checkout." },
  brazil: { name: 'Brazil', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  argentina: { name: 'Argentina', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  chile: { name: 'Chile', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  colombia: { name: 'Colombia', prevalence: 'rare', typicalFeeRange: '$5-10 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  peru: { name: 'Peru', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  'costa-rica': { name: 'Costa Rica', prevalence: 'moderate', typicalFeeRange: '$10-25 per night at some resort properties', note: 'Some eco-resorts and all-inclusive properties add a per-night fee covering activities or facility use — check the fine print before booking.' },
  'united-kingdom': { name: 'United Kingdom', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  ireland: { name: 'Ireland', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  france: { name: 'France', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — France\'s per-night charge is a government tourist tax (see our Tourist Tax Checker), not a hotel-added resort fee.' },
  germany: { name: 'Germany', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  italy: { name: 'Italy', prevalence: 'rare', typicalFeeRange: '$5-20 per night at some luxury coastal resorts', note: 'A small number of high-end resorts on the Amalfi Coast or Capri add a service charge beyond the room rate — most hotels elsewhere quote the full price upfront.' },
  spain: { name: 'Spain', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some resort properties', note: 'Most hotels quote the full price upfront — what looks like an extra fee is often the government tourist/eco-tax (see our Tourist Tax Checker), not a hotel resort fee.' },
  netherlands: { name: 'Netherlands', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  portugal: { name: 'Portugal', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some Algarve resort properties', note: 'Most hotels quote the full price upfront, though a small number of Algarve resorts add extras.' },
  greece: { name: 'Greece', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some island resort properties', note: 'Most hotels quote the full price upfront, though a small number of island resorts add extras beyond the room rate.' },
  austria: { name: 'Austria', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  switzerland: { name: 'Switzerland', prevalence: 'rare', typicalFeeRange: '$5-10 per night at some resort properties', note: "Switzerland's per-night visitor's tax (Kurtaxe) is a government charge, not a hotel resort fee — genuine hotel-added fees are uncommon." },
  poland: { name: 'Poland', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  'czech-republic': { name: 'Czech Republic', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  norway: { name: 'Norway', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  sweden: { name: 'Sweden', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  denmark: { name: 'Denmark', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  iceland: { name: 'Iceland', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  japan: { name: 'Japan', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — a small local accommodation tax exists in some cities, but it is a government charge, not a hotel-added resort fee.' },
  'south-korea': { name: 'South Korea', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  malaysia: { name: 'Malaysia', prevalence: 'rare', typicalFeeRange: '$3-10 per night at some resort island properties', note: 'Most hotels quote the full price upfront, though a small number of resort-island properties add extras.' },
  philippines: { name: 'Philippines', prevalence: 'moderate', typicalFeeRange: '$5-15 per night', note: 'Some resort islands (Boracay, Palawan) add an environmental or facility fee per night beyond the quoted room rate — check before booking.' },
  israel: { name: 'Israel', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  jordan: { name: 'Jordan', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
  kenya: { name: 'Kenya', prevalence: 'rare', typicalFeeRange: '$5-20 per night at some safari lodges', note: 'Some safari lodges bundle conservation or park-related charges separately from the room rate — this is usually disclosed upfront rather than hidden, but worth confirming.' },
  'south-africa': { name: 'South Africa', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some resort properties', note: 'Most hotels quote the full price upfront — undisclosed resort fees are uncommon.' },
  australia: { name: 'Australia', prevalence: 'rare', typicalFeeRange: '$5-15 per night at some tropical resort properties', note: 'Most hotels quote the full price upfront — some Great Barrier Reef-area resorts add an environmental management charge, which is usually disclosed rather than hidden.' },
  'new-zealand': { name: 'New Zealand', prevalence: 'none', typicalFeeRange: null, note: 'Hotels overwhelmingly quote the full price upfront — mandatory undisclosed resort fees are not a common practice here.' },
};

const PREVALENCE_LABELS = {
  high: 'high — many hotels, especially resorts and larger properties, add a mandatory daily fee not shown in the advertised room rate',
  moderate: 'moderate — some hotels and resorts add a fee, more common at larger or all-inclusive properties',
  rare: 'rare — most hotels quote an all-inclusive rate, though a few larger resort properties may still add extras',
  none: 'essentially none — hotels here overwhelmingly quote the full price upfront',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = data.prevalence === 'none'
    ? `${data.name}: hidden resort/destination fees are ${PREVALENCE_LABELS.none}.`
    : `${data.name}: hidden resort/destination fees are ${PREVALENCE_LABELS[data.prevalence]}. Typical range where they apply: ${data.typicalFeeRange}.`;

  return {
    country, countryName: data.name, prevalence: data.prevalence,
    prevalenceLabel: PREVALENCE_LABELS[data.prevalence], typicalFeeRange: data.typicalFeeRange,
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/resort-fee-checker/calculate
// @access Public
exports.calculateResortFee = (req, res) => {
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
// @route POST /api/tools/resort-fee-checker/pdf
// @access Public
exports.generateResortFeePdf = async (req, res) => {
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
      [email, firstName || null, 'resort-fee-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Resort Fee Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resort-fee-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Resort fee prevalence: ${result.prevalenceLabel}`);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      result.prevalence === 'high' || result.prevalence === 'moderate'
        ? "Search the hotel's booking page for \"resort fee,\" \"destination fee,\" or \"amenity fee\" before booking — it's often disclosed only in small print or at the final checkout step."
        : "Fees here are uncommon, but it's still worth checking the final checkout total against the advertised nightly rate before confirming.",
      'Compare the true total cost (room rate plus mandatory fees) across hotels, not just the headline nightly rate — a cheaper-looking room can end up costing more once fees are added.',
      'Resort fees are different from government tourist taxes (city/state-level charges) — both can appear on the same bill, so don\'t assume one covers the other.',
      'If a fee seems unclear, ask the hotel directly what it covers before you book — "may include" language in the fine print is a common source of disputes at checkout.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🏨 Your ${result.countryName} resort fee guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your resort fee check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond hotel fee logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send resort-fee-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateResortFeePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
