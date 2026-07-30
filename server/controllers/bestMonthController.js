const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Best month(s) to visit per destination, reused from Tool #1's 80-city
// list. This answers weather/crowd timing — distinct from Tool #1, which
// answers when to BOOK for the lowest airfare.
const DESTINATIONS = {
  paris: { name: 'Paris', bestLabel: 'April–June & September–October', bestReason: 'Mild temperatures and blooming parks without peak-summer crowds or prices.', avoidLabel: 'July–August', avoidReason: 'Peak tourist season — hot, crowded, and many small local businesses close for August holidays.' },
  london: { name: 'London', bestLabel: 'May–September', bestReason: "The warmest, driest stretch of London's famously changeable weather.", avoidLabel: 'November–February', avoidReason: 'Cold, frequently rainy, and daylight can run out before 4pm.' },
  rome: { name: 'Rome', bestLabel: 'April–May & September–October', bestReason: 'Comfortable sightseeing weather with noticeably shorter lines than summer.', avoidLabel: 'July–August', avoidReason: 'Extreme heat combined with the highest crowds of the year at major sites.' },
  barcelona: { name: 'Barcelona', bestLabel: 'May–June & September–October', bestReason: 'Warm enough for the beach without the peak-summer crush.', avoidLabel: 'July–August', avoidReason: 'Very hot, humid, and the busiest, most expensive stretch on the coast.' },
  amsterdam: { name: 'Amsterdam', bestLabel: 'April–May & June–August', bestReason: 'Tulip season runs April into May, followed by the mildest, longest days of summer.', avoidLabel: 'November–February', avoidReason: 'Cold, frequently rainy, and short daylight hours.' },
  lisbon: { name: 'Lisbon', bestLabel: 'March–May & September–October', bestReason: 'Warm and sunny without the peak heat and crowds of midsummer.', avoidLabel: 'July–August', avoidReason: 'Peak heat and the highest crowds and prices of the year.' },
  dublin: { name: 'Dublin', bestLabel: 'May–September', bestReason: "The mildest, driest window in a city that's rainy most of the year.", avoidLabel: 'December–February', avoidReason: 'Cold, wet, and daylight can run out well before 5pm.' },
  athens: { name: 'Athens', bestLabel: 'April–June & September–October', bestReason: 'Warm, pleasant sightseeing weather with far fewer crowds than summer.', avoidLabel: 'July–August', avoidReason: 'Extreme heat, often well above 90°F, alongside peak tourist crowds.' },
  reykjavik: { name: 'Reykjavik', bestLabel: 'June–August', bestReason: 'Mild temperatures, near-endless daylight, and every highland road accessible.', avoidLabel: 'October–February', avoidReason: 'Harsh weather, icy roads, and very short daylight — though this is peak Northern Lights season if that\'s the goal.' },
  madrid: { name: 'Madrid', bestLabel: 'April–June & September–October', bestReason: 'Comfortable temperatures before or after the harsh Spanish summer heat.', avoidLabel: 'July–August', avoidReason: 'Extreme heat, frequently over 95°F, and many locals leave the city.' },
  venice: { name: 'Venice', bestLabel: 'April–June & September–October', bestReason: 'Pleasant temperatures with noticeably fewer cruise-ship crowds than summer.', avoidLabel: 'July–August', avoidReason: 'Hot, humid, and the most crowded months — acqua alta flooding risk is separately highest November–January.' },
  prague: { name: 'Prague', bestLabel: 'April–May & September–October', bestReason: 'Mild, pleasant weather for walking the old town without peak crowds.', avoidLabel: 'July–August', avoidReason: 'The hottest and most crowded stretch of the year.' },
  vienna: { name: 'Vienna', bestLabel: 'April–June & September–October', bestReason: 'Comfortable sightseeing weather and a full cultural calendar.', avoidLabel: 'July–August', avoidReason: 'Hot, and the opera and many classical music venues pause their main season.' },
  berlin: { name: 'Berlin', bestLabel: 'May–September', bestReason: 'Warm enough for outdoor life in a city built around parks and beer gardens.', avoidLabel: 'November–February', avoidReason: 'Cold, grey, and short daylight hours.' },
  santorini: { name: 'Santorini', bestLabel: 'Late April–June & September–October', bestReason: 'Warm, sunny, and noticeably less crowded and expensive than peak summer.', avoidLabel: 'July–August', avoidReason: 'Extremely crowded and hot, with the highest hotel prices of the year.' },
  tokyo: { name: 'Tokyo', bestLabel: 'March–April & October–November', bestReason: 'Cherry blossoms in spring, colorful foliage in autumn, and comfortable temperatures both times.', avoidLabel: 'June–August', avoidReason: 'Rainy season into a hot, humid summer.' },
  bangkok: { name: 'Bangkok', bestLabel: 'November–February', bestReason: "The cool, dry season — as close to comfortable as Bangkok's climate gets.", avoidLabel: 'March–May', avoidReason: 'The hottest, most humid stretch of the year, often exceeding 100°F.' },
  bali: { name: 'Bali', bestLabel: 'April–October', bestReason: 'The dry season, with sunny days and lower humidity across the island.', avoidLabel: 'November–March', avoidReason: 'The wet season, with frequent heavy downpours and higher humidity.' },
  singapore: { name: 'Singapore', bestLabel: 'February–April', bestReason: "Singapore is hot and humid year-round, but this window sees the least rainfall.", avoidLabel: 'November–January', avoidReason: 'The Northeast Monsoon brings the heaviest, most frequent rain of the year.' },
  seoul: { name: 'Seoul', bestLabel: 'April–June & September–November', bestReason: 'Mild spring and autumn temperatures, with cherry blossoms or fall foliage.', avoidLabel: 'July–August', avoidReason: 'Hot, humid, and the peak of the monsoon rainy season.' },
  'hong-kong': { name: 'Hong Kong', bestLabel: 'October–December', bestReason: 'Comfortable temperatures and humidity, with clear skies more common.', avoidLabel: 'June–August', avoidReason: 'Hot, humid, and peak typhoon season.' },
  sydney: { name: 'Sydney', bestLabel: 'September–November & March–May', bestReason: "Mild spring or autumn weather (seasons are reversed south of the equator) without peak-summer crowds and prices.", avoidLabel: 'December–February', avoidReason: 'Peak summer heat coincides with the highest prices and crowds of the Australian holiday season.' },
  'ho-chi-minh-city': { name: 'Ho Chi Minh City', bestLabel: 'December–April', bestReason: 'The dry season, with sunny days and lower humidity.', avoidLabel: 'May–November', avoidReason: 'The wet season, with September and October typically the heaviest rain.' },
  manila: { name: 'Manila', bestLabel: 'December–February', bestReason: 'The cool, dry season — the most comfortable stretch of the year.', avoidLabel: 'June–November', avoidReason: 'The wet season, which also overlaps with peak typhoon risk.' },
  auckland: { name: 'Auckland', bestLabel: 'December–March', bestReason: 'Southern Hemisphere summer — warm, sunny, and the best beach weather.', avoidLabel: 'June–August', avoidReason: 'Cold, wet winter weather.' },
  phuket: { name: 'Phuket', bestLabel: 'November–March', bestReason: 'The dry season, with calm seas ideal for island-hopping and diving.', avoidLabel: 'May–October', avoidReason: 'The monsoon season brings rough seas, rain, and rougher boat crossings.' },
  'kuala-lumpur': { name: 'Kuala Lumpur', bestLabel: 'June–August', bestReason: 'A relatively drier stretch in a city that sees rain year-round.', avoidLabel: 'October–December', avoidReason: 'The Northeast Monsoon brings the heaviest rainfall of the year.' },
  beijing: { name: 'Beijing', bestLabel: 'April–May & September–October', bestReason: 'Mild temperatures and generally the clearest skies of the year.', avoidLabel: 'December–February', avoidReason: 'Bitterly cold, with air quality typically worse in winter.' },
  delhi: { name: 'Delhi', bestLabel: 'October–March', bestReason: 'Cool and dry, avoiding both the extreme summer heat and the monsoon.', avoidLabel: 'April–June', avoidReason: 'Extreme heat, frequently exceeding 100°F before the monsoon arrives.' },
  maldives: { name: 'Maldives', bestLabel: 'November–April', bestReason: 'The dry season, with calm seas and the best underwater visibility.', avoidLabel: 'May–October', avoidReason: 'The monsoon season brings rain and rougher seas, though resorts operate year-round with off-season discounts.' },
  cancun: { name: 'Cancún', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  'punta-cana': { name: 'Punta Cana', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  'san-juan': { name: 'San Juan', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  nassau: { name: 'Nassau', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  'montego-bay': { name: 'Montego Bay', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  'cabo-san-lucas': { name: 'Cabo San Lucas', bestLabel: 'November–May', bestReason: 'Warm, dry weather, plus whale-watching season from December through April.', avoidLabel: 'July–October', avoidReason: 'Hot, humid, and the highest hurricane risk on the Pacific side.' },
  aruba: { name: 'Aruba', bestLabel: 'April–August', bestReason: "The driest stretch on an island that's dry and outside the hurricane belt nearly year-round.", avoidLabel: 'October–December', avoidReason: 'The slightly wetter months, though conditions stay mild by Caribbean standards.' },
  'turks-and-caicos': { name: 'Turks and Caicos', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  'st-lucia': { name: 'St. Lucia', bestLabel: 'December–April', bestReason: 'The dry season, with lower humidity and calmer seas.', avoidLabel: 'June–November', avoidReason: 'The rainy season, which overlaps with hurricane season.' },
  'san-jose-costa-rica': { name: 'San José', bestLabel: 'December–April', bestReason: "Costa Rica's dry season, ideal for beaches and hiking alike.", avoidLabel: 'May–November', avoidReason: 'The rainy "green season" — lush and less crowded, but with frequent afternoon downpours.' },
  vancouver: { name: 'Vancouver', bestLabel: 'June–September', bestReason: 'The driest, warmest, and sunniest stretch of the year.', avoidLabel: 'November–February', avoidReason: "Cold and notoriously rainy, even by Pacific Northwest standards." },
  toronto: { name: 'Toronto', bestLabel: 'May–September', bestReason: 'Warm, comfortable weather for exploring the city outdoors.', avoidLabel: 'December–February', avoidReason: 'Very cold, with regular snow and freezing temperatures.' },
  montreal: { name: 'Montreal', bestLabel: 'June–September', bestReason: 'Warm summer weather and a packed festival calendar.', avoidLabel: 'December–February', avoidReason: 'Very cold, with heavy snow — though appealing if winter sports are the goal.' },
  'quebec-city': { name: 'Quebec City', bestLabel: 'June–September', bestReason: 'Warm, pleasant weather to explore the historic old town on foot.', avoidLabel: 'November–March', avoidReason: 'Very cold with heavy snow — though this is also when the famous Winter Carnival runs.' },
  calgary: { name: 'Calgary', bestLabel: 'June–September', bestReason: 'Warm, dry summer weather with easy access to the nearby Rockies.', avoidLabel: 'December–February', avoidReason: 'Very cold, with regular sub-freezing temperatures.' },
  dubai: { name: 'Dubai', bestLabel: 'November–March', bestReason: 'Warm and pleasant rather than punishingly hot — the most comfortable months by far.', avoidLabel: 'June–August', avoidReason: 'Extreme heat, frequently above 105°F with high humidity.' },
  marrakech: { name: 'Marrakech', bestLabel: 'March–May & September–November', bestReason: 'Warm, pleasant days without the extreme summer heat.', avoidLabel: 'July–August', avoidReason: 'Extreme heat, often exceeding 100°F.' },
  'cape-town': { name: 'Cape Town', bestLabel: 'November–March', bestReason: 'Southern Hemisphere summer — warm, dry, and the best beach weather.', avoidLabel: 'June–August', avoidReason: 'The wet, cooler winter — though it\'s prime season for whale watching along the coast.' },
  'rio-de-janeiro': { name: 'Rio de Janeiro', bestLabel: 'September–November & April–June', bestReason: 'Pleasant temperatures with fewer crowds and lower prices than the December–February peak.', avoidLabel: 'December–February', avoidReason: 'Peak heat, humidity, and the highest prices and crowds of the year around Carnival and New Year.' },
  'buenos-aires': { name: 'Buenos Aires', bestLabel: 'March–May & September–November', bestReason: 'Mild autumn or spring temperatures (seasons are reversed south of the equator).', avoidLabel: 'December–February', avoidReason: 'Hot, humid summer weather that coincides with many locals taking their own holidays.' },
  bogota: { name: 'Bogotá', bestLabel: 'December–March', bestReason: "The driest stretch of the year — Bogotá's high altitude keeps temperatures mild year-round regardless of season.", avoidLabel: 'April–May & October–November', avoidReason: 'The wettest months of the year.' },
  lima: { name: 'Lima', bestLabel: 'December–April', bestReason: "Warm and sunny — Lima's coastal desert climate is driest and brightest this time of year.", avoidLabel: 'June–September', avoidReason: 'The grey, foggy "garúa" season, with overcast skies most days even though it rarely rains.' },
  cusco: { name: 'Cusco', bestLabel: 'May–September', bestReason: 'The Andean dry season — the best conditions for Machu Picchu and the Inca Trail.', avoidLabel: 'December–March', avoidReason: 'The rainy season, with muddy trails; the Inca Trail itself closes for maintenance every February.' },
  santiago: { name: 'Santiago', bestLabel: 'September–November & March–May', bestReason: 'Mild spring or autumn temperatures, avoiding both summer heat and winter cold.', avoidLabel: 'June–August', avoidReason: 'Cold, occasionally rainy winter weather, with more smog trapped in the valley.' },
  cartagena: { name: 'Cartagena', bestLabel: 'December–April', bestReason: 'The driest stretch of the year along the Caribbean coast.', avoidLabel: 'August–November', avoidReason: 'The wettest months, with the highest hurricane-adjacent storm risk in the region.' },
  zurich: { name: 'Zurich', bestLabel: 'June–September', bestReason: 'Warm, sunny weather for exploring the lake and nearby mountains.', avoidLabel: 'December–February', avoidReason: 'Cold weather, though excellent if skiing in the nearby Alps is the goal.' },
  munich: { name: 'Munich', bestLabel: 'May–September', bestReason: 'Warm weather for beer gardens and day trips to the Alps.', avoidLabel: 'November–February', avoidReason: 'Cold and grey — Oktoberfest itself actually runs September into early October, and gets very crowded.' },
  milan: { name: 'Milan', bestLabel: 'April–June & September–October', bestReason: 'Comfortable temperatures for walking the city without peak-summer heat.', avoidLabel: 'July–August', avoidReason: 'Hot, and many locals leave the city, closing some shops and restaurants.' },
  copenhagen: { name: 'Copenhagen', bestLabel: 'May–September', bestReason: 'Mild, pleasant weather and the longest daylight hours of the year.', avoidLabel: 'November–February', avoidReason: 'Cold, dark, with daylight sometimes ending before 4pm.' },
  stockholm: { name: 'Stockholm', bestLabel: 'May–September', bestReason: 'Mild weather and famously long summer daylight hours.', avoidLabel: 'November–February', avoidReason: 'Cold, with very short daylight hours in the depths of winter.' },
  budapest: { name: 'Budapest', bestLabel: 'April–June & September–October', bestReason: 'Comfortable sightseeing weather without peak-summer heat and crowds.', avoidLabel: 'December–February', avoidReason: 'Cold and grey, though the Christmas markets are a draw in early December.' },
  istanbul: { name: 'Istanbul', bestLabel: 'April–May & September–October', bestReason: 'Comfortable, mild weather for exploring the city on foot.', avoidLabel: 'July–August', avoidReason: 'Hot, humid, and the most crowded stretch of the year.' },
  edinburgh: { name: 'Edinburgh', bestLabel: 'May–September', bestReason: "The mildest, driest window — though August's Fringe Festival is also the busiest and most expensive.", avoidLabel: 'November–February', avoidReason: 'Cold, dark, and often wet or windy.' },
  nice: { name: 'Nice', bestLabel: 'May–June & September–October', bestReason: 'Warm Riviera weather without the peak-summer crowds and prices.', avoidLabel: 'July–August', avoidReason: 'Hot, crowded, and the most expensive stretch of the year on the coast.' },
  taipei: { name: 'Taipei', bestLabel: 'October–December & March–April', bestReason: 'Mild, comfortable temperatures outside the hot, humid summer.', avoidLabel: 'May–September', avoidReason: 'Hot, humid, and peak typhoon season.' },
  colombo: { name: 'Colombo', bestLabel: 'December–March', bestReason: "The dry season on Sri Lanka's west and south coasts.", avoidLabel: 'May–August', avoidReason: 'The southwest monsoon brings heavy rain to the west coast (the east coast runs on the opposite pattern).' },
  'siem-reap': { name: 'Siem Reap', bestLabel: 'November–February', bestReason: 'The cool, dry season — the most comfortable conditions for exploring Angkor Wat.', avoidLabel: 'March–May', avoidReason: 'The hottest stretch of the year, often exceeding 95°F before the rains arrive.' },
  fiji: { name: 'Fiji', bestLabel: 'May–October', bestReason: 'The dry season, with lower humidity and calm seas.', avoidLabel: 'November–April', avoidReason: 'The wet season, which overlaps with cyclone risk.' },
  'bora-bora': { name: 'Bora Bora', bestLabel: 'May–October', bestReason: 'The dry season, with the calmest seas and best snorkeling visibility.', avoidLabel: 'November–April', avoidReason: 'The wet season, which overlaps with cyclone risk.' },
  'panama-city': { name: 'Panama City', bestLabel: 'December–April', bestReason: 'The dry season, with sunny days and lower humidity.', avoidLabel: 'May–November', avoidReason: 'The rainy season, with frequent afternoon downpours.' },
  'belize-city': { name: 'Belize City', bestLabel: 'December–April', bestReason: 'The dry season, with sunny days and lower humidity.', avoidLabel: 'June–November', avoidReason: 'The rainy season, which overlaps with hurricane season.' },
  'grand-cayman': { name: 'Grand Cayman', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  antigua: { name: 'Antigua', bestLabel: 'December–April', bestReason: 'Dry, less humid, and outside hurricane season.', avoidLabel: 'June–November', avoidReason: 'Atlantic hurricane season, alongside higher heat and humidity.' },
  curacao: { name: 'Curaçao', bestLabel: 'January–September', bestReason: "One of the driest islands in the Caribbean and outside the hurricane belt nearly year-round.", avoidLabel: 'October–December', avoidReason: 'The slightly wetter months, though conditions stay mild by Caribbean standards.' },
  doha: { name: 'Doha', bestLabel: 'November–March', bestReason: 'Warm and pleasant rather than punishingly hot.', avoidLabel: 'June–August', avoidReason: 'Extreme heat, frequently above 105°F.' },
  'tel-aviv': { name: 'Tel Aviv', bestLabel: 'April–May & September–October', bestReason: 'Warm, pleasant weather without peak-summer humidity.', avoidLabel: 'July–August', avoidReason: 'Hot and humid, the least comfortable stretch of the year.' },
  'abu-dhabi': { name: 'Abu Dhabi', bestLabel: 'November–March', bestReason: 'Warm and pleasant rather than punishingly hot.', avoidLabel: 'June–August', avoidReason: 'Extreme heat, frequently above 105°F with high humidity.' },
  zanzibar: { name: 'Zanzibar', bestLabel: 'June–October', bestReason: 'The dry season, with sunny days and lower humidity.', avoidLabel: 'March–May', avoidReason: 'The "masika" long rains — the wettest, heaviest-rain stretch of the year.' },
  nairobi: { name: 'Nairobi', bestLabel: 'June–October & January–February', bestReason: 'The dry season, and roughly aligned with the Great Migration in the Maasai Mara from July through October.', avoidLabel: 'March–May', avoidReason: 'The "long rains" — the wettest stretch of the year, which can make some safari roads difficult.' },
  casablanca: { name: 'Casablanca', bestLabel: 'April–May & September–October', bestReason: 'Warm, pleasant coastal weather without peak summer humidity.', avoidLabel: 'July–August', avoidReason: 'Hot and humid, the least comfortable stretch of the year on the coast.' },
};

function computeResult({ destination }) {
  const data = DESTINATIONS[destination];
  if (!data) throw new Error('Unknown destination');

  const headline = `Best time to visit ${data.name}: ${data.bestLabel}.`;

  return {
    destination, destinationName: data.name, bestLabel: data.bestLabel, bestReason: data.bestReason,
    avoidLabel: data.avoidLabel, avoidReason: data.avoidReason, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/best-month-checker/calculate
// @access Public
exports.calculateBestMonth = (req, res) => {
  try {
    const { destination } = req.body;
    if (!destination) return res.status(400).json({ success: false, error: 'destination is required' });
    const result = computeResult({ destination });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/best-month-checker/pdf
// @access Public
exports.generateBestMonthPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, destination } = req.body;
    if (!email || !destination) {
      return res.status(400).json({ success: false, error: 'email and destination are required' });
    }

    const result = computeResult({ destination });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'best-month-checker',
        JSON.stringify({ destination }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.destinationName} Best Time to Visit Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="best-month-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.bestReason);

    pdfService.highlightBox(doc, `Avoid if possible: ${result.avoidLabel}`);
    pdfService.paragraph(doc, result.avoidReason);

    pdfService.heading(doc, 'Planning around the weather');
    pdfService.bulletList(doc, [
      'Shoulder-season travel (just before or after the best window) often gets you 80% of the good weather at a fraction of peak pricing.',
      'Check this alongside airfare timing separately — the cheapest fares and the best weather don\'t always line up on the same dates.',
      'Book refundable or flexible-date accommodations if traveling near a seasonal transition, since exact weather shifts vary year to year.',
      'Pack for the shoulder-season swing, not just the average — mornings and evenings can differ sharply from midday even in a single trip.',
    ]);

    pdfService.addFooterCTA(doc, destination);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `☀️ Your ${result.destinationName} best-time-to-visit guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your timing check for ${result.destinationName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the weather? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${destination}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send best-month-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateBestMonthPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.DESTINATIONS = DESTINATIONS;
