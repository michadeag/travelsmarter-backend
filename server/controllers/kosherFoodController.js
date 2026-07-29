const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// How easy it is to find kosher food per destination — the natural
// counterpart to halalFoodController.js, but a genuinely distinct
// dietary/certification system with a different geographic distribution
// (strongest where established Jewish communities exist, rather than
// where Muslim communities exist). availabilityLevel: 'widespread' (the
// default or mainstream, essentially Israel only) | 'good' (large,
// well-established Jewish communities support genuinely good
// availability in major cities) | 'limited' (findable with research —
// often via a local synagogue, kosher deli, or a Chabad House, which
// serve travelers in many cities worldwide) | 'rare' (genuinely hard to
// find outside self-catering or pre-packaged kosher-certified goods).
const COUNTRIES = {
  france: { name: 'France', availabilityLevel: 'good', note: 'France has the largest Jewish community in Europe, and Paris in particular has a genuinely extensive kosher restaurant, bakery, and grocery scene, concentrated in areas like the Marais and the 17th/19th arrondissements.' },
  austria: { name: 'Austria', availabilityLevel: 'limited', note: "Vienna has a small but historic Jewish community with a handful of kosher restaurants and a kosher grocery section; options are essentially nonexistent outside the capital." },
  'czech-republic': { name: 'Czech Republic', availabilityLevel: 'limited', note: "Prague's historic Jewish Quarter supports a small number of kosher restaurants catering to both the local community and visitors; options are essentially nonexistent outside the capital." },
  denmark: { name: 'Denmark', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find outside self-catering or pre-packaged kosher-certified goods from larger supermarkets.' },
  germany: { name: 'Germany', availabilityLevel: 'limited', note: 'Berlin has a growing, if still modest, kosher restaurant and grocery scene; options thin out considerably in other cities and are essentially nonexistent in small towns.' },
  greece: { name: 'Greece', availabilityLevel: 'rare', note: "Athens and Thessaloniki have small historic Sephardic Jewish communities, but dedicated kosher restaurants are genuinely rare — self-catering or pre-packaged goods are the reliable fallback." },
  hungary: { name: 'Hungary', availabilityLevel: 'limited', note: "Budapest has one of the largest Jewish communities remaining in Central Europe, with a genuinely notable kosher restaurant and bakery scene in the historic Jewish Quarter; options are essentially nonexistent outside the capital." },
  iceland: { name: 'Iceland', availabilityLevel: 'rare', note: "Iceland's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  italy: { name: 'Italy', availabilityLevel: 'limited', note: 'Rome and Milan have historic Jewish communities with a real, if modest, number of kosher restaurants and bakeries — Rome\'s old Jewish Ghetto is a particular highlight; options thin out considerably elsewhere.' },
  netherlands: { name: 'Netherlands', availabilityLevel: 'limited', note: 'Amsterdam has a historic Jewish community with a handful of kosher restaurants, delis, and a kosher grocery section; options are essentially nonexistent outside the capital.' },
  portugal: { name: 'Portugal', availabilityLevel: 'rare', note: "Portugal's small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  spain: { name: 'Spain', availabilityLevel: 'limited', note: 'Madrid and Barcelona have small but established Jewish communities with a real, if modest, number of kosher restaurants; options are essentially nonexistent elsewhere.' },
  sweden: { name: 'Sweden', availabilityLevel: 'rare', note: "Sweden's small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  switzerland: { name: 'Switzerland', availabilityLevel: 'limited', note: 'Zurich and Geneva have well-organized Jewish communities with a real, if modest, number of kosher restaurants and grocery sections; options are essentially nonexistent outside those cities.' },
  ireland: { name: 'Ireland', availabilityLevel: 'rare', note: "Ireland's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  'united-kingdom': { name: 'United Kingdom', availabilityLevel: 'good', note: 'The UK has one of the largest Jewish communities in Europe, and London in particular has a genuinely extensive kosher restaurant, bakery, and supermarket scene, concentrated in areas like Golders Green and Stamford Hill.' },
  turkey: { name: 'Turkey', availabilityLevel: 'limited', note: "Istanbul has a historic Sephardic Jewish community dating back centuries, with a real, if modest, number of kosher restaurants; options are essentially nonexistent outside the city." },
  japan: { name: 'Japan', availabilityLevel: 'limited', note: 'Chabad Houses in Tokyo and a few other cities serve kosher meals, largely catering to Israeli travelers and the local Jewish community; options remain genuinely limited outside those specific establishments.' },
  thailand: { name: 'Thailand', availabilityLevel: 'limited', note: "Bangkok and Chiang Mai have a notably active Chabad House network serving Thailand's large Israeli backpacker population — genuinely one of the better kosher scenes in Southeast Asia, though still limited to those specific spots." },
  indonesia: { name: 'Indonesia', availabilityLevel: 'rare', note: "Indonesia's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  singapore: { name: 'Singapore', availabilityLevel: 'rare', note: "Singapore has a small but historic Jewish community with a synagogue, though dedicated kosher restaurants are genuinely limited — self-catering or pre-packaged goods are a reliable fallback." },
  'south-korea': { name: 'South Korea', availabilityLevel: 'rare', note: "South Korea's small Jewish community and Chabad presence in Seoul offer very limited kosher options — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  'hong-kong': { name: 'Hong Kong', availabilityLevel: 'rare', note: 'Hong Kong has a small but established Jewish community with limited kosher options concentrated around specific community establishments — self-catering is a reliable fallback.' },
  vietnam: { name: 'Vietnam', availabilityLevel: 'rare', note: "Vietnam's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  philippines: { name: 'Philippines', availabilityLevel: 'rare', note: "The Philippines' small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  malaysia: { name: 'Malaysia', availabilityLevel: 'rare', note: "Malaysia's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  china: { name: 'China', availabilityLevel: 'rare', note: "China's small Jewish community (notably in Shanghai and Beijing, with some Chabad presence) offers very limited kosher options — self-catering is a reliable fallback outside those specific cities." },
  india: { name: 'India', availabilityLevel: 'limited', note: "Mumbai and Delhi have notably active Chabad Houses serving India's substantial Israeli backpacker traffic, offering genuinely findable kosher meals — options thin out considerably outside those specific establishments." },
  maldives: { name: 'Maldives', availabilityLevel: 'rare', note: "Dedicated kosher food is genuinely hard to find in the Maldives — some resorts catering heavily to Israeli tourists may accommodate requests, but this varies enormously by property." },
  taiwan: { name: 'Taiwan', availabilityLevel: 'rare', note: "Taiwan's small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  'sri-lanka': { name: 'Sri Lanka', availabilityLevel: 'rare', note: "Sri Lanka's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  cambodia: { name: 'Cambodia', availabilityLevel: 'rare', note: "Cambodia's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  australia: { name: 'Australia', availabilityLevel: 'good', note: 'Australia has well-established Jewish communities in Melbourne and Sydney, with genuinely good kosher restaurant, bakery, and supermarket availability in those cities.' },
  'new-zealand': { name: 'New Zealand', availabilityLevel: 'rare', note: "New Zealand's small Jewish community means dedicated kosher food is genuinely hard to find outside a handful of options in Auckland and Wellington — self-catering is a reliable fallback." },
  fiji: { name: 'Fiji', availabilityLevel: 'rare', note: "Fiji's very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  'french-polynesia': { name: 'French Polynesia', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  mexico: { name: 'Mexico', availabilityLevel: 'good', note: 'Mexico City has one of the largest and most well-organized Jewish communities in Latin America, with genuinely good kosher restaurant and supermarket availability, largely concentrated in specific neighborhoods like Polanco.' },
  'dominican-republic': { name: 'Dominican Republic', availabilityLevel: 'rare', note: 'A small Jewish community means dedicated kosher food is genuinely hard to find outside self-catering or asking specific hotels about accommodating requests.' },
  'puerto-rico': { name: 'Puerto Rico', availabilityLevel: 'rare', note: "Puerto Rico has a modest Jewish community with very limited kosher restaurant options — self-catering or pre-packaged kosher-certified goods are the reliable fallback." },
  bahamas: { name: 'Bahamas', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  jamaica: { name: 'Jamaica', availabilityLevel: 'rare', note: 'A small but historic Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  aruba: { name: 'Aruba', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  'turks-and-caicos': { name: 'Turks and Caicos', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  'st-lucia': { name: 'St. Lucia', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  'costa-rica': { name: 'Costa Rica', availabilityLevel: 'rare', note: 'A small but established Jewish community in San José supports very limited kosher options — self-catering is a reliable fallback elsewhere.' },
  panama: { name: 'Panama', availabilityLevel: 'limited', note: 'Panama City has a notably well-established Sephardic and Ashkenazi Jewish community with a real, if modest, number of kosher restaurants and a kosher grocery section — one of the better kosher scenes in Central America.' },
  belize: { name: 'Belize', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  'cayman-islands': { name: 'Cayman Islands', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  curacao: { name: 'Curaçao', availabilityLevel: 'rare', note: 'Curaçao has one of the oldest Jewish communities in the Americas, though it is small today — dedicated kosher restaurants are limited, but the historic synagogue is worth visiting regardless.' },
  canada: { name: 'Canada', availabilityLevel: 'good', note: 'Canada has well-established Jewish communities in Toronto and Montreal, with genuinely good kosher restaurant, bakery, and supermarket availability in those cities.' },
  'united-arab-emirates': { name: 'United Arab Emirates', availabilityLevel: 'limited', note: "Dubai has developed a genuinely notable kosher restaurant and hotel scene since the 2020 Abraham Accords normalized relations with Israel — a significant and fast-growing recent development, though still concentrated in specific establishments." },
  morocco: { name: 'Morocco', availabilityLevel: 'limited', note: 'Morocco has a historic Sephardic Jewish community, and cities like Casablanca and Marrakech have a real, if modest, number of kosher restaurants catering to both locals and the steady stream of Israeli tourists.' },
  'south-africa': { name: 'South Africa', availabilityLevel: 'good', note: 'South Africa has one of the largest and most well-organized Jewish communities in Africa, with genuinely good kosher restaurant and supermarket availability, especially in Johannesburg and Cape Town.' },
  qatar: { name: 'Qatar', availabilityLevel: 'rare', note: 'Qatar has essentially no established Jewish community and no dedicated kosher infrastructure — self-catering with pre-packaged kosher-certified goods is the only reliable option.' },
  israel: { name: 'Israel', availabilityLevel: 'widespread', note: "In Israel, kosher is the mainstream default — the significant majority of restaurants and virtually all supermarkets carry kosher-certified products, though a genuinely non-kosher dining scene exists too, especially in Tel Aviv." },
  tanzania: { name: 'Tanzania', availabilityLevel: 'rare', note: 'A very small Jewish community means dedicated kosher food is genuinely hard to find — self-catering or pre-packaged kosher-certified goods are the reliable fallback.' },
  kenya: { name: 'Kenya', availabilityLevel: 'rare', note: 'A small but established Jewish community in Nairobi supports very limited kosher options — self-catering is a reliable fallback elsewhere.' },
  argentina: { name: 'Argentina', availabilityLevel: 'good', note: 'Buenos Aires has the largest Jewish community in Latin America, with genuinely extensive kosher restaurant, bakery, and supermarket availability, especially in neighborhoods like Once and Belgrano.' },
  peru: { name: 'Peru', availabilityLevel: 'limited', note: "Lima and Cusco have notably active Chabad Houses serving Peru's substantial Israeli backpacker traffic, offering genuinely findable kosher meals; options thin out considerably outside those specific establishments." },
  chile: { name: 'Chile', availabilityLevel: 'limited', note: 'Santiago has a well-established Jewish community with a real, if modest, number of kosher restaurants and a kosher grocery section; options are essentially nonexistent outside the capital.' },
  colombia: { name: 'Colombia', availabilityLevel: 'rare', note: 'Bogotá has a modest Jewish community with very limited dedicated kosher restaurant options — self-catering or pre-packaged kosher-certified goods are a reliable fallback.' },
  brazil: { name: 'Brazil', availabilityLevel: 'limited', note: "São Paulo has a large and well-established Jewish community with a real number of kosher restaurants and a kosher grocery section, largely concentrated in specific neighborhoods; options thin out considerably elsewhere." },
  'united-states': { name: 'United States', availabilityLevel: 'good', note: 'The US has the largest Jewish population outside Israel, and cities like New York, Los Angeles, and Miami have genuinely extensive kosher restaurant, bakery, and supermarket infrastructure — smaller towns can be much more limited.' },
};

const AVAILABILITY_LABELS = {
  widespread: 'Widespread — the Mainstream Default',
  good: 'Good — Easy to Find in Major Cities',
  limited: 'Limited — Findable With Some Research',
  rare: 'Rare — Plan Ahead or Self-Cater',
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
// @route POST /api/tools/kosher-food-checker/calculate
// @access Public
exports.calculateKosherFood = (req, res) => {
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
// @route POST /api/tools/kosher-food-checker/pdf
// @access Public
exports.generateKosherFoodPdf = async (req, res) => {
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
      [email, firstName || null, 'kosher-food-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Kosher Food Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="kosher-food-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.availabilityLabel);

    pdfService.heading(doc, 'Tips for finding kosher food anywhere');
    pdfService.bulletList(doc, [
      'Chabad Houses operate in a surprising number of cities worldwide and often welcome travelers for kosher meals — check chabad.org for the nearest location before you go.',
      'Vegetarian and fish dishes prepared without shellfish are widely available fallback options in many cuisines, though they still require checking preparation and ingredients.',
      'Pre-packaged kosher-certified goods (look for a hechsher symbol) are increasingly available at larger international supermarkets, even in destinations with limited restaurant options.',
      'Self-catering with a kitchenette is a reliable backup in destinations with very limited options.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍽️ Your ${result.countryName} kosher food guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the kosher food availability check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond finding food? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send kosher-food-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateKosherFoodPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
