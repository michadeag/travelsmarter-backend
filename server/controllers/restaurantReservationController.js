const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Restaurant reservation culture per destination — whether you need to
// book ahead or can reliably just walk in. Distinct from businessHoursController.js
// (when places are open, not booking norms) and touristTaxController.js
// (unrelated). reservationLevel: 'essential' (reservations are strongly
// expected for good dining — booking days to months ahead is normal for
// popular spots) | 'recommended' (walking in often works, but a
// reservation avoids waiting, especially evenings/weekends) | 'flexible'
// (a genuine mix — casual walk-in dining and reservation-only fine dining
// coexist, with no single dominant norm) | 'walk-in-friendly' (walk-in
// culture dominates for most dining; reservations are rarely needed).
const COUNTRIES = {
  france: { name: 'France', reservationLevel: 'essential', note: 'Good restaurants, especially in Paris, routinely book up for dinner — reserving a few days ahead (longer for anywhere well-reviewed) is the norm, not the exception.' },
  austria: { name: 'Austria', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner — especially on weekends or at well-known spots — avoids a wait.' },
  'czech-republic': { name: 'Czech Republic', reservationLevel: 'flexible', note: 'Casual walk-in dining is common in Prague, though popular or higher-end restaurants are worth booking a day or two ahead.' },
  denmark: { name: 'Denmark', reservationLevel: 'essential', note: "Copenhagen's dining scene is genuinely reservation-driven — top-tier restaurants can book out weeks or months ahead, and even solid mid-range spots fill up on weekends." },
  germany: { name: 'Germany', reservationLevel: 'recommended', note: 'Walking in generally works, but reserving ahead for dinner at popular restaurants, especially on weekends, is a good idea.' },
  greece: { name: 'Greece', reservationLevel: 'flexible', note: 'Casual taverna dining is very walk-in friendly — reserving ahead matters mainly for well-known restaurants during peak summer season.' },
  hungary: { name: 'Hungary', reservationLevel: 'flexible', note: 'Walk-in dining is common in Budapest, though reserving ahead for well-reviewed restaurants on weekends is a good idea.' },
  iceland: { name: 'Iceland', reservationLevel: 'recommended', note: 'Reykjavik has a relatively small restaurant scene for its tourist volume — booking ahead for dinner, especially in peak season, meaningfully improves your odds.' },
  italy: { name: 'Italy', reservationLevel: 'recommended', note: 'Walk-in dining works at many trattorias, but reserving ahead for well-known restaurants, especially in Rome, Florence, and Venice, avoids a real wait.' },
  netherlands: { name: 'Netherlands', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner in Amsterdam, especially on weekends, is worth doing for popular spots.' },
  portugal: { name: 'Portugal', reservationLevel: 'flexible', note: 'Casual walk-in dining is common — reserving ahead matters mainly for well-known restaurants in Lisbon and Porto during peak season.' },
  spain: { name: 'Spain', reservationLevel: 'flexible', note: 'Spaniards dine late, and walk-in culture is strong for casual tapas bars — reserving ahead matters more for well-known or higher-end restaurants, especially on weekends.' },
  sweden: { name: 'Sweden', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at popular Stockholm restaurants, especially on weekends, avoids a wait.' },
  switzerland: { name: 'Switzerland', reservationLevel: 'recommended', note: 'Walking in generally works, but reserving ahead for dinner at well-known restaurants is a good idea, especially in cities.' },
  ireland: { name: 'Ireland', reservationLevel: 'recommended', note: 'Walking in often works at pubs, but reserving ahead for dinner at well-reviewed restaurants, especially in Dublin on weekends, avoids a wait.' },
  'united-kingdom': { name: 'United Kingdom', reservationLevel: 'recommended', note: 'Walking in often works, but London\'s popular restaurants genuinely fill up — reserving a few days ahead for anywhere well-reviewed is worth doing.' },
  turkey: { name: 'Turkey', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining is the norm across most of Turkey — reservations are rarely needed outside a handful of high-end Istanbul restaurants.' },
  japan: { name: 'Japan', reservationLevel: 'essential', note: 'Many of the best restaurants, especially sushi and kaiseki spots, require reservations booked days to months ahead — some genuinely cannot be visited without one, even for tourists.' },
  thailand: { name: 'Thailand', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining, including at excellent street food stalls, is the overwhelming norm — reservations matter mainly for a small number of high-end restaurants.' },
  indonesia: { name: 'Indonesia', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining is the norm across most of Indonesia — reservations matter mainly for a handful of well-known restaurants in Bali or Jakarta.' },
  singapore: { name: 'Singapore', reservationLevel: 'flexible', note: 'Hawker centers are entirely walk-in, but Singapore also has a real reservation-driven fine-dining scene — book ahead for anything higher-end.' },
  'south-korea': { name: 'South Korea', reservationLevel: 'flexible', note: 'Casual walk-in dining is common, though popular or well-known restaurants in Seoul are worth booking ahead, especially for dinner.' },
  'hong-kong': { name: 'Hong Kong', reservationLevel: 'flexible', note: 'Walk-in dining works at most casual spots, though well-known restaurants, especially dim sum on weekends, are worth booking ahead.' },
  vietnam: { name: 'Vietnam', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining, especially at street food stalls and casual restaurants, is the overwhelming norm across Vietnam.' },
  philippines: { name: 'Philippines', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining is the norm across most of the Philippines — reservations matter mainly for a small number of higher-end restaurants in Manila.' },
  malaysia: { name: 'Malaysia', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining, especially at hawker centers and casual restaurants, is the overwhelming norm across Malaysia.' },
  china: { name: 'China', reservationLevel: 'flexible', note: 'Walk-in dining is common, though popular restaurants, especially around meal times in major cities, can involve real waits — a reservation or arriving early helps.' },
  india: { name: 'India', reservationLevel: 'flexible', note: 'Walk-in dining is common across most of India, though well-known restaurants in major cities are worth booking ahead, especially for dinner.' },
  maldives: { name: 'Maldives', reservationLevel: 'essential', note: "Resort dining is typically pre-arranged as part of your stay, and specialty restaurants within resorts often require booking a specific slot in advance." },
  taiwan: { name: 'Taiwan', reservationLevel: 'flexible', note: 'Walk-in dining, especially at night markets, is common, though well-known sit-down restaurants in Taipei are worth booking ahead.' },
  'sri-lanka': { name: 'Sri Lanka', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining is the norm across most of Sri Lanka — reservations matter mainly for a small number of higher-end hotel restaurants.' },
  cambodia: { name: 'Cambodia', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining is the norm across most of Cambodia — reservations are rarely needed outside a handful of higher-end restaurants.' },
  australia: { name: 'Australia', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at popular restaurants, especially on weekends, is a good idea in major cities.' },
  'new-zealand': { name: 'New Zealand', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at well-known restaurants, especially on weekends, is a good idea.' },
  fiji: { name: 'Fiji', reservationLevel: 'essential', note: 'Resort dining is typically pre-arranged as part of your stay, and specialty restaurants within resorts often require booking a specific slot in advance.' },
  'french-polynesia': { name: 'French Polynesia', reservationLevel: 'essential', note: "Dining options are genuinely limited outside resorts, and resort restaurants often require booking a specific slot in advance." },
  mexico: { name: 'Mexico', reservationLevel: 'flexible', note: 'Walk-in dining is common, especially for casual and street food, though well-known restaurants in Mexico City are worth booking ahead, especially on weekends.' },
  'dominican-republic': { name: 'Dominican Republic', reservationLevel: 'essential', note: 'Most trips center on all-inclusive resorts, where specialty restaurants require booking a specific dinner slot in advance — walk-in availability is limited.' },
  'puerto-rico': { name: 'Puerto Rico', reservationLevel: 'flexible', note: 'Walk-in dining is common in San Juan, though well-known restaurants are worth booking ahead, especially on weekends.' },
  bahamas: { name: 'Bahamas', reservationLevel: 'essential', note: 'Resort dining is typically pre-arranged, and specialty restaurants within resorts often require booking a specific slot in advance.' },
  jamaica: { name: 'Jamaica', reservationLevel: 'essential', note: 'Most trips center on all-inclusive resorts, where specialty restaurants require booking a specific dinner slot in advance — walk-in availability is limited.' },
  aruba: { name: 'Aruba', reservationLevel: 'essential', note: 'Resort dining is typically pre-arranged, and popular independent restaurants in Aruba also fill up — booking ahead is genuinely worth it.' },
  'turks-and-caicos': { name: 'Turks and Caicos', reservationLevel: 'essential', note: 'Dining options are genuinely limited, and both resort and independent restaurants often require booking a specific slot in advance.' },
  'st-lucia': { name: 'St. Lucia', reservationLevel: 'essential', note: 'Resort dining is typically pre-arranged, and specialty restaurants within resorts often require booking a specific slot in advance.' },
  'costa-rica': { name: 'Costa Rica', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining, especially at casual sodas (local eateries), is the norm across most of Costa Rica.' },
  panama: { name: 'Panama', reservationLevel: 'flexible', note: 'Walk-in dining is common, though well-known restaurants in Panama City are worth booking ahead, especially on weekends.' },
  belize: { name: 'Belize', reservationLevel: 'walk-in-friendly', note: 'Walk-in dining is the norm across most of Belize — reservations matter mainly for a handful of higher-end resort restaurants.' },
  'cayman-islands': { name: 'Cayman Islands', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at popular restaurants, especially on weekends, is a good idea.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', reservationLevel: 'essential', note: 'Resort dining is typically pre-arranged, and specialty restaurants within resorts often require booking a specific slot in advance.' },
  curacao: { name: 'Curaçao', reservationLevel: 'flexible', note: 'Walk-in dining is common in Willemstad, though well-known restaurants are worth booking ahead, especially on weekends.' },
  canada: { name: 'Canada', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at popular restaurants, especially on weekends, is a good idea in major cities.' },
  'united-arab-emirates': { name: 'United Arab Emirates', reservationLevel: 'recommended', note: "Walking in works at many places, but Dubai's well-known restaurants genuinely fill up — reserving ahead is worth doing for anywhere popular." },
  morocco: { name: 'Morocco', reservationLevel: 'flexible', note: 'Walk-in dining is common, especially in medinas, though well-known restaurants in Marrakech are worth booking ahead, especially in peak season.' },
  'south-africa': { name: 'South Africa', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at popular restaurants in Cape Town and Johannesburg, especially on weekends, is a good idea.' },
  qatar: { name: 'Qatar', reservationLevel: 'recommended', note: "Walking in works at many places, but Doha's well-known restaurants can fill up — reserving ahead is worth doing for anywhere popular." },
  israel: { name: 'Israel', reservationLevel: 'flexible', note: 'Walk-in dining is common in Tel Aviv and Jerusalem, though well-known restaurants are worth booking ahead, especially on weekends.' },
  tanzania: { name: 'Tanzania', reservationLevel: 'essential', note: 'Safari lodge dining is typically pre-arranged as part of your stay, with set meal times and no real walk-in alternative in remote areas.' },
  kenya: { name: 'Kenya', reservationLevel: 'essential', note: 'Safari lodge dining is typically pre-arranged as part of your stay, with set meal times and no real walk-in alternative in remote areas.' },
  argentina: { name: 'Argentina', reservationLevel: 'flexible', note: 'Argentines dine very late, and walk-in culture is strong for casual parrillas — reserving ahead matters more for well-known restaurants in Buenos Aires.' },
  peru: { name: 'Peru', reservationLevel: 'essential', note: "Lima's top restaurants are genuine food-tourism destinations, and the best-known ones can book out weeks or months ahead — plan accordingly if fine dining is a priority." },
  chile: { name: 'Chile', reservationLevel: 'flexible', note: 'Walk-in dining is common in Santiago, though well-known restaurants are worth booking ahead, especially on weekends.' },
  colombia: { name: 'Colombia', reservationLevel: 'flexible', note: 'Walk-in dining is common in Bogotá and Medellín, though well-known restaurants are worth booking ahead, especially on weekends.' },
  brazil: { name: 'Brazil', reservationLevel: 'flexible', note: 'Walk-in dining is common, especially for casual and churrascaria-style dining, though well-known restaurants are worth booking ahead, especially on weekends.' },
  'united-states': { name: 'United States', reservationLevel: 'recommended', note: 'Walking in often works, but reserving ahead for dinner at popular restaurants, especially on weekends, is a good idea in major cities.' },
};

const RESERVATION_LABELS = {
  essential: 'Essential — Book Ahead, Especially Anywhere Good',
  recommended: "Recommended — Walk-In Works, But Booking Helps",
  flexible: 'Flexible — Mix of Walk-In and Reservation Culture',
  'walk-in-friendly': 'Walk-In Friendly — Reservations Rarely Needed',
};

const DISCLAIMER = "This reflects general norms, not a guarantee for any specific restaurant — trends shift, and any genuinely popular or newly opened place can require a reservation regardless of the destination's overall culture. When a specific restaurant matters to your trip, check its own booking policy directly.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const reservationLabel = RESERVATION_LABELS[data.reservationLevel];
  const headline = `${data.name}: ${reservationLabel}.`;

  return {
    country, countryName: data.name, reservationLevel: data.reservationLevel, reservationLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/restaurant-reservation-checker/calculate
// @access Public
exports.calculateRestaurantReservation = (req, res) => {
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
// @route POST /api/tools/restaurant-reservation-checker/pdf
// @access Public
exports.generateRestaurantReservationPdf = async (req, res) => {
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
      [email, firstName || null, 'restaurant-reservation-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Restaurant Reservation Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="restaurant-reservation-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.reservationLabel);

    pdfService.heading(doc, 'General reservation tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If you have a specific restaurant in mind, especially a well-reviewed or newly opened one, check its booking policy directly rather than relying on the destination\'s general culture.',
      'Many popular restaurants release reservations on a rolling window (30-90 days out) — if a specific place matters to your trip, mark your calendar for when bookings open.',
      'Even in walk-in-friendly destinations, arriving right at opening or well before typical peak dinner hours (7-9pm in most places) meaningfully improves your odds at popular spots.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍽️ Your ${result.countryName} restaurant reservation guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the restaurant reservation check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond restaurant culture? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send restaurant-reservation-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateRestaurantReservationPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
