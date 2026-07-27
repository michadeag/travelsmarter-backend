const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Minimum passport validity rules per country. requirement: 'six-months' |
// 'three-months' | 'stay-duration'. months = the buffer beyond the relevant
// travel date the destination requires. Rules are widely stable, well-known
// travel facts, but immigration policy can change — the PDF/page both
// explicitly tell the traveler to reconfirm with official sources.
const COUNTRIES = {
  thailand: { name: 'Thailand', requirement: 'six-months', months: 6, note: 'Enforced strictly at check-in — airlines routinely deny boarding over this, even when actual Thai immigration practice is sometimes more lenient.' },
  indonesia: { name: 'Indonesia', requirement: 'six-months', months: 6, note: 'Bali and the rest of Indonesia enforce this consistently — budget airlines are especially strict about checking it before you board.' },
  vietnam: { name: 'Vietnam', requirement: 'six-months', months: 6, note: 'Applies to both visa-exempt entry and e-visas.' },
  philippines: { name: 'Philippines', requirement: 'six-months', months: 6, note: 'Applies regardless of the length of your intended stay.' },
  malaysia: { name: 'Malaysia', requirement: 'six-months', months: 6, note: 'Applies to both tourist and transit entries.' },
  singapore: { name: 'Singapore', requirement: 'six-months', months: 6, note: 'Checked closely given Singapore\'s reputation for strict immigration enforcement.' },
  china: { name: 'China', requirement: 'six-months', months: 6, note: 'Applies to tourist visas and most visa-free transit arrangements.' },
  india: { name: 'India', requirement: 'six-months', months: 6, note: 'Measured from your date of arrival, not your visa application date.' },
  cambodia: { name: 'Cambodia', requirement: 'six-months', months: 6, note: 'Applies even with a visa on arrival.' },
  'sri-lanka': { name: 'Sri Lanka', requirement: 'six-months', months: 6, note: 'Applies alongside the separate electronic travel authorization requirement.' },
  'united-arab-emirates': { name: 'United Arab Emirates', requirement: 'six-months', months: 6, note: 'Applies even for the visa-on-arrival most nationalities receive.' },
  qatar: { name: 'Qatar', requirement: 'six-months', months: 6, note: 'Applies to both tourist visits and transit.' },
  'saudi-arabia': { name: 'Saudi Arabia', requirement: 'six-months', months: 6, note: 'Applies to tourist, Umrah, and Hajj visas alike.' },
  egypt: { name: 'Egypt', requirement: 'six-months', months: 6, note: 'Applies whether you get a visa in advance or on arrival.' },
  kenya: { name: 'Kenya', requirement: 'six-months', months: 6, note: 'Applies alongside the separate eTA requirement.' },
  tanzania: { name: 'Tanzania', requirement: 'six-months', months: 6, note: 'Applies whether you\'re arriving for a safari or a Zanzibar beach trip.' },
  morocco: { name: 'Morocco', requirement: 'six-months', months: 6, note: 'Applies to standard tourist entry.' },
  jordan: { name: 'Jordan', requirement: 'six-months', months: 6, note: 'Applies to visa-on-arrival entry, which most nationalities use.' },
  nigeria: { name: 'Nigeria', requirement: 'six-months', months: 6, note: 'Applies alongside a visa requirement for most nationalities.' },
  ghana: { name: 'Ghana', requirement: 'six-months', months: 6, note: 'Applies alongside a visa requirement for most nationalities.' },
  ethiopia: { name: 'Ethiopia', requirement: 'six-months', months: 6, note: 'Applies even with the widely-used e-visa.' },
  bangladesh: { name: 'Bangladesh', requirement: 'six-months', months: 6, note: 'Applies to both visa-on-arrival and e-visa entry.' },
  nepal: { name: 'Nepal', requirement: 'six-months', months: 6, note: 'Applies even though most nationalities get a visa on arrival in Kathmandu.' },
  myanmar: { name: 'Myanmar', requirement: 'six-months', months: 6, note: 'Applies to tourist e-visas.' },
  laos: { name: 'Laos', requirement: 'six-months', months: 6, note: 'Applies to both visa-on-arrival and e-visa entry.' },
  brunei: { name: 'Brunei', requirement: 'six-months', months: 6, note: 'Applies to visa-free entry for most nationalities.' },
  maldives: { name: 'Maldives', requirement: 'six-months', months: 6, note: 'Enforced despite the famously relaxed visa-on-arrival policy for most nationalities.' },
  bahrain: { name: 'Bahrain', requirement: 'six-months', months: 6, note: 'Applies to e-visa entry, which most nationalities use.' },
  kuwait: { name: 'Kuwait', requirement: 'six-months', months: 6, note: 'Applies alongside a visa requirement for most nationalities.' },
  oman: { name: 'Oman', requirement: 'six-months', months: 6, note: 'Applies to e-visa entry, which most nationalities use.' },
  pakistan: { name: 'Pakistan', requirement: 'six-months', months: 6, note: 'Applies alongside a visa requirement for most nationalities.' },
  zambia: { name: 'Zambia', requirement: 'six-months', months: 6, note: 'Applies to visa-on-arrival entry.' },
  zimbabwe: { name: 'Zimbabwe', requirement: 'six-months', months: 6, note: 'Applies to visa-on-arrival entry, including the regional KAZA UniVisa.' },
  botswana: { name: 'Botswana', requirement: 'six-months', months: 6, note: 'Applies to standard tourist entry.' },
  namibia: { name: 'Namibia', requirement: 'six-months', months: 6, note: 'Applies to standard tourist entry.' },
  mozambique: { name: 'Mozambique', requirement: 'six-months', months: 6, note: 'Applies to visa-on-arrival entry.' },
  angola: { name: 'Angola', requirement: 'six-months', months: 6, note: 'Applies alongside the required e-visa.' },
  turkey: { name: 'Turkey', requirement: 'six-months', months: 6, note: 'Turkish authorities generally want at least 6 months validity plus enough blank pages for entry/exit stamps.' },
  israel: { name: 'Israel', requirement: 'six-months', months: 6, note: 'Applies to standard tourist entry.' },

  france: { name: 'France', requirement: 'three-months', months: 3, note: 'Schengen rule — valid at least 3 months past your planned departure from the Schengen area, and issued within the last 10 years.' },
  germany: { name: 'Germany', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  italy: { name: 'Italy', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  spain: { name: 'Spain', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  netherlands: { name: 'Netherlands', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  austria: { name: 'Austria', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  belgium: { name: 'Belgium', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  switzerland: { name: 'Switzerland', requirement: 'three-months', months: 3, note: 'Not in the EU, but a Schengen member — the same 3-month rule applies.' },
  portugal: { name: 'Portugal', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  greece: { name: 'Greece', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  'czech-republic': { name: 'Czech Republic', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  poland: { name: 'Poland', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  hungary: { name: 'Hungary', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  sweden: { name: 'Sweden', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  denmark: { name: 'Denmark', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },
  norway: { name: 'Norway', requirement: 'three-months', months: 3, note: 'Not in the EU, but a Schengen member — the same 3-month rule applies.' },
  iceland: { name: 'Iceland', requirement: 'three-months', months: 3, note: 'Not in the EU, but a Schengen member — the same 3-month rule applies.' },
  croatia: { name: 'Croatia', requirement: 'three-months', months: 3, note: 'Joined the Schengen area, so the same 3-month rule now applies.' },
  finland: { name: 'Finland', requirement: 'three-months', months: 3, note: 'Same Schengen rule as its neighbors — 3 months beyond departure, issued within the last 10 years.' },

  'united-kingdom': { name: 'United Kingdom', requirement: 'stay-duration', months: 0, note: 'Post-Brexit, the UK dropped the old EU-era 6-month rule — your passport just needs to cover your entire stay.' },
  'united-states': { name: 'United States', requirement: 'stay-duration', months: 0, note: 'For most Visa Waiver Program travelers, valid through your planned departure date is enough — no extra buffer required.' },
  canada: { name: 'Canada', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  mexico: { name: 'Mexico', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  japan: { name: 'Japan', requirement: 'stay-duration', months: 0, note: 'One of the more traveler-friendly major destinations on this front.' },
  'south-korea': { name: 'South Korea', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  'costa-rica': { name: 'Costa Rica', requirement: 'stay-duration', months: 0, note: 'Officially just needs to cover your stay, though some airlines apply their own stricter buffer at check-in — a little extra margin avoids surprises.' },
  australia: { name: 'Australia', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  'new-zealand': { name: 'New Zealand', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  argentina: { name: 'Argentina', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  chile: { name: 'Chile', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  peru: { name: 'Peru', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  brazil: { name: 'Brazil', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  colombia: { name: 'Colombia', requirement: 'stay-duration', months: 0, note: 'Just needs to remain valid for the length of your stay.' },
  ireland: { name: 'Ireland', requirement: 'stay-duration', months: 0, note: 'Not in the Schengen area, so the EU 3-month buffer rule doesn\'t apply — just needs to cover your stay.' },
};

const REQUIREMENT_LABELS = {
  'six-months': 'requires your passport to stay valid for at least 6 months beyond your entry date',
  'three-months': 'requires your passport to stay valid for at least 3 months beyond your planned departure (Schengen rule)',
  'stay-duration': 'only requires your passport to remain valid for the length of your stay',
};

function computeResult({ country, expiryDate }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');
  if (!expiryDate) throw new Error('Passport expiry date is required');

  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) throw new Error('Invalid expiry date');

  const latestTravelDate = new Date(expiry);
  latestTravelDate.setMonth(latestTravelDate.getMonth() - data.months);
  const latestTravelDateStr = latestTravelDate.toISOString().split('T')[0];

  const today = new Date();
  const daysUntilDeadline = Math.floor((latestTravelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let urgency;
  if (daysUntilDeadline < 0) urgency = 'expired';
  else if (daysUntilDeadline <= 60) urgency = 'soon';
  else urgency = 'ok';

  const URGENCY_LABELS = {
    expired: "your passport no longer meets the buffer — renew before you book",
    soon: "cutting it close — your safe travel window closes within about 2 months",
    ok: "you're fine for now",
  };

  const headline = urgency === 'expired'
    ? `Your current passport no longer meets ${data.name}'s validity requirement — you'll need to renew before you travel.`
    : `With your current passport, you can safely enter ${data.name} up until ${latestTravelDateStr}.`;

  return {
    country, countryName: data.name, requirement: data.requirement, requirementLabel: REQUIREMENT_LABELS[data.requirement],
    months: data.months, note: data.note, expiryDate: expiry.toISOString().split('T')[0],
    latestTravelDate: latestTravelDateStr, urgency, urgencyLabel: URGENCY_LABELS[urgency], headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/passport-validity-checker/calculate
// @access Public
exports.calculatePassportValidity = (req, res) => {
  try {
    const { country, expiryDate } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country, expiryDate });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/passport-validity-checker/pdf
// @access Public
exports.generatePassportValidityPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, country, expiryDate } = req.body;
    if (!email || !country || !expiryDate) {
      return res.status(400).json({ success: false, error: 'email, country and expiryDate are required' });
    }

    const result = computeResult({ country, expiryDate });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'passport-validity-checker',
        JSON.stringify({ country, expiryDate }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Passport Validity Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="passport-validity-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `${result.countryName} ${result.requirementLabel}. ${result.note}`);

    pdfService.highlightBox(doc, result.urgencyLabel);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      result.urgency === 'expired'
        ? 'Renew your passport before booking anything — many airlines will refuse to let you check in with a passport that doesn\'t meet the destination\'s validity rule, even if your actual travel dates are still fine.'
        : `Keep ${result.latestTravelDate} in mind as your safe-travel cutoff with your current passport — after that, the country's own validity buffer is no longer satisfied.`,
      'Double-check with the destination\'s official immigration site or your airline before booking — passport validity rules do change, and this guide reflects general, widely-cited requirements rather than a real-time government source.',
      'If you\'re close to the cutoff, renew now rather than later — passport offices often have longer processing times than travelers expect, especially during peak travel seasons.',
      'Check your passport has enough blank visa pages too — some countries require multiple blank pages in addition to the validity buffer.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛂 Your ${result.countryName} passport validity check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your passport validity check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond passport paperwork? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send passport-validity-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePassportValidityPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
