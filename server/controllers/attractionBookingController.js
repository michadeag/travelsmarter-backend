const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Advance-booking norms for major tourist attractions per destination —
// distinct from restaurantReservationController.js (dining, not sights)
// and shortTermRentalController.js (accommodation regulation). bookingLevel:
// 'essential' (marquee attractions require advance booking or permits,
// sometimes weeks or months ahead — plan before you land, not after) |
// 'recommended' (walk-up often works, but advance booking avoids real
// lines or sold-out situations at popular sites) | 'flexible' (a genuine
// mix — a few marquee sites need booking, most things are walk-up) |
// 'walk-up' (most attractions are walk-up friendly; advance booking is
// rarely needed).
const COUNTRIES = {
  france: { name: 'France', bookingLevel: 'essential', note: "The Louvre, Eiffel Tower, and Versailles all use timed-entry advance booking — popular slots can sell out weeks ahead in peak season, so book before you land, not after." },
  austria: { name: 'Austria', bookingLevel: 'recommended', note: 'Walk-up entry works at most sites, but booking ahead for Schönbrunn Palace or the Vienna State Opera avoids real lines and sold-out shows.' },
  'czech-republic': { name: 'Czech Republic', bookingLevel: 'flexible', note: 'Prague Castle and most sights are walk-up friendly — a few popular guided tours benefit from advance booking, especially in peak season.' },
  denmark: { name: 'Denmark', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with a few popular sites benefiting from advance tickets in peak summer season.' },
  germany: { name: 'Germany', bookingLevel: 'recommended', note: 'Walk-up entry works at most sites, but booking ahead for Neuschwanstein Castle and other marquee attractions avoids real lines, especially in summer.' },
  greece: { name: 'Greece', bookingLevel: 'recommended', note: 'The Acropolis now uses timed-entry ticketing, especially in peak season — booking ahead is genuinely worth it to avoid both lines and sold-out slots.' },
  hungary: { name: 'Hungary', bookingLevel: 'flexible', note: 'Most attractions in Budapest are walk-up friendly, with a few popular tours benefiting from advance booking.' },
  iceland: { name: 'Iceland', bookingLevel: 'recommended', note: 'Popular experiences like the Blue Lagoon require advance booking with a set time slot — walk-up isn\'t an option there, though most other sights are open access.' },
  italy: { name: 'Italy', bookingLevel: 'essential', note: 'The Colosseum, Vatican Museums, and Uffizi Gallery all require advance timed-entry booking — popular slots sell out days to weeks ahead, so book before you land.' },
  netherlands: { name: 'Netherlands', bookingLevel: 'essential', note: 'The Anne Frank House and Rijksmuseum both require advance timed tickets that routinely sell out weeks ahead — book as early as you can, ideally before your trip.' },
  portugal: { name: 'Portugal', bookingLevel: 'flexible', note: 'Most attractions in Lisbon and Porto are walk-up friendly, with a few popular tours benefiting from advance booking in peak season.' },
  spain: { name: 'Spain', bookingLevel: 'essential', note: 'The Sagrada Família and Alhambra both require advance timed-entry booking — popular dates sell out weeks ahead, especially for the Alhambra, so book before you land.' },
  sweden: { name: 'Sweden', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with a few popular sites benefiting from advance tickets in peak summer season.' },
  switzerland: { name: 'Switzerland', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, though popular mountain excursions (Jungfraujoch, Matterhorn viewpoints) benefit from advance planning around weather and crowds.' },
  ireland: { name: 'Ireland', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with a few popular sites like the Cliffs of Moher visitor experience benefiting from advance tickets.' },
  'united-kingdom': { name: 'United Kingdom', bookingLevel: 'recommended', note: 'Walk-up entry works at most sites, but booking ahead for the Tower of London, London Eye, and other marquee attractions avoids real lines.' },
  turkey: { name: 'Turkey', bookingLevel: 'flexible', note: 'Most attractions, including Istanbul\'s major mosques and historic sites, are walk-up friendly, with a few popular experiences (hot air ballooning in Cappadocia) requiring advance booking.' },
  japan: { name: 'Japan', bookingLevel: 'recommended', note: "Most temples and shrines are walk-up friendly, but popular modern attractions (teamLab exhibits) and some seasonal experiences require advance online booking that can sell out." },
  thailand: { name: 'Thailand', bookingLevel: 'walk-up', note: 'Most temples and attractions are walk-up friendly — advance booking is rarely needed outside of a few specific tours.' },
  indonesia: { name: 'Indonesia', bookingLevel: 'recommended', note: 'Most sites are walk-up friendly, but the popular Borobudur sunrise tour requires advance booking with a limited number of daily slots.' },
  singapore: { name: 'Singapore', bookingLevel: 'recommended', note: 'Walk-up entry works at most attractions, but booking ahead for Gardens by the Bay and other popular experiences avoids lines, especially on weekends.' },
  'south-korea': { name: 'South Korea', bookingLevel: 'flexible', note: 'Most palaces and attractions in Seoul are walk-up friendly, with a few popular experiences benefiting from advance booking.' },
  'hong-kong': { name: 'Hong Kong', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with Hong Kong Disneyland and a few other popular sites benefiting from advance tickets.' },
  vietnam: { name: 'Vietnam', bookingLevel: 'walk-up', note: 'Most attractions are walk-up friendly — advance booking is rarely needed outside of specific multi-day tours (like Ha Long Bay cruises).' },
  philippines: { name: 'Philippines', bookingLevel: 'walk-up', note: 'Most attractions are walk-up friendly — advance booking is rarely needed outside of specific island-hopping or diving tours.' },
  malaysia: { name: 'Malaysia', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with a few popular experiences (like certain cave tours) benefiting from advance booking.' },
  china: { name: 'China', bookingLevel: 'essential', note: "Many major sites — the Great Wall, the Forbidden City, and others — now require advance online booking with daily visitor caps, and popular dates can sell out. Plan and book before you land." },
  india: { name: 'India', bookingLevel: 'essential', note: "The Taj Mahal requires an advance ticket with a daily visitor cap, and many other major monuments have moved to online-only ticketing — book ahead rather than assuming walk-up entry is available." },
  maldives: { name: 'Maldives', bookingLevel: 'walk-up', note: 'There are few formal "attractions" to book — excursions and activities are typically arranged directly through your resort, with no separate advance booking needed.' },
  taiwan: { name: 'Taiwan', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with a few popular experiences (like certain national park trails requiring permits) needing advance planning.' },
  'sri-lanka': { name: 'Sri Lanka', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with entry tickets typically purchased on-site rather than needing advance booking.' },
  cambodia: { name: 'Cambodia', bookingLevel: 'recommended', note: 'Angkor Wat passes are purchased on-site or online but rarely sell out — arriving early for the popular sunrise viewing is more important than advance booking itself.' },
  australia: { name: 'Australia', bookingLevel: 'recommended', note: 'Walk-up works at many sites, but popular experiences like Uluru sunrise tours and Great Barrier Reef trips benefit genuinely from advance booking, especially in peak season.' },
  'new-zealand': { name: 'New Zealand', bookingLevel: 'recommended', note: 'Walk-up works at many sites, but popular experiences like the Milford Sound cruise and Great Walks huts benefit genuinely from advance booking, especially in peak season.' },
  fiji: { name: 'Fiji', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort, with no separate advance booking typically needed.' },
  'french-polynesia': { name: 'French Polynesia', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  mexico: { name: 'Mexico', bookingLevel: 'recommended', note: 'Walk-up entry works at most sites, but booking ahead for Chichén Itzá and Teotihuacán is increasingly worthwhile to skip lines, especially in peak season.' },
  'dominican-republic': { name: 'Dominican Republic', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort, with no separate advance booking typically needed.' },
  'puerto-rico': { name: 'Puerto Rico', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with El Yunque National Forest and a few popular tours benefiting from advance planning.' },
  bahamas: { name: 'Bahamas', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort, with no separate advance booking typically needed.' },
  jamaica: { name: 'Jamaica', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort, with no separate advance booking typically needed.' },
  aruba: { name: 'Aruba', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  'turks-and-caicos': { name: 'Turks and Caicos', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  'st-lucia': { name: 'St. Lucia', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  'costa-rica': { name: 'Costa Rica', bookingLevel: 'recommended', note: 'Popular national parks like Manuel Antonio now cap daily visitors — advance booking is genuinely worth it in peak season to guarantee entry.' },
  panama: { name: 'Panama', bookingLevel: 'flexible', note: 'Most attractions are walk-up friendly, with a few popular tours benefiting from advance booking.' },
  belize: { name: 'Belize', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  'cayman-islands': { name: 'Cayman Islands', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  curacao: { name: 'Curaçao', bookingLevel: 'walk-up', note: 'Most activities are arranged directly through your resort or a local operator on-site, with no separate advance booking typically needed.' },
  canada: { name: 'Canada', bookingLevel: 'recommended', note: 'Walk-up works at many sites, but popular national parks like Banff and Jasper increasingly require advance parking or trail reservations in peak season.' },
  'united-arab-emirates': { name: 'United Arab Emirates', bookingLevel: 'essential', note: 'The Burj Khalifa and Museum of the Future both use advance timed-entry booking, and popular slots routinely sell out — book before you land, not after.' },
  morocco: { name: 'Morocco', bookingLevel: 'flexible', note: 'Most attractions and medina sites are walk-up friendly, with a few popular guided tours benefiting from advance booking.' },
  'south-africa': { name: 'South Africa', bookingLevel: 'recommended', note: 'Robben Island tours require advance booking and can sell out, and popular safari lodges book up well ahead of peak season travel dates.' },
  qatar: { name: 'Qatar', bookingLevel: 'flexible', note: 'Most attractions in Doha are walk-up friendly, with a few popular museums benefiting from advance tickets on busy days.' },
  israel: { name: 'Israel', bookingLevel: 'recommended', note: 'Most sites are walk-up friendly, though arriving early or booking the Masada cable car in advance helps avoid the midday heat and crowds.' },
  tanzania: { name: 'Tanzania', bookingLevel: 'essential', note: 'Safari and national park visits require advance booking and permits arranged through a tour operator — the Serengeti and Ngorongoro Crater both have real capacity limits, so plan well ahead.' },
  kenya: { name: 'Kenya', bookingLevel: 'essential', note: 'Safari and national park visits require advance booking and permits arranged through a tour operator — popular parks like the Maasai Mara have real capacity limits, especially during the wildebeest migration.' },
  argentina: { name: 'Argentina', bookingLevel: 'recommended', note: 'Walk-up works at most sites, but the Perito Moreno Glacier boat tours and other popular Patagonia experiences benefit genuinely from advance booking in peak season.' },
  peru: { name: 'Peru', bookingLevel: 'essential', note: 'Machu Picchu requires an advance permit with a daily visitor cap that routinely sells out weeks to months ahead in peak season — this is one of the world\'s most famous "you must book ahead" attractions, so plan early.' },
  chile: { name: 'Chile', bookingLevel: 'recommended', note: 'Popular Torres del Paine treks and campsites in Patagonia require advance booking and permits, especially in peak season — plan ahead if hiking is part of your trip.' },
  colombia: { name: 'Colombia', bookingLevel: 'recommended', note: 'Most attractions are walk-up friendly, but the popular Ciudad Perdida (Lost City) trek requires advance booking through a licensed tour operator.' },
  brazil: { name: 'Brazil', bookingLevel: 'recommended', note: 'Christ the Redeemer and Iguazu Falls both benefit genuinely from advance tickets, especially in peak season, to avoid real lines and transportation limits.' },
  'united-states': { name: 'United States', bookingLevel: 'essential', note: "Many popular national parks (Yosemite, Zion, Arches) now require timed-entry reservations in peak season, and marquee attractions like the Statue of Liberty and Alcatraz routinely sell out — book well before you land." },
};

const BOOKING_LABELS = {
  essential: 'Essential — Book Major Sites Well in Advance',
  recommended: 'Recommended — Book Ahead to Skip Lines',
  flexible: 'Flexible — Mix of Walk-Up and Advance Booking',
  'walk-up': 'Walk-Up Friendly — Advance Booking Rarely Needed',
};

const DISCLAIMER = "This reflects the general landscape for a destination's best-known attractions, not every single site — booking systems, caps, and popularity change over time. If a specific landmark matters to your trip, check that attraction's own official booking page directly rather than relying on general norms.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const bookingLabel = BOOKING_LABELS[data.bookingLevel];
  const headline = `${data.name}: ${bookingLabel}.`;

  return {
    country, countryName: data.name, bookingLevel: data.bookingLevel, bookingLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/attraction-booking-checker/calculate
// @access Public
exports.calculateAttractionBooking = (req, res) => {
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
// @route POST /api/tools/attraction-booking-checker/pdf
// @access Public
exports.generateAttractionBookingPdf = async (req, res) => {
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
      [email, firstName || null, 'attraction-booking-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Attraction Booking Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attraction-booking-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.bookingLabel);

    pdfService.heading(doc, 'General attraction booking tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If a specific landmark is the whole reason you\'re visiting, check its official booking page as soon as you\'ve fixed your travel dates — the most famous sites can sell out weeks or months ahead in peak season.',
      'Third-party ticket resellers often charge a real markup over official prices — book directly through the attraction\'s own website when one exists.',
      'Even in "walk-up friendly" destinations, arriving right at opening still beats arriving at midday for the best experience and shortest lines.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🎟️ Your ${result.countryName} attraction booking guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the attraction booking check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond sightseeing logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send attraction-booking-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAttractionBookingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
