const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Family/kids travel friendliness per destination — stroller-friendly
// sidewalks and transit, high chairs and kids-eat-free culture at
// restaurants, public changing tables, and general cultural warmth
// toward children in public. Distinct from accessibleTravelController.js
// (wheelchair/mobility accessibility for adults with disabilities),
// pregnancyTravelController.js (Zika risk during pregnancy, not travel
// with an already-born child), and minorConsentController.js (legal
// consent letters, not day-to-day friendliness). friendlinessLevel:
// 'excellent' (strong infrastructure + genuinely kid-oriented culture) |
// 'good' (solid, few real obstacles) | 'moderate' (doable, but real
// logistical friction — stairs, uneven terrain, limited amenities) |
// 'challenging' (well-documented, real obstacles for traveling with
// young kids specifically).
const COUNTRIES = {
  france: { name: 'France', friendlinessLevel: 'good', note: 'Kids are genuinely welcomed almost everywhere, including most restaurants — Paris\'s older neighborhoods have some cobblestones and stairs that make strollers more work than newer areas.' },
  austria: { name: 'Austria', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — stroller-friendly cities, clean public facilities, and a strong culture of family-oriented resorts and activities.' },
  'czech-republic': { name: 'Czech Republic', friendlinessLevel: 'good', note: 'Kids are welcomed and Prague has decent stroller access on main routes, though the historic center\'s cobblestones and stairs require some planning.' },
  denmark: { name: 'Denmark', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — stroller-friendly cities, extensive family-oriented public spaces, and a strong cultural emphasis on child-friendly design.' },
  germany: { name: 'Germany', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — stroller-friendly cities, family rooms and changing tables are standard, and kids are welcomed everywhere including most restaurants.' },
  greece: { name: 'Greece', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but island destinations especially involve real stairs, uneven cobblestones, and limited stroller access.' },
  hungary: { name: 'Hungary', friendlinessLevel: 'good', note: 'Kids are welcomed and Budapest has decent family infrastructure, including thermal baths with family sections.' },
  iceland: { name: 'Iceland', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — very safe, stroller-friendly, and a strong culture of including children in daily life and public spaces.' },
  italy: { name: 'Italy', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, especially at restaurants, but historic centers with cobblestones, stairs, and limited elevators make stroller navigation genuinely harder work.' },
  netherlands: { name: 'Netherlands', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — extremely stroller and bike-trailer friendly, with strong public facilities for families throughout.' },
  portugal: { name: 'Portugal', friendlinessLevel: 'good', note: 'Kids are genuinely welcomed and Lisbon and Porto have decent stroller access on main routes, though some hilly, cobbled areas require more effort.' },
  spain: { name: 'Spain', friendlinessLevel: 'good', note: 'Kids are culturally embraced everywhere, including late dinners at restaurants — most cities have good stroller access with some historic-center exceptions.' },
  sweden: { name: 'Sweden', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — stroller-friendly cities, extensive family-oriented public spaces, and a strong cultural emphasis on child-friendly design.' },
  switzerland: { name: 'Switzerland', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — clean, safe, well-organized public transit and facilities, with strong family-resort culture, especially for outdoor activities.' },
  ireland: { name: 'Ireland', friendlinessLevel: 'good', note: 'Kids are genuinely welcomed at pubs and restaurants alike, with decent stroller access in most towns and cities.' },
  'united-kingdom': { name: 'United Kingdom', friendlinessLevel: 'good', note: 'Kids menus and family-friendly restaurants are common, and most cities have decent stroller access, though the London Underground has limited step-free stations.' },
  turkey: { name: 'Turkey', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but Istanbul\'s hilly, cobbled old-city streets and limited step-free transit make stroller use real work.' },
  japan: { name: 'Japan', friendlinessLevel: 'excellent', note: 'Exceptionally kid-friendly — spotless public facilities, widespread nursing rooms and changing tables, quiet family spaces on trains, and a genuinely warm cultural attitude toward children in public.' },
  thailand: { name: 'Thailand', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but sidewalks are often broken or nonexistent and heat/humidity add real logistical friction with young kids.' },
  indonesia: { name: 'Indonesia', friendlinessLevel: 'moderate', note: 'Bali\'s resort areas are genuinely family-friendly with kids clubs and pools, but sidewalks and general infrastructure outside resorts make stroller use real work.' },
  singapore: { name: 'Singapore', friendlinessLevel: 'excellent', note: 'Exceptionally kid-friendly — spotless, stroller-friendly throughout, extensive nursing rooms, and world-class family attractions.' },
  'south-korea': { name: 'South Korea', friendlinessLevel: 'good', note: 'Kids are welcomed and Seoul has good stroller access on main routes and in most malls, with dedicated family facilities common.' },
  'hong-kong': { name: 'Hong Kong', friendlinessLevel: 'good', note: 'Generally kid-friendly with good public transit, though the dense, hilly terrain and stairs in older neighborhoods add some stroller friction.' },
  vietnam: { name: 'Vietnam', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but chaotic traffic and inconsistent sidewalks make stroller navigation genuinely harder work.' },
  philippines: { name: 'Philippines', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but sidewalk quality and general infrastructure outside resort areas add real logistical friction.' },
  malaysia: { name: 'Malaysia', friendlinessLevel: 'good', note: 'Kids are welcomed and Kuala Lumpur\'s malls and main areas are genuinely stroller-friendly, with family facilities common in shopping centers.' },
  china: { name: 'China', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but crowds, uneven sidewalks, and limited step-free transit access make stroller use real work in many cities.' },
  india: { name: 'India', friendlinessLevel: 'challenging', note: 'Kids are culturally warmly welcomed, but broken sidewalks, traffic chaos, and limited public facilities make traveling with young children genuinely difficult logistically.' },
  maldives: { name: 'Maldives', friendlinessLevel: 'excellent', note: 'Resort-based tourism is genuinely excellent for families — many resorts offer family villas, kids clubs, and shallow lagoon areas ideal for young children.' },
  taiwan: { name: 'Taiwan', friendlinessLevel: 'excellent', note: 'Exceptionally kid-friendly — clean, stroller-friendly cities, widespread nursing rooms, and a genuinely warm cultural attitude toward children in public.' },
  'sri-lanka': { name: 'Sri Lanka', friendlinessLevel: 'moderate', note: 'Kids are culturally adored and welcomed everywhere, but sidewalk quality and general infrastructure add real logistical friction outside resort areas.' },
  cambodia: { name: 'Cambodia', friendlinessLevel: 'challenging', note: 'Kids are culturally warmly welcomed, but broken sidewalks, heat, and limited public facilities make traveling with young children genuinely difficult logistically.' },
  australia: { name: 'Australia', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — stroller-friendly cities, extensive family facilities, and a strong outdoor family culture.' },
  'new-zealand': { name: 'New Zealand', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — safe, stroller-friendly, and a strong outdoor family culture with facilities to match.' },
  fiji: { name: 'Fiji', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with many resorts offering kids clubs and family rooms — infrastructure outside resorts is more limited.' },
  'french-polynesia': { name: 'French Polynesia', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with many resorts offering family accommodations and calm lagoon areas for young children.' },
  mexico: { name: 'Mexico', friendlinessLevel: 'good', note: 'Kids are culturally embraced everywhere, and resort areas are genuinely family-friendly — sidewalk quality varies more in city centers away from tourist zones.' },
  'dominican-republic': { name: 'Dominican Republic', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with many all-inclusives offering kids clubs and family-oriented amenities.' },
  'puerto-rico': { name: 'Puerto Rico', friendlinessLevel: 'good', note: 'Kids are welcomed everywhere, and San Juan and resort areas have decent stroller access and family facilities.' },
  bahamas: { name: 'Bahamas', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with many resorts offering kids clubs and calm beach areas suited to young children.' },
  jamaica: { name: 'Jamaica', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with many all-inclusives offering kids clubs and family-oriented amenities.' },
  aruba: { name: 'Aruba', friendlinessLevel: 'excellent', note: 'Excellent for families — very safe, calm swimming beaches ideal for young kids, and strong resort infrastructure geared toward families.' },
  'turks-and-caicos': { name: 'Turks and Caicos', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with calm, shallow beaches well-suited to young children.' },
  'st-lucia': { name: 'St. Lucia', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with many resorts offering kids clubs and family-oriented amenities.' },
  'costa-rica': { name: 'Costa Rica', friendlinessLevel: 'moderate', note: 'Fantastic for families with older kids thanks to nature and wildlife activities, but uneven terrain and limited infrastructure make logistics genuinely harder with toddlers.' },
  panama: { name: 'Panama', friendlinessLevel: 'moderate', note: 'Kids are welcomed and Panama City has some good family infrastructure, though it\'s uneven outside the main tourist areas.' },
  belize: { name: 'Belize', friendlinessLevel: 'moderate', note: 'Great for families with older kids thanks to reef and jungle activities, but limited infrastructure makes logistics genuinely harder with toddlers.' },
  'cayman-islands': { name: 'Cayman Islands', friendlinessLevel: 'excellent', note: 'Excellent for families — Seven Mile Beach is calm and shallow, and resort infrastructure is strongly geared toward families.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', friendlinessLevel: 'good', note: 'Resort-based tourism is genuinely family-friendly, with calm beach areas well-suited to young children.' },
  curacao: { name: 'Curaçao', friendlinessLevel: 'good', note: 'Calm, shallow beaches and resort infrastructure make this genuinely family-friendly, especially for younger kids.' },
  canada: { name: 'Canada', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — stroller-friendly cities, extensive family facilities, and a strong outdoor family culture.' },
  'united-arab-emirates': { name: 'United Arab Emirates', friendlinessLevel: 'excellent', note: 'Exceptionally kid-friendly — Dubai and Abu Dhabi\'s malls and attractions are heavily geared toward families, with excellent facilities throughout.' },
  morocco: { name: 'Morocco', friendlinessLevel: 'moderate', note: 'Kids are culturally warmly welcomed, but medina streets with stairs and uneven surfaces make stroller navigation genuinely harder work.' },
  'south-africa': { name: 'South Africa', friendlinessLevel: 'moderate', note: 'Family-oriented resorts and safari lodges can be excellent, but general infrastructure and safety planning add real logistical considerations with young kids.' },
  qatar: { name: 'Qatar', friendlinessLevel: 'excellent', note: 'Exceptionally kid-friendly — Doha\'s malls and attractions are heavily geared toward families, with excellent facilities throughout.' },
  israel: { name: 'Israel', friendlinessLevel: 'excellent', note: 'Exceptionally kid-friendly culture — children are welcomed everywhere, and Tel Aviv and Jerusalem have decent stroller infrastructure in most areas.' },
  tanzania: { name: 'Tanzania', friendlinessLevel: 'challenging', note: 'Many safari lodges have age minimums for young children, and the logistics of long game drives genuinely don\'t suit toddlers — better suited to families with older kids.' },
  kenya: { name: 'Kenya', friendlinessLevel: 'challenging', note: 'Many safari lodges have age minimums for young children, and the logistics of long game drives genuinely don\'t suit toddlers — better suited to families with older kids.' },
  argentina: { name: 'Argentina', friendlinessLevel: 'good', note: 'Kids are culturally embraced everywhere, and Buenos Aires has decent stroller infrastructure and family-friendly dining culture.' },
  peru: { name: 'Peru', friendlinessLevel: 'moderate', note: 'Kids are welcomed everywhere, but altitude (Cusco) and uneven terrain at major sites like Machu Picchu add real logistical considerations with young children.' },
  chile: { name: 'Chile', friendlinessLevel: 'good', note: 'Kids are welcomed everywhere, and Santiago has decent stroller infrastructure and family-friendly dining culture.' },
  colombia: { name: 'Colombia', friendlinessLevel: 'moderate', note: 'Kids are culturally embraced everywhere, but sidewalk quality and general infrastructure vary significantly outside main tourist areas.' },
  brazil: { name: 'Brazil', friendlinessLevel: 'moderate', note: 'Kids are culturally embraced everywhere, especially at the beach, but sidewalk quality and general infrastructure vary significantly by city.' },
  'united-states': { name: 'United States', friendlinessLevel: 'excellent', note: 'Excellent family infrastructure — kids-eat-free deals, high chairs, and changing tables are standard almost everywhere, with strong family-attraction infrastructure.' },
};

const FRIENDLINESS_LABELS = {
  excellent: 'Excellent — Strong Infrastructure, Genuinely Kid-Oriented',
  good: 'Good — Solid, Few Real Obstacles',
  moderate: 'Moderate — Doable, But Real Logistical Friction',
  challenging: 'Challenging — Well-Documented Obstacles for Young Kids',
};

const DISCLAIMER = "This reflects general infrastructure and culture, not a guarantee for your specific itinerary — kid-friendliness depends a lot on your children's ages and your accommodation choice. Resort-based stays are almost always easier than independent city travel, regardless of a destination's overall rating.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const friendlinessLabel = FRIENDLINESS_LABELS[data.friendlinessLevel];
  const headline = `${data.name}: ${friendlinessLabel}.`;

  return {
    country, countryName: data.name, friendlinessLevel: data.friendlinessLevel, friendlinessLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/family-travel-checker/calculate
// @access Public
exports.calculateFamilyTravel = (req, res) => {
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
// @route POST /api/tools/family-travel-checker/pdf
// @access Public
exports.generateFamilyTravelPdf = async (req, res) => {
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
      [email, firstName || null, 'family-travel-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Family Travel Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="family-travel-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.friendlinessLabel);

    pdfService.heading(doc, 'General tips for traveling with kids');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'A baby carrier is often more practical than a stroller in destinations with uneven terrain, stairs, or crowded sidewalks.',
      'Book accommodation with a kitchenette or fridge where possible — it makes snacks, formula, and odd mealtimes much easier.',
      'Pack a printed copy of any vaccination records and a basic first-aid kit with kid-dosed medication, since finding familiar brands abroad can be hit or miss.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `👨‍👩‍👧 Your ${result.countryName} family travel guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the family travel check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond family travel? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send family-travel-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateFamilyTravelPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
