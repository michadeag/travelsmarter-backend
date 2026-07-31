const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Laundry access per destination for longer trips — where to get clothes
// washed outside of expensive hotel laundry. laundryLevel: 'cheap-and-
// common' (affordable drop-off wash-and-fold services are widely
// available and cheap) | 'self-service-common' (coin/self-service
// laundromats are widespread and easy to find) | 'limited' (laundry
// options exist but are less convenient or pricier — mainly scattered dry
// cleaners or small local shops) | 'hotel-only' (self-service or
// affordable outside laundry is essentially unavailable — hotel laundry,
// often expensive, is the practical option).
const COUNTRIES = {
  france: { name: 'France', laundryLevel: 'self-service-common', note: 'Self-service laundromats (laverie automatique) are widespread in French cities and towns, easy to find and use.' },
  austria: { name: 'Austria', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in most cities, though somewhat less common than in Germany.' },
  'czech-republic': { name: 'Czech Republic', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in Prague and other major cities.' },
  denmark: { name: 'Denmark', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available in Danish cities.' },
  germany: { name: 'Germany', laundryLevel: 'self-service-common', note: 'Self-service laundromats (Waschsalon) are widespread and easy to find in German cities.' },
  greece: { name: 'Greece', laundryLevel: 'limited', note: 'Dedicated self-service laundromats are less common — small local laundry services that wash and fold for you are the more typical option in tourist areas.' },
  hungary: { name: 'Hungary', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in Budapest and other major cities.' },
  iceland: { name: 'Iceland', laundryLevel: 'limited', note: 'Laundry options are genuinely limited outside Reykjavik — many guesthouses and Airbnbs include a washing machine, which is worth checking for ahead of time.' },
  italy: { name: 'Italy', laundryLevel: 'limited', note: 'Self-service laundromats (lavanderia a gettoni) exist but are less ubiquitous than in Northern Europe — small drop-off laundry services are common in tourist areas as an alternative.' },
  netherlands: { name: 'Netherlands', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available in Dutch cities.' },
  portugal: { name: 'Portugal', laundryLevel: 'limited', note: 'Dedicated self-service laundromats are less common — small local laundry services that wash and fold for you are the more typical option.' },
  spain: { name: 'Spain', laundryLevel: 'self-service-common', note: 'Self-service laundromats (lavanderías) are widely available in Spanish cities.' },
  sweden: { name: 'Sweden', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available in Swedish cities.' },
  switzerland: { name: 'Switzerland', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widespread and easy to find in Swiss cities and towns.' },
  ireland: { name: 'Ireland', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available, especially in Dublin and other cities.' },
  'united-kingdom': { name: 'United Kingdom', laundryLevel: 'self-service-common', note: 'Self-service launderettes are widely available, especially in cities.' },
  turkey: { name: 'Turkey', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off wash-and-fold laundry services are common in tourist areas, especially Istanbul, and generally inexpensive.' },
  japan: { name: 'Japan', laundryLevel: 'self-service-common', note: 'Coin laundromats are widespread and easy to use, even for non-Japanese speakers, with clear pictogram instructions.' },
  thailand: { name: 'Thailand', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off wash-and-fold laundry services (priced by the kilo) are extremely common, especially in backpacker and tourist areas, and genuinely cheap.' },
  indonesia: { name: 'Indonesia', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services are common, especially in Bali and other tourist areas, and genuinely cheap.' },
  singapore: { name: 'Singapore', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available across Singapore.' },
  'south-korea': { name: 'South Korea', laundryLevel: 'self-service-common', note: 'Coin laundromats are widespread and easy to use, even for non-Korean speakers.' },
  'hong-kong': { name: 'Hong Kong', laundryLevel: 'limited', note: 'Dedicated self-service laundromats are less common in dense urban Hong Kong — drop-off laundry and dry-cleaning shops are the more typical option, and prices run higher than in much of the rest of Asia.' },
  vietnam: { name: 'Vietnam', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off wash-and-fold laundry services (priced by the kilo) are extremely common, especially in tourist areas, and genuinely cheap.' },
  philippines: { name: 'Philippines', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services are common across the Philippines and genuinely cheap.' },
  malaysia: { name: 'Malaysia', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off wash-and-fold laundry services are common, especially in Kuala Lumpur and other tourist areas.' },
  china: { name: 'China', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services are common in Chinese cities, though coin self-service laundromats are less of a cultural fixture than in the West.' },
  india: { name: 'India', laundryLevel: 'cheap-and-common', note: 'Affordable laundry services (dhobi) are extremely common and cheap across India, including hotel-arranged pickup in many cities.' },
  maldives: { name: 'Maldives', laundryLevel: 'hotel-only', note: 'The resort-island format means outside laundry access is essentially nonexistent — resort laundry service (often pricey) is the only option.' },
  taiwan: { name: 'Taiwan', laundryLevel: 'self-service-common', note: 'Coin laundromats are widespread and easy to use across Taiwan.' },
  'sri-lanka': { name: 'Sri Lanka', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services are common in tourist areas and genuinely cheap.' },
  cambodia: { name: 'Cambodia', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off wash-and-fold laundry services (priced by the kilo) are common in tourist areas like Siem Reap and Phnom Penh.' },
  australia: { name: 'Australia', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available across Australian cities and towns.' },
  'new-zealand': { name: 'New Zealand', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available, including in smaller towns popular with road-trippers.' },
  fiji: { name: 'Fiji', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited given the resort-based nature of most trips — resort laundry service is the practical option.' },
  'french-polynesia': { name: 'French Polynesia', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited on most islands — resort laundry service, often pricey, is the practical option.' },
  mexico: { name: 'Mexico', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services (lavanderías, priced by the kilo) are common across Mexico and genuinely cheap.' },
  'dominican-republic': { name: 'Dominican Republic', laundryLevel: 'hotel-only', note: 'Most trips center on all-inclusive resorts, where resort laundry service is the practical option — outside access is limited near resort zones.' },
  'puerto-rico': { name: 'Puerto Rico', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in San Juan and other towns.' },
  bahamas: { name: 'Bahamas', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited given the resort-based nature of most trips — resort laundry service is the practical option.' },
  jamaica: { name: 'Jamaica', laundryLevel: 'limited', note: 'Laundry options exist in larger towns, but are less convenient than resort laundry service, which is common for typical trips.' },
  aruba: { name: 'Aruba', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited — resort laundry service is the practical option for most trips.' },
  'turks-and-caicos': { name: 'Turks and Caicos', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited given the small size of the islands — resort laundry service is the practical option.' },
  'st-lucia': { name: 'St. Lucia', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited — resort laundry service is the practical option for most trips.' },
  'costa-rica': { name: 'Costa Rica', laundryLevel: 'limited', note: 'Laundry services (lavanderías) exist in towns, but are less common in more remote eco-lodges — worth checking ahead if staying somewhere off the beaten path.' },
  panama: { name: 'Panama', laundryLevel: 'limited', note: 'Laundry services are available in Panama City and larger towns, with more limited access elsewhere.' },
  belize: { name: 'Belize', laundryLevel: 'limited', note: 'Laundry services exist in larger towns and on the more developed cayes, with genuinely limited access elsewhere.' },
  'cayman-islands': { name: 'Cayman Islands', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited — resort/hotel laundry service is the practical option.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', laundryLevel: 'hotel-only', note: 'Outside laundry access is genuinely limited — resort laundry service is the practical option for most trips.' },
  curacao: { name: 'Curaçao', laundryLevel: 'limited', note: 'Laundry services are available in Willemstad, with more limited access elsewhere on the island.' },
  canada: { name: 'Canada', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available across Canadian cities and towns.' },
  'united-arab-emirates': { name: 'United Arab Emirates', laundryLevel: 'limited', note: 'Laundry and dry-cleaning services are common in Dubai and Abu Dhabi, but coin self-service laundromats are rare — expect to pay for a drop-off service.' },
  morocco: { name: 'Morocco', laundryLevel: 'limited', note: 'Dedicated self-service laundromats are uncommon — small local laundry services and riad-arranged laundry are the more typical option.' },
  'south-africa': { name: 'South Africa', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in Cape Town, Johannesburg, and other major cities.' },
  qatar: { name: 'Qatar', laundryLevel: 'limited', note: 'Laundry and dry-cleaning services are common in Doha, but coin self-service laundromats are rare — expect to pay for a drop-off service.' },
  israel: { name: 'Israel', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in Tel Aviv, Jerusalem, and other cities.' },
  tanzania: { name: 'Tanzania', laundryLevel: 'hotel-only', note: 'Most trips center on safari lodges, where laundry service (often included or low-cost) is the practical option — outside access is essentially nonexistent in remote areas.' },
  kenya: { name: 'Kenya', laundryLevel: 'hotel-only', note: 'Most trips center on safari lodges, where laundry service (often included or low-cost) is the practical option — outside access is essentially nonexistent in remote areas.' },
  argentina: { name: 'Argentina', laundryLevel: 'self-service-common', note: 'Self-service laundromats (lavaderos) are available in Buenos Aires and other major cities.' },
  peru: { name: 'Peru', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services (priced by the kilo) are common in tourist areas like Cusco and Lima.' },
  chile: { name: 'Chile', laundryLevel: 'self-service-common', note: 'Self-service laundromats are available in Santiago and other major cities.' },
  colombia: { name: 'Colombia', laundryLevel: 'cheap-and-common', note: 'Affordable drop-off laundry services are common in Bogotá, Medellín, and other tourist areas.' },
  brazil: { name: 'Brazil', laundryLevel: 'limited', note: 'Dedicated self-service laundromats are less common — small local lavanderias that wash and fold for you are the more typical option.' },
  'united-states': { name: 'United States', laundryLevel: 'self-service-common', note: 'Self-service laundromats are widely available across US cities and towns, and many hotels also have coin-op laundry rooms.' },
};

const LAUNDRY_LABELS = {
  'cheap-and-common': 'Cheap & Common — Affordable Drop-Off Services',
  'self-service-common': 'Widely Available — Self-Service Laundromats',
  limited: 'Limited — Fewer Options, Plan Ahead',
  'hotel-only': 'Hotel Only — Outside Options Are Scarce',
};

const DISCLAIMER = "This reflects the general landscape at your destination, not a guarantee for your specific neighborhood or accommodation — many hotels, hostels, and vacation rentals offer their own laundry facilities regardless of what's available outside. Laundry pickup apps also increasingly cover major cities worldwide, worth checking even where the general landscape looks limited.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const laundryLabel = LAUNDRY_LABELS[data.laundryLevel];
  const headline = `${data.name}: ${laundryLabel}.`;

  return {
    country, countryName: data.name, laundryLevel: data.laundryLevel, laundryLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/laundry-checker/calculate
// @access Public
exports.calculateLaundry = (req, res) => {
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
// @route POST /api/tools/laundry-checker/pdf
// @access Public
exports.generateLaundryPdf = async (req, res) => {
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
      [email, firstName || null, 'laundry-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Laundry Access Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="laundry-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.laundryLabel);

    pdfService.heading(doc, 'General laundry tips for longer trips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Ask your accommodation directly, even at a budget guesthouse — many have an informal in-house laundry arrangement that never shows up in a search.',
      'Pack a small travel-size packet of laundry detergent and a universal sink stopper — a quick hand-wash in your room covers you for the days between proper laundry access.',
      'In "cheap-and-common" destinations, laundry is typically priced by the kilo and returned within 24 hours — budget accordingly if you\'re on a tight schedule.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧺 Your ${result.countryName} laundry guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the laundry access check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond laundry logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send laundry-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLaundryPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
