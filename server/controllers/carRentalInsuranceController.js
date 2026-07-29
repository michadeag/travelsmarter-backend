const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Typical car rental security deposit and insurance/coverage quirks per
// destination — distinct from rentalAgeController.js, which covers the
// minimum rental age and young-driver surcharge, not the money held on
// your card or coverage gaps. riskLevel: 'low' (well-regulated,
// transparent market, no notable surprises) | 'moderate' (real extra
// costs or requirements worth knowing before you sign) | 'high' (a
// well-documented pattern of surprise charges, aggressive upselling, or
// risky practices — read the fine print carefully). Deposit ranges are
// approximate and vary by vehicle class and agency — always confirm
// with your specific rental company before you book.
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'moderate', depositRange: '€200-800', note: "Third-party liability insurance is included by EU law, but the collision damage waiver (CDW) excess is often €800-1,500 unless you pay to reduce it — factor that into your decision on whether to buy extra coverage." },
  austria: { name: 'Austria', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  denmark: { name: 'Denmark', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  germany: { name: 'Germany', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  greece: { name: 'Greece', riskLevel: 'moderate', depositRange: '€500-1,000', note: 'Deposits can run higher than in northern Europe, and some smaller local agencies (especially on islands) have a real pattern of disputed post-return damage charges — photograph the car thoroughly at pickup and return.' },
  hungary: { name: 'Hungary', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  iceland: { name: 'Iceland', riskLevel: 'high', depositRange: '$1,500-2,500+', note: "Iceland has some of the highest deposits and most complex insurance add-ons anywhere — gravel-road, ash, and sand protection are sold as near-essential since standard coverage typically excludes damage from Iceland's unpaved roads and volcanic conditions." },
  italy: { name: 'Italy', riskLevel: 'high', depositRange: '€500-1,500+', note: "Italy has a well-documented reputation among travelers for aggressive post-return damage-charge disputes, sometimes for damage that predates the rental — photograph and video the entire car from every angle at pickup and return, no exceptions." },
  netherlands: { name: 'Netherlands', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  portugal: { name: 'Portugal', riskLevel: 'moderate', depositRange: '€500-1,000', note: 'Deposits can run higher than in northern Europe, with damage-dispute patterns similar to (if somewhat less severe than) Spain and Italy — photograph the car thoroughly at pickup and return.' },
  spain: { name: 'Spain', riskLevel: 'moderate', depositRange: '€500-1,000+', note: "Spain has a documented reputation for damage-charge disputes, especially with smaller local or airport-adjacent agencies — photograph and video the car thoroughly at pickup and return." },
  sweden: { name: 'Sweden', riskLevel: 'low', depositRange: '€200-500', note: 'A well-regulated, transparent market — standard EU liability insurance is included, and deposits are generally reasonable.' },
  switzerland: { name: 'Switzerland', riskLevel: 'low', depositRange: 'CHF 300-800', note: 'A well-regulated, transparent market, though overall rental costs run higher than most of Europe — standard liability insurance is included.' },
  ireland: { name: 'Ireland', riskLevel: 'high', depositRange: '€1,500-3,000', note: "Ireland has one of the highest excess/deposit reputations in Europe — the standard excess is often €1,500 or more unless you pay to reduce it, and narrow rural roads mean minor scrape and mirror damage claims are common." },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'moderate', depositRange: '£500-1,000', note: 'Standard liability insurance is included, but the base excess can run high — excess reduction insurance (bought separately, often cheaper via a third party than the rental counter) is genuinely worth considering.' },
  turkey: { name: 'Turkey', riskLevel: 'moderate', depositRange: '$300-800', note: 'Third-party liability is mandatory by law, but the collision damage excess can be high unless bought down, and terms vary noticeably by agency — read the contract carefully.' },
  japan: { name: 'Japan', riskLevel: 'low', depositRange: '¥20,000-50,000', note: 'A well-regulated, transparent market with modest deposits — remember you\'ll need an International Driving Permit arranged before you leave home, not on arrival.' },
  thailand: { name: 'Thailand', riskLevel: 'high', depositRange: 'Varies widely, sometimes passport instead of a deposit', note: "Some smaller local agencies hold your passport in lieu of a card deposit — this is a well-documented risk (your passport can effectively be held hostage in a damage dispute). Insist on a card deposit from a reputable agency instead, and confirm exactly what liability coverage is included." },
  indonesia: { name: 'Indonesia', riskLevel: 'high', depositRange: 'Varies widely, sometimes passport instead of a deposit', note: "Similar to Thailand, some local agencies (especially for scooters in Bali) hold your passport instead of a card deposit — a well-documented risk. Insist on a card deposit and confirm liability coverage before you sign." },
  singapore: { name: 'Singapore', riskLevel: 'low', depositRange: 'SGD 500-1,000', note: 'A well-regulated, transparent market with standard international rental norms.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', depositRange: '₩300,000-700,000', note: "A well-regulated, transparent market — you'll need an International Driving Permit arranged before you leave home." },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', depositRange: 'HKD 3,000-6,000', note: 'A well-regulated market, though self-drive car rental is relatively uncommon here given excellent public transit.' },
  vietnam: { name: 'Vietnam', riskLevel: 'high', depositRange: 'Varies widely, sometimes passport instead of a deposit', note: "Similar to Thailand and Indonesia, some local agencies (for both cars and motorbikes) hold your passport instead of a card deposit — a well-documented risk. Insist on a card deposit and photograph the vehicle thoroughly before you ride or drive off." },
  philippines: { name: 'Philippines', riskLevel: 'moderate', depositRange: 'Varies by agency', note: 'Insurance coverage and deposit practices vary noticeably between major international chains and smaller local operators — read the contract carefully, especially at smaller agencies.' },
  malaysia: { name: 'Malaysia', riskLevel: 'low', depositRange: 'MYR 500-1,500', note: 'A reasonably well-regulated market with standard international rental norms.' },
  china: { name: 'China', riskLevel: 'moderate', depositRange: 'Varies, paperwork-heavy', note: "Self-drive rental for foreign tourists is uncommon and can be paperwork-heavy (a Chinese driving permit process is required) — most visitors use a hired driver instead." },
  india: { name: 'India', riskLevel: 'moderate', depositRange: 'Varies, often substantial', note: 'Self-drive rental is uncommon for tourists — most visitors use a hired driver with the car included, which sidesteps deposit and insurance complexity entirely.' },
  maldives: { name: 'Maldives', riskLevel: 'low', depositRange: 'Not typically applicable', note: 'Car rental is essentially not a relevant concept here given the small, mostly car-free resort islands.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', depositRange: 'NTD 5,000-15,000', note: 'A well-regulated, transparent market with standard international rental norms.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', depositRange: 'Varies by agency', note: 'Most visitors hire a driver with the car included rather than self-driving, which sidesteps deposit and insurance complexity; self-drive coverage at smaller agencies can be minimal.' },
  cambodia: { name: 'Cambodia', riskLevel: 'high', depositRange: 'Varies widely, sometimes passport instead of a deposit', note: "Similar to neighboring Southeast Asian countries, some local agencies hold your passport instead of a card deposit — a well-documented risk. Insist on a card deposit and confirm liability coverage before you sign." },
  australia: { name: 'Australia', riskLevel: 'moderate', depositRange: 'AUD 500-1,500', note: 'A well-regulated, transparent market overall, but the excess can run high, especially for larger vehicles, 4WDs, or younger drivers — excess reduction cover is worth comparing against the counter price.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'moderate', depositRange: 'NZD 500-1,500', note: 'A well-regulated, transparent market overall, but the excess can run high, especially for larger vehicles or unsealed-road driving — excess reduction cover is worth comparing against the counter price.' },
  fiji: { name: 'Fiji', riskLevel: 'moderate', depositRange: 'FJD 500-1,500', note: 'Standard deposit practices apply on the main island, but road conditions on some outer islands can create coverage gaps worth asking about directly.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'low', depositRange: '€300-800', note: 'A reasonably well-regulated market with standard international rental norms.' },
  mexico: { name: 'Mexico', riskLevel: 'high', depositRange: '$300-1,000', note: "Mexican law requires third-party liability insurance that most US/Canadian credit card coverage and home auto policies do NOT cover — this is real and mandatory, but aggressive upselling of full/comprehensive coverage beyond that legal minimum is one of the most commonly reported tourist complaints anywhere. Confirm exactly what's legally required versus what's being upsold." },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — read the contract carefully, especially at smaller local operators near resorts.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'low', depositRange: '$200-500', note: 'As US territory, standard mainland US rental norms generally apply.' },
  bahamas: { name: 'Bahamas', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — read the contract carefully.' },
  jamaica: { name: 'Jamaica', riskLevel: 'moderate', depositRange: '$300-800', note: 'You\'ll typically need to purchase a temporary local driving permit at pickup, in addition to your home license — factor the extra fee and paperwork into your plans.' },
  aruba: { name: 'Aruba', riskLevel: 'low', depositRange: '$200-500', note: 'A reasonably well-regulated, tourist-friendly market.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'moderate', depositRange: '$300-800', note: 'You\'ll typically need to purchase a temporary local driving permit at pickup, in addition to your home license — factor the extra fee and paperwork into your plans.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'moderate', depositRange: '$300-800', note: 'You\'ll typically need to purchase a temporary local driving permit at pickup, in addition to your home license — factor the extra fee and paperwork into your plans.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'high', depositRange: '$500-1,500', note: "Costa Rica requires mandatory local third-party liability insurance (TPL) by law regardless of any other coverage you already have — this is one of the most commonly reported 'surprise' counter charges in Latin America since it's genuinely not optional, but isn't always disclosed clearly when you book online." },
  panama: { name: 'Panama', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — read the contract carefully.' },
  belize: { name: 'Belize', riskLevel: 'moderate', depositRange: '$300-800', note: 'Some agencies require a temporary local driving permit at pickup, in addition to your home license — confirm this in advance.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'moderate', depositRange: '$300-800', note: 'You\'ll typically need to purchase a temporary local driving permit at pickup, in addition to your home license — factor the extra fee and paperwork into your plans.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'moderate', depositRange: '$300-800', note: 'You\'ll typically need to purchase a temporary local driving permit at pickup, in addition to your home license — factor the extra fee and paperwork into your plans.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', depositRange: '$200-500', note: 'A reasonably well-regulated, tourist-friendly market.' },
  canada: { name: 'Canada', riskLevel: 'low', depositRange: 'CAD 200-500', note: 'A well-regulated, transparent market similar to the US — base liability is included, and CDW/insurance is genuinely optional rather than a hidden requirement.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'moderate', depositRange: 'AED 1,000-3,000', note: 'Deposits can run high, especially for larger or luxury vehicles, and a Salik toll transponder is usually included but worth confirming — check whether tolls are billed automatically to your card after return.' },
  morocco: { name: 'Morocco', riskLevel: 'moderate', depositRange: '€300-800', note: 'Deposit and insurance terms vary noticeably by agency, with some damage-dispute reports similar to southern Europe — photograph the car thoroughly at pickup and return.' },
  'south-africa': { name: 'South Africa', riskLevel: 'moderate', depositRange: 'ZAR 3,000-8,000', note: 'A reasonably well-regulated domestic market, but cross-border rental into neighboring countries often requires special permission and extra insurance — confirm this explicitly if your itinerary crosses a border.' },
  qatar: { name: 'Qatar', riskLevel: 'low', depositRange: 'QAR 1,000-3,000', note: 'A well-regulated, transparent market with standard international rental norms.' },
  israel: { name: 'Israel', riskLevel: 'moderate', depositRange: '$300-800', note: 'Standard rental norms apply, but some agreements restrict or void coverage for travel into certain territories — confirm your exact planned route is covered before you sign.' },
  tanzania: { name: 'Tanzania', riskLevel: 'high', depositRange: 'Varies, often paired with a required driver', note: 'Most visitors use a hired driver/guide rather than self-driving, given road conditions and wildlife-area rules — self-drive insurance coverage where available can be minimal or unclear, so confirm carefully if you plan to self-drive.' },
  kenya: { name: 'Kenya', riskLevel: 'high', depositRange: 'Varies, often paired with a required driver', note: 'Most visitors use a hired driver/guide rather than self-driving, given road conditions and wildlife-area rules — self-drive insurance coverage where available can be minimal or unclear, so confirm carefully if you plan to self-drive.' },
  argentina: { name: 'Argentina', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — read the contract carefully, especially at smaller local operators.' },
  peru: { name: 'Peru', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — many visitors hire a driver for longer routes rather than self-driving.' },
  chile: { name: 'Chile', riskLevel: 'low', depositRange: '$300-800', note: 'A reasonably well-regulated market by regional standards, with standard international rental norms.' },
  colombia: { name: 'Colombia', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — read the contract carefully, especially at smaller local operators.' },
  brazil: { name: 'Brazil', riskLevel: 'moderate', depositRange: '$300-800', note: 'Deposit and insurance terms vary noticeably by agency — read the contract carefully, especially at smaller local operators.' },
  'united-states': { name: 'United States', riskLevel: 'low', depositRange: '$200-500', note: 'A well-regulated, transparent market — base liability is included, and CDW/insurance is genuinely optional rather than a hidden requirement, though what your own credit card or auto policy actually covers is worth confirming before you decline it at the counter.' },
};

const RISK_LABELS = {
  low: 'Straightforward — Well-Regulated Market',
  moderate: 'Some Extra Costs — Worth Reading the Fine Print',
  high: 'Watch Out — Well-Documented Surprises',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const riskLabel = RISK_LABELS[data.riskLevel];
  const headline = `${data.name}: ${riskLabel} — typical deposit ${data.depositRange}.`;

  return {
    country, countryName: data.name, riskLevel: data.riskLevel, riskLabel,
    depositRange: data.depositRange, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/car-rental-insurance-checker/calculate
// @access Public
exports.calculateCarRentalInsurance = (req, res) => {
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
// @route POST /api/tools/car-rental-insurance-checker/pdf
// @access Public
exports.generateCarRentalInsurancePdf = async (req, res) => {
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
      [email, firstName || null, 'car-rental-insurance-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Car Rental Deposit & Insurance Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="car-rental-insurance-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.riskLabel} — typical deposit ${result.depositRange}`);

    pdfService.heading(doc, 'Before you sign');
    pdfService.bulletList(doc, [
      'Photograph and video the entire car from every angle before you drive off, including a timestamp — this is your best protection in any damage dispute.',
      'Check what your own credit card or home auto insurance already covers before buying extra coverage at the counter — you may already be covered for some or all of it.',
      'A held deposit isn\'t a charge — it should be released (though sometimes slowly) after a clean return, but ask how many days that typically takes for this specific agency.',
      'These figures are typical estimates and change often — always confirm the exact deposit and insurance terms with your specific rental company before you book.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚗 Your ${result.countryName} car rental deposit & insurance guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the car rental deposit & insurance check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond renting a car? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send car-rental-insurance-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCarRentalInsurancePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
