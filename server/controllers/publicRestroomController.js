const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Public restroom availability and genuine etiquette differences per
// destination — squat vs. Western-style toilets, whether toilet paper is
// provided, paid vs. free access, and bidet/hose prevalence. A real,
// distinct "why didn't anyone tell me" category not covered by any other
// tool. availabilityLevel: 'easy' (plentiful, familiar Western-style
// expectations, usually free) | 'moderate' (findable, but some genuine
// etiquette differences — paid access, bring-your-own-tissue habits, or
// disposal-not-flushing norms) | 'tricky' (squat toilets common outside
// hotels/malls, carrying your own tissue is genuinely essential, and
// public availability can be limited outside tourist areas).
const COUNTRIES = {
  france: { name: 'France', availabilityLevel: 'easy', note: 'Western-style toilets are standard, and public restrooms (including free-standing "sanisettes" in cities) are reasonably plentiful — bring small change just in case for the occasional pay toilet at a train station.' },
  austria: { name: 'Austria', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are clean and reasonably plentiful, though a small fee (€0.50-1) is common at train stations and highway stops.' },
  'czech-republic': { name: 'Czech Republic', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, but paid public restrooms (with an attendant collecting a small coin fee) are notably more common here than in Western Europe — keep small change handy.' },
  denmark: { name: 'Denmark', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are clean and generally free or low-cost.' },
  germany: { name: 'Germany', availabilityLevel: 'easy', note: 'Western-style toilets are standard, and Germany is known for notably clean, well-maintained public restrooms, though a small fee is common at train stations and highway stops.' },
  greece: { name: 'Greece', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, but many older buildings and public restrooms have weak plumbing — a small waste bin next to the toilet for used paper (rather than flushing it) is common and expected in many places, including some hotels.' },
  hungary: { name: 'Hungary', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, but paid public restrooms (with an attendant) are notably more common here than in Western Europe — keep small change handy.' },
  iceland: { name: 'Iceland', availabilityLevel: 'moderate', note: "Western-style toilets are standard, but dedicated public restrooms outside towns can be genuinely sparse given Iceland's low population density — plan around gas stations and visitor centers on longer drives." },
  italy: { name: 'Italy', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, though truly public (non-cafe) restrooms are less plentiful than in Northern Europe — a bidet next to the toilet is a genuinely common fixture in Italian bathrooms, including hotels.' },
  netherlands: { name: 'Netherlands', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are reasonably plentiful, though a small fee is common at train stations.' },
  portugal: { name: 'Portugal', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, but in some older buildings, weak plumbing means used toilet paper goes in a small bin rather than the toilet — worth checking for a sign or bin before you assume otherwise.' },
  spain: { name: 'Spain', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, and a bidet next to the toilet is a genuinely common fixture, including in hotels — truly public restrooms are less plentiful than in Northern Europe, so cafes are a common fallback.' },
  sweden: { name: 'Sweden', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are clean, though a small fee (often card-only) is common in city centers.' },
  switzerland: { name: 'Switzerland', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are notably clean and well-maintained, generally free or low-cost.' },
  ireland: { name: 'Ireland', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are reasonably plentiful and generally free.' },
  'united-kingdom': { name: 'United Kingdom', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are reasonably plentiful, though some (especially in London) charge a small fee.' },
  turkey: { name: 'Turkey', availabilityLevel: 'moderate', note: 'A genuine mix of Western-style and squat toilets, even in tourist areas — most public restrooms charge a small fee (often collected by an attendant), and carrying tissues is a good habit since paper isn\'t always provided.' },
  japan: { name: 'Japan', availabilityLevel: 'easy', note: 'Japan is famous for having exceptionally clean, plentiful, free public restrooms, often with high-tech heated bidet seats (washlets) — genuinely one of the best countries in the world for this.' },
  thailand: { name: 'Thailand', availabilityLevel: 'tricky', note: "Squat toilets are common outside hotels, malls, and major tourist sites, and a hand-held bidet sprayer (instead of paper) is the local norm — carrying your own tissue is genuinely essential, and a small fee is common at public facilities." },
  indonesia: { name: 'Indonesia', availabilityLevel: 'tricky', note: 'Squat toilets and a "mandi" (water scoop) or hose instead of paper are common outside hotels and malls — carrying your own tissue is genuinely essential, and public restroom availability outside tourist areas can be limited.' },
  singapore: { name: 'Singapore', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are exceptionally clean and plentiful, especially in malls (Singapore is famously strict about hygiene standards).' },
  'south-korea': { name: 'South Korea', availabilityLevel: 'easy', note: 'Western-style toilets are standard, and public restrooms are clean, plentiful, and free — including at most subway stations.' },
  'hong-kong': { name: 'Hong Kong', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are reasonably plentiful, especially in malls and MTR stations.' },
  vietnam: { name: 'Vietnam', availabilityLevel: 'tricky', note: 'Squat toilets are common outside hotels and modern establishments, and carrying your own tissue is genuinely essential — paper often isn\'t provided, and a small fee is common at public facilities.' },
  philippines: { name: 'Philippines', availabilityLevel: 'tricky', note: 'A "tabo" (water scoop) instead of paper is common outside hotels and malls, and carrying your own tissue is a genuinely good habit — a small fee is common at public facilities.' },
  malaysia: { name: 'Malaysia', availabilityLevel: 'moderate', note: 'A genuine mix of Western-style and squat toilets, with a hand-held bidet sprayer often provided alongside paper — malls and hotels are reliably Western-style, and carrying tissue is a good backup habit.' },
  china: { name: 'China', availabilityLevel: 'tricky', note: "Squat toilets are still common outside hotels, malls, and major tourist sites, toilet paper is often not provided (bring your own or buy from a vending machine), and public restrooms can be genuinely basic — hotels and shopping centers are the reliable fallback." },
  india: { name: 'India', availabilityLevel: 'tricky', note: "Squat toilets and a water-based hose/bucket instead of paper are common outside hotels and malls — carrying your own tissue is genuinely essential, and public restroom availability, while improving under government sanitation initiatives, is still inconsistent outside major cities." },
  maldives: { name: 'Maldives', availabilityLevel: 'moderate', note: 'Resort islands have Western-style facilities throughout; Malé and local islands have more mixed facilities — not a major concern given how resort-centered most visits are.' },
  taiwan: { name: 'Taiwan', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are clean and plentiful, especially at MRT stations and convenience stores.' },
  'sri-lanka': { name: 'Sri Lanka', availabilityLevel: 'tricky', note: 'A hand-held bidet sprayer instead of paper is common outside hotels, and squat toilets appear in some local establishments — carrying your own tissue is a genuinely good habit.' },
  cambodia: { name: 'Cambodia', availabilityLevel: 'tricky', note: 'Squat toilets and hose-instead-of-paper norms are common outside hotels and tourist restaurants — carrying your own tissue is genuinely essential, and a small fee is common at public facilities.' },
  australia: { name: 'Australia', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are plentiful and free, including well-maintained facilities at beaches and parks.' },
  'new-zealand': { name: 'New Zealand', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are plentiful and free, including at scenic stops on road trips.' },
  fiji: { name: 'Fiji', availabilityLevel: 'moderate', note: 'Resort and hotel facilities are reliably Western-style; public restroom availability outside those areas is more limited — not usually a major concern given how resort-centered most visits are.' },
  'french-polynesia': { name: 'French Polynesia', availabilityLevel: 'moderate', note: 'Resort and hotel facilities are reliably Western-style; public restroom availability outside those areas is more limited — not usually a major concern given how resort-centered most visits are.' },
  mexico: { name: 'Mexico', availabilityLevel: 'moderate', note: "Western-style toilets are standard, but plumbing in many buildings can't handle paper — a small bin next to the toilet for used paper (rather than flushing it) is common and genuinely expected in many places, including some hotels and restaurants." },
  'dominican-republic': { name: 'Dominican Republic', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels, but a bin for used paper (rather than flushing) is common in older plumbing systems elsewhere — worth checking before you assume otherwise.' },
  'puerto-rico': { name: 'Puerto Rico', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, but a bin for used paper (rather than flushing) is genuinely common in older buildings, similar to much of the wider Caribbean.' },
  bahamas: { name: 'Bahamas', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels; public restroom availability outside those areas is more limited.' },
  jamaica: { name: 'Jamaica', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels, but a bin for used paper (rather than flushing) is common in older plumbing systems elsewhere.' },
  aruba: { name: 'Aruba', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels; public restroom availability outside those areas is more limited.' },
  'turks-and-caicos': { name: 'Turks and Caicos', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels; public restroom availability outside those areas is more limited.' },
  'st-lucia': { name: 'St. Lucia', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels, but a bin for used paper (rather than flushing) is common in older plumbing systems elsewhere.' },
  'costa-rica': { name: 'Costa Rica', availabilityLevel: 'moderate', note: "Western-style toilets are standard, but a bin next to the toilet for used paper (rather than flushing) is common and genuinely expected almost everywhere, including many hotels — a well-known local plumbing norm worth knowing in advance." },
  panama: { name: 'Panama', availabilityLevel: 'moderate', note: 'Western-style toilets are standard, but a bin next to the toilet for used paper (rather than flushing) is common in many buildings — worth checking before you assume otherwise.' },
  belize: { name: 'Belize', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels, but a bin for used paper (rather than flushing) is common in older plumbing systems elsewhere.' },
  'cayman-islands': { name: 'Cayman Islands', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels; public restroom availability outside those areas is more limited.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels; public restroom availability outside those areas is more limited.' },
  curacao: { name: 'Curaçao', availabilityLevel: 'moderate', note: 'Western-style toilets are standard at resorts and hotels; public restroom availability outside those areas is more limited.' },
  canada: { name: 'Canada', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are plentiful and free, similar to the US.' },
  'united-arab-emirates': { name: 'United Arab Emirates', availabilityLevel: 'easy', note: 'Western-style toilets are standard, and public restrooms (especially in Dubai\'s malls) are notably clean and plentiful, often with a bidet-style hose provided alongside paper.' },
  morocco: { name: 'Morocco', availabilityLevel: 'tricky', note: "Squat toilets are common outside hotels and riads, and a water hose or bucket instead of paper is the local norm — carrying your own tissue is genuinely essential, and public restrooms outside tourist areas can be very basic." },
  'south-africa': { name: 'South Africa', availabilityLevel: 'moderate', note: 'Western-style toilets are standard in tourist areas, restaurants, and malls; public restroom availability can be more limited outside those areas, similar to many mid-sized cities elsewhere.' },
  qatar: { name: 'Qatar', availabilityLevel: 'easy', note: 'Western-style toilets are standard, and public restrooms (especially in Doha\'s malls) are notably clean and plentiful, often with a bidet-style hose provided alongside paper.' },
  israel: { name: 'Israel', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are reasonably plentiful in tourist areas and malls.' },
  tanzania: { name: 'Tanzania', availabilityLevel: 'tricky', note: 'Squat toilets are common outside hotels and lodges, and carrying your own tissue is genuinely essential — safari lodges and hotels are reliably Western-style, but public facilities elsewhere can be very basic.' },
  kenya: { name: 'Kenya', availabilityLevel: 'tricky', note: 'Squat toilets are common outside hotels and lodges, and carrying your own tissue is genuinely essential — safari lodges and hotels are reliably Western-style, but public facilities elsewhere can be very basic.' },
  argentina: { name: 'Argentina', availabilityLevel: 'moderate', note: 'Western-style toilets are standard; truly public (non-cafe) restrooms are less plentiful in city centers, similar to much of Europe — cafes and malls are a common, reliable fallback.' },
  peru: { name: 'Peru', availabilityLevel: 'moderate', note: "Western-style toilets are standard in tourist areas, but a bin next to the toilet for used paper (rather than flushing) is common in many buildings, including some hotels — worth checking before you assume otherwise. Public restrooms along trekking routes (like the Inca Trail) usually charge a small fee." },
  chile: { name: 'Chile', availabilityLevel: 'moderate', note: 'Western-style toilets are standard; truly public (non-cafe) restrooms are less plentiful in city centers — cafes and malls are a common, reliable fallback.' },
  colombia: { name: 'Colombia', availabilityLevel: 'moderate', note: "Western-style toilets are standard, but a bin next to the toilet for used paper (rather than flushing) is common in many buildings — worth checking before you assume otherwise." },
  brazil: { name: 'Brazil', availabilityLevel: 'moderate', note: "Western-style toilets are standard, but a bin next to the toilet for used paper (rather than flushing) is common in older plumbing systems — worth checking before you assume otherwise." },
  'united-states': { name: 'United States', availabilityLevel: 'easy', note: 'Western-style toilets are standard and public restrooms are generally plentiful and free, especially at malls, restaurants, and rest stops — availability in some city centers (especially without buying something) can be more limited.' },
};

const AVAILABILITY_LABELS = {
  easy: 'Easy — Familiar and Plentiful',
  moderate: 'Moderate — Some Etiquette to Know',
  tricky: 'Tricky — Real Adjustment Needed',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const availabilityLabel = AVAILABILITY_LABELS[data.availabilityLevel];
  const headline = `${data.name}: ${availabilityLabel}.`;

  return {
    country, countryName: data.name, availabilityLevel: data.availabilityLevel, availabilityLabel,
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/public-restroom-checker/calculate
// @access Public
exports.calculatePublicRestroom = (req, res) => {
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
// @route POST /api/tools/public-restroom-checker/pdf
// @access Public
exports.generatePublicRestroomPdf = async (req, res) => {
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
      [email, firstName || null, 'public-restroom-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Public Restroom Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="public-restroom-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.availabilityLabel);

    pdfService.heading(doc, 'Habits worth building before any trip');
    pdfService.bulletList(doc, [
      "Pack a small travel pack of tissues or wet wipes — useful everywhere, essential in destinations marked \"tricky\" here.",
      'If you see a small bin next to the toilet, that\'s usually a sign to put used paper there instead of flushing it — a real plumbing norm in many countries, not a hygiene downgrade.',
      'Carrying small change or coins is worth it in destinations with pay-toilet culture, even where card payment is increasingly common.',
      'Malls, fast-food chains, and hotel lobbies are a reliable fallback for a clean restroom almost anywhere in the world, even if you\'re not a customer.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚻 Your ${result.countryName} public restroom guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the public restroom check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond bathroom logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send public-restroom-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePublicRestroomPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
