const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// How easy it is to find secure short-term luggage storage per
// destination — a genuine, recurring "what do I do with my bags for six
// hours" planning gap not covered by any other tool. availabilityLevel:
// 'excellent' (extensive official station/airport lockers plus strong
// app-based coverage — Bounce, Stasher, Nannybag, LuggageHero) | 'good'
// (readily available in major cities, real app-based options, less
// extensive than the top tier) | 'limited' (findable in the capital or
// main tourist areas, patchy coverage elsewhere) | 'sparse' (hard to
// find a dedicated service — hotel storage before/after your stay is
// usually the reliable fallback).
const COUNTRIES = {
  france: { name: 'France', availabilityLevel: 'excellent', note: 'Paris and other major cities have extensive train station lockers plus strong coverage from app-based services (Bounce, Nannybag, Stasher) that partner with local shops and hotels — genuinely one of the easiest countries to solve this problem.' },
  austria: { name: 'Austria', availabilityLevel: 'excellent', note: 'Vienna\'s main stations have lockers, and app-based services (Bounce, Nannybag) have solid coverage in major cities.' },
  'czech-republic': { name: 'Czech Republic', availabilityLevel: 'excellent', note: 'Prague has extensive luggage storage at the main train station plus strong app-based coverage (Bounce, Nannybag) throughout the historic center.' },
  denmark: { name: 'Denmark', availabilityLevel: 'excellent', note: 'Copenhagen Central Station has extensive lockers, and app-based services have good coverage in the city center.' },
  germany: { name: 'Germany', availabilityLevel: 'excellent', note: 'German train stations (Bahnhöfe) are famous for extensive, reliable luggage lockers, and app-based services add further coverage in major cities.' },
  greece: { name: 'Greece', availabilityLevel: 'excellent', note: 'Athens has good storage options near the main sights and metro stations, plus solid app-based coverage (Bounce) — a genuinely easy city to solve this in.' },
  hungary: { name: 'Hungary', availabilityLevel: 'excellent', note: 'Budapest has luggage storage at the main train stations plus strong app-based coverage (Bounce, Nannybag) throughout the city center.' },
  iceland: { name: 'Iceland', availabilityLevel: 'good', note: 'Reykjavík has a handful of dedicated storage locations and some app-based coverage (Bounce) — enough to solve the problem, though less extensive than continental Europe.' },
  italy: { name: 'Italy', availabilityLevel: 'excellent', note: 'Major Italian train stations have official "Kipoint" left-luggage counters, and app-based services (Bounce, Nannybag) add extensive additional coverage in Rome, Florence, Venice, and Milan.' },
  netherlands: { name: 'Netherlands', availabilityLevel: 'excellent', note: 'Amsterdam Centraal has extensive lockers, and app-based services have strong coverage throughout the city.' },
  portugal: { name: 'Portugal', availabilityLevel: 'excellent', note: 'Lisbon and Porto have good station-based storage plus strong app-based coverage (Bounce, Nannybag) in the historic centers.' },
  spain: { name: 'Spain', availabilityLevel: 'excellent', note: 'Major Spanish train stations have official lockers, and app-based services (Bounce, Nannybag) have extensive coverage in Madrid, Barcelona, and other major cities.' },
  sweden: { name: 'Sweden', availabilityLevel: 'excellent', note: 'Stockholm Central Station has extensive lockers, and app-based services have good coverage in the city center.' },
  switzerland: { name: 'Switzerland', availabilityLevel: 'excellent', note: 'Swiss train stations are famous for reliable, extensive luggage lockers — genuinely one of the easiest countries to solve this problem, even in smaller towns.' },
  ireland: { name: 'Ireland', availabilityLevel: 'excellent', note: 'Dublin has good station-based storage plus solid app-based coverage (Bounce, Nannybag) in the city center.' },
  'united-kingdom': { name: 'United Kingdom', availabilityLevel: 'excellent', note: 'London\'s major train stations have extensive official lockers (often with airport-style security screening), and app-based services add further coverage across the city and other major UK cities.' },
  turkey: { name: 'Turkey', availabilityLevel: 'good', note: 'Istanbul has luggage storage available near major sights and at the airports, with some app-based coverage — solid, though less extensive than Western Europe.' },
  japan: { name: 'Japan', availabilityLevel: 'excellent', note: 'Japan is famous for its extensive, ubiquitous coin-locker system at virtually every train station — a genuinely iconic piece of infrastructure that makes this a complete non-issue almost anywhere in the country.' },
  thailand: { name: 'Thailand', availabilityLevel: 'good', note: 'Bangkok has luggage storage at major stations, malls, and through app-based services (Bounce) — solid coverage in the capital, less so elsewhere.' },
  indonesia: { name: 'Indonesia', availabilityLevel: 'limited', note: 'Bali and Jakarta have some dedicated storage options and hotel-based storage, but coverage is patchy outside the main tourist areas.' },
  singapore: { name: 'Singapore', availabilityLevel: 'excellent', note: 'Changi Airport and major transit hubs have excellent, reliable locker facilities — one of the most convenient cities in Asia for this.' },
  'south-korea': { name: 'South Korea', availabilityLevel: 'excellent', note: 'Seoul\'s subway stations and Incheon Airport have extensive, reliable locker systems, similar in spirit to Japan\'s.' },
  'hong-kong': { name: 'Hong Kong', availabilityLevel: 'good', note: 'Hong Kong International Airport and major MTR stations have good storage options, plus some app-based coverage.' },
  vietnam: { name: 'Vietnam', availabilityLevel: 'good', note: 'Hanoi and Ho Chi Minh City have app-based storage options (Bounce) entering the market plus hotel-based storage — solid in the two major cities.' },
  philippines: { name: 'Philippines', availabilityLevel: 'good', note: 'Manila has some dedicated storage options at malls and transit hubs, plus hotel-based storage as a reliable fallback.' },
  malaysia: { name: 'Malaysia', availabilityLevel: 'good', note: 'Kuala Lumpur has storage options at the airport and some malls, plus hotel-based storage as a fallback.' },
  china: { name: 'China', availabilityLevel: 'limited', note: 'Major train stations and airports have official storage counters, though the process can involve more paperwork/ID checks than elsewhere — hotel storage is often the simpler option.' },
  india: { name: 'India', availabilityLevel: 'good', note: 'Indian Railways operates an official "cloak room" luggage storage system at most major train stations — a longstanding, reliable piece of infrastructure, plus hotel storage as a common fallback.' },
  maldives: { name: 'Maldives', availabilityLevel: 'sparse', note: 'Given the resort-island structure of tourism here, dedicated luggage storage services are essentially unnecessary — resorts and Malé airport handle it directly for guests.' },
  taiwan: { name: 'Taiwan', availabilityLevel: 'good', note: 'Taipei\'s train and metro stations have coin lockers similar in spirit to Japan\'s system, making this a straightforward city to solve in.' },
  'sri-lanka': { name: 'Sri Lanka', availabilityLevel: 'limited', note: 'Colombo has some hotel-based and airport storage options, but dedicated city-center services are limited compared to nearby Southeast Asian hubs.' },
  cambodia: { name: 'Cambodia', availabilityLevel: 'limited', note: 'Phnom Penh and Siem Reap have hotel-based storage as the main reliable option — dedicated city-center services are limited.' },
  australia: { name: 'Australia', availabilityLevel: 'good', note: 'Major Australian cities have app-based storage options (Bounce) plus airport paid storage — solid coverage in Sydney, Melbourne, and other major cities.' },
  'new-zealand': { name: 'New Zealand', availabilityLevel: 'good', note: 'Auckland and other main cities have some app-based storage coverage (Bounce) plus hotel-based storage as a reliable fallback.' },
  fiji: { name: 'Fiji', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel or resort storage before/after your stay is the reliable option.' },
  'french-polynesia': { name: 'French Polynesia', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel or resort storage before/after your stay is the reliable option.' },
  mexico: { name: 'Mexico', availabilityLevel: 'good', note: 'Mexico City and Cancún have some dedicated storage options plus hotel-based storage as a common, reliable fallback.' },
  'dominican-republic': { name: 'Dominican Republic', availabilityLevel: 'limited', note: 'Dedicated city-center storage services are limited — resort or hotel storage is the reliable option here.' },
  'puerto-rico': { name: 'Puerto Rico', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent outside the airport — hotel storage before/after your stay is the reliable option.' },
  bahamas: { name: 'Bahamas', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel or resort storage before/after your stay is the reliable option.' },
  jamaica: { name: 'Jamaica', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — resort storage before/after your stay is the reliable option.' },
  aruba: { name: 'Aruba', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel or resort storage before/after your stay is the reliable option.' },
  'turks-and-caicos': { name: 'Turks and Caicos', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — resort storage before/after your stay is the reliable option.' },
  'st-lucia': { name: 'St. Lucia', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — resort storage before/after your stay is the reliable option.' },
  'costa-rica': { name: 'Costa Rica', availabilityLevel: 'limited', note: 'San José has some hotel-based and airport storage options — dedicated city-center services are limited outside the capital.' },
  panama: { name: 'Panama', availabilityLevel: 'limited', note: 'Panama City has some hotel-based and mall storage options — dedicated services are limited compared to other Latin American capitals.' },
  belize: { name: 'Belize', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel storage before/after your stay is the reliable option.' },
  'cayman-islands': { name: 'Cayman Islands', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel or resort storage before/after your stay is the reliable option.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — resort storage before/after your stay is the reliable option.' },
  curacao: { name: 'Curaçao', availabilityLevel: 'sparse', note: 'Dedicated luggage storage services are essentially nonexistent — hotel storage before/after your stay is the reliable option.' },
  canada: { name: 'Canada', availabilityLevel: 'good', note: 'Major Canadian cities have app-based storage options (Bounce) plus airport paid lockers — solid coverage in Toronto, Vancouver, and other major cities.' },
  'united-arab-emirates': { name: 'United Arab Emirates', availabilityLevel: 'good', note: 'Dubai has dedicated storage services at malls and the airport, plus hotel-based options — solid coverage, especially in Dubai specifically.' },
  morocco: { name: 'Morocco', availabilityLevel: 'limited', note: 'Marrakech and Casablanca have some hotel-based and riad storage options — dedicated city-center services are limited.' },
  'south-africa': { name: 'South Africa', availabilityLevel: 'good', note: 'Cape Town and Johannesburg have some dedicated storage options at malls and the airport, plus hotel-based storage as a reliable fallback.' },
  qatar: { name: 'Qatar', availabilityLevel: 'sparse', note: 'Dedicated city-center luggage storage services are limited — Hamad International Airport has paid storage, and hotel storage is the reliable fallback elsewhere.' },
  israel: { name: 'Israel', availabilityLevel: 'good', note: 'Tel Aviv and Jerusalem have some dedicated storage options plus hotel-based storage as a reliable fallback, and Ben Gurion Airport offers paid storage.' },
  tanzania: { name: 'Tanzania', availabilityLevel: 'limited', note: 'Dar es Salaam and Zanzibar have hotel-based storage as the main reliable option — dedicated city-center services are limited, and many safari itineraries include storage as part of the package.' },
  kenya: { name: 'Kenya', availabilityLevel: 'limited', note: 'Nairobi has hotel-based storage as the main reliable option — dedicated city-center services are limited, and many safari itineraries include storage as part of the package.' },
  argentina: { name: 'Argentina', availabilityLevel: 'limited', note: 'Buenos Aires has some hotel-based and airport storage options — dedicated city-center services are limited compared to Europe.' },
  peru: { name: 'Peru', availabilityLevel: 'limited', note: 'Lima and Cusco have hotel-based storage as the main reliable option, especially useful for travelers doing the Inca Trail or Machu Picchu without full luggage.' },
  chile: { name: 'Chile', availabilityLevel: 'limited', note: 'Santiago has some hotel-based and airport storage options — dedicated city-center services are limited compared to Europe.' },
  colombia: { name: 'Colombia', availabilityLevel: 'limited', note: 'Bogotá and Cartagena have hotel-based storage as the main reliable option — dedicated city-center services are limited.' },
  brazil: { name: 'Brazil', availabilityLevel: 'limited', note: 'São Paulo and Rio de Janeiro have some hotel-based and airport storage options — dedicated city-center services are limited compared to Europe.' },
  'united-states': { name: 'United States', availabilityLevel: 'good', note: 'Major US cities have app-based storage options (Bounce, Vertoe) plus paid airport storage — solid coverage in New York, San Francisco, and other major cities, less so in smaller towns.' },
};

const AVAILABILITY_LABELS = {
  excellent: 'Excellent — Easy Almost Anywhere',
  good: 'Good — Solid in Major Cities',
  limited: 'Limited — Findable, With Effort',
  sparse: 'Sparse — Hotel Storage Is Your Best Bet',
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
// @route POST /api/tools/luggage-storage-checker/calculate
// @access Public
exports.calculateLuggageStorage = (req, res) => {
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
// @route POST /api/tools/luggage-storage-checker/pdf
// @access Public
exports.generateLuggageStoragePdf = async (req, res) => {
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
      [email, firstName || null, 'luggage-storage-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Luggage Storage Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="luggage-storage-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.availabilityLabel);

    pdfService.heading(doc, 'How to solve this anywhere');
    pdfService.bulletList(doc, [
      'App-based services (Bounce, Nannybag, Stasher, LuggageHero) let you book storage at partner shops, hotels, and cafes — check their coverage map for your specific city before you assume there\'s nothing available.',
      'Most hotels will store bags for free before check-in or after checkout, even if you\'re not staying there that specific night — it\'s always worth asking.',
      'Airport paid storage is usually available even where city-center options are limited — check your specific airport\'s website in advance.',
      'For official train station lockers, bring small change or a card, and note that many have size and time limits worth checking before you commit.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your ${result.countryName} luggage storage guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the luggage storage check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond your bags? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send luggage-storage-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLuggageStoragePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
