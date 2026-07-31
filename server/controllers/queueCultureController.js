const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Queueing norms per destination — how formal lines are, and what to
// expect at counters, stops, and ticket windows. Distinct from
// etiquetteController.js (broader social etiquette, not specifically
// about lines/queues). queueLevel: 'strict' (highly orderly, single-file
// lines are the strong norm and cutting is a real faux pas) | 'orderly'
// (queuing is the norm and generally respected) | 'flexible' (lines exist
// but are loosely observed — some jostling or filling gaps is normal and
// not considered impolite) | 'assertive' (formal single-file lines are
// often not the default at busy counters or stops — holding your
// position and being direct about your turn is the practical norm).
const COUNTRIES = {
  france: { name: 'France', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — a bit of jostling near the front, especially at a busy counter or market stall, is normal and not seen as impolite.' },
  austria: { name: 'Austria', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
  'czech-republic': { name: 'Czech Republic', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including the ticket-number systems common at post offices and government counters.' },
  denmark: { name: 'Denmark', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
  germany: { name: 'Germany', queueLevel: 'strict', note: 'Orderly, single-file lines are a strong norm — cutting or crowding the front is genuinely noticed and can draw a pointed comment, not just a look.' },
  greece: { name: 'Greece', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed — some jostling near the front, especially at a busy kiosk or counter, is normal and not seen as impolite.' },
  hungary: { name: 'Hungary', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including the ticket-number systems common at post offices and government counters.' },
  iceland: { name: 'Iceland', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops and service counters.' },
  italy: { name: 'Italy', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — some jostling near the front, especially at a busy bar or market stall, is normal and not seen as impolite.' },
  netherlands: { name: 'Netherlands', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
  portugal: { name: 'Portugal', queueLevel: 'orderly', note: 'Queuing is generally respected, and ticket-number systems (senha) are common at banks, pharmacies, and government offices.' },
  spain: { name: 'Spain', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — some jostling near the front, especially at a busy bar or market stall, is normal and not seen as impolite. Ticket-number systems (turno) are common at pharmacies and government offices.' },
  sweden: { name: 'Sweden', queueLevel: 'strict', note: 'Ticket-number queuing (kölapp) is genuinely widespread — even bakeries and pharmacies commonly use a numbered-ticket system, and skipping the visible order is a real faux pas.' },
  switzerland: { name: 'Switzerland', queueLevel: 'strict', note: 'Orderly, single-file lines are a strong norm, and ticket-number systems are common at banks, post offices, and government counters — cutting is genuinely noticed.' },
  ireland: { name: 'Ireland', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, pubs, and transit stops.' },
  'united-kingdom': { name: 'United Kingdom', queueLevel: 'strict', note: "Orderly queuing is a well-known, genuinely strong cultural norm — cutting in line is a real faux pas that other people in line will notice and may comment on." },
  turkey: { name: 'Turkey', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed — some jostling near the front, especially at a busy counter or transit stop, is normal and not seen as impolite.' },
  japan: { name: 'Japan', queueLevel: 'strict', note: 'Extremely orderly queuing is a genuinely strong cultural norm — marked lines on train platforms are followed precisely, and cutting is essentially unheard of.' },
  thailand: { name: 'Thailand', queueLevel: 'orderly', note: 'Queuing is generally respected in shops and at transit stops, especially in Bangkok — expect somewhat more informal grouping at busy street food stalls.' },
  indonesia: { name: 'Indonesia', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — some jostling near the front, especially at a busy counter or market stall, is normal and not seen as impolite.' },
  singapore: { name: 'Singapore', queueLevel: 'strict', note: "Orderly queuing is actively promoted and genuinely well-observed — marked floor lines for transit and standard lines elsewhere are followed closely." },
  'south-korea': { name: 'South Korea', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including marked lines at transit stops and ticket-number systems at many counters.' },
  'hong-kong': { name: 'Hong Kong', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including marked lines at transit stops and taxi ranks.' },
  vietnam: { name: 'Vietnam', queueLevel: 'assertive', note: "Formal single-file lines aren't always the default at busy counters or transit stops — holding your position and being direct about your turn is the practical norm, especially in crowded settings." },
  philippines: { name: 'Philippines', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters — some jostling near the front is normal and not seen as impolite.' },
  malaysia: { name: 'Malaysia', queueLevel: 'orderly', note: 'Queuing is generally respected, including at transit stops and shopping malls, with ticket-number systems common at government offices.' },
  china: { name: 'China', queueLevel: 'assertive', note: "Formal single-file lines aren't always the default at busy counters, transit stops, or attractions — holding your ground and being direct about your turn is the practical norm, though major cities have pushed orderly-queuing campaigns with real effect in some settings." },
  india: { name: 'India', queueLevel: 'assertive', note: "Formal single-file lines aren't always the default at busy counters, ticket windows, or transit stops — holding your position and being direct about your turn is the practical norm in crowded settings." },
  maldives: { name: 'Maldives', queueLevel: 'orderly', note: 'The small-scale, resort-based nature of most trips means queuing rarely comes up in a meaningful way — staff generally manage flow directly.' },
  taiwan: { name: 'Taiwan', queueLevel: 'strict', note: 'Extremely orderly queuing is a genuinely strong cultural norm — marked lines on MRT platforms are followed precisely, and cutting is essentially unheard of.' },
  'sri-lanka': { name: 'Sri Lanka', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or transit stops — some jostling near the front is normal.' },
  cambodia: { name: 'Cambodia', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy markets — some jostling near the front is normal.' },
  australia: { name: 'Australia', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
  'new-zealand': { name: 'New Zealand', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
  fiji: { name: 'Fiji', queueLevel: 'flexible', note: 'Lines form for most things at a relaxed pace, in keeping with the general island pacing — cutting isn\'t really a concern given the overall unhurried atmosphere.' },
  'french-polynesia': { name: 'French Polynesia', queueLevel: 'flexible', note: 'Lines form for most things at a relaxed pace, in keeping with the general island pacing.' },
  mexico: { name: 'Mexico', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or markets — some jostling near the front is normal.' },
  'dominican-republic': { name: 'Dominican Republic', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially outside resort areas — some jostling near the front is normal.' },
  'puerto-rico': { name: 'Puerto Rico', queueLevel: 'orderly', note: 'Queuing is generally respected in San Juan and beyond, including at shops and government offices.' },
  bahamas: { name: 'Bahamas', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice outside resort areas — some jostling near the front is normal.' },
  jamaica: { name: 'Jamaica', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice outside resort areas — some jostling near the front is normal.' },
  aruba: { name: 'Aruba', queueLevel: 'orderly', note: 'Queuing is generally respected, including at shops and near resort areas.' },
  'turks-and-caicos': { name: 'Turks and Caicos', queueLevel: 'orderly', note: 'Queuing is generally respected, reflecting the small-scale, resort-oriented pace of most trips.' },
  'st-lucia': { name: 'St. Lucia', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice outside resort areas — some jostling near the front is normal.' },
  'costa-rica': { name: 'Costa Rica', queueLevel: 'orderly', note: 'Queuing is generally respected in banks, government offices (often with ticket-number systems), and shops.' },
  panama: { name: 'Panama', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or markets — some jostling near the front is normal.' },
  belize: { name: 'Belize', queueLevel: 'flexible', note: 'Lines form for most things at a relaxed pace — cutting isn\'t really a concern given the overall unhurried atmosphere.' },
  'cayman-islands': { name: 'Cayman Islands', queueLevel: 'orderly', note: 'Queuing is generally respected, reflecting the well-developed, business-oriented pace of the islands.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', queueLevel: 'flexible', note: 'Lines form for most things at a relaxed pace, in keeping with the general island pacing.' },
  curacao: { name: 'Curaçao', queueLevel: 'orderly', note: 'Queuing is generally respected, including at shops and government offices in Willemstad.' },
  canada: { name: 'Canada', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
  'united-arab-emirates': { name: 'United Arab Emirates', queueLevel: 'orderly', note: 'Queuing is generally respected in the modern, well-organized retail and government infrastructure of Dubai and Abu Dhabi.' },
  morocco: { name: 'Morocco', queueLevel: 'assertive', note: "Formal single-file lines aren't always the default at busy counters or in souks — holding your position and being direct about your turn is the practical norm." },
  'south-africa': { name: 'South Africa', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — some jostling near the front, especially at a busy counter, is normal and not seen as impolite.' },
  qatar: { name: 'Qatar', queueLevel: 'orderly', note: 'Queuing is generally respected in the modern, well-organized retail and government infrastructure of Doha.' },
  israel: { name: 'Israel', queueLevel: 'assertive', note: "Formal single-file lines aren't always the default at busy counters — Israeli social culture tends toward direct, assertive communication, and holding your position while stating your turn is the practical norm." },
  tanzania: { name: 'Tanzania', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — most trips center on safari lodges, where staff manage flow directly rather than formal queuing coming up much.' },
  kenya: { name: 'Kenya', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice — most trips center on safari lodges, where staff manage flow directly rather than formal queuing coming up much.' },
  argentina: { name: 'Argentina', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or markets — some jostling near the front is normal.' },
  peru: { name: 'Peru', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or markets — some jostling near the front is normal.' },
  chile: { name: 'Chile', queueLevel: 'orderly', note: 'Queuing is generally respected, including ticket-number systems common at banks and government offices.' },
  colombia: { name: 'Colombia', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or markets — some jostling near the front is normal.' },
  brazil: { name: 'Brazil', queueLevel: 'flexible', note: 'Lines form for most things, but they\'re loosely observed in practice, especially at busy counters or beaches — some jostling near the front is normal.' },
  'united-states': { name: 'United States', queueLevel: 'orderly', note: 'Queuing is respected and generally orderly, including at shops, transit stops, and ticket counters.' },
};

const QUEUE_LABELS = {
  strict: 'Strict — Highly Orderly, Take It Seriously',
  orderly: 'Orderly — Lines Are Respected',
  flexible: 'Flexible — Loosely Observed, No Big Deal',
  assertive: 'Assertive — Be Ready to Hold Your Ground',
};

const DISCLAIMER = "This reflects general norms across everyday settings — shops, transit, counters — not every specific situation. Formal contexts (banks, government offices, immigration) tend to be more orderly everywhere, regardless of the destination's general reputation, and ticket-number systems where present should always be followed.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const queueLabel = QUEUE_LABELS[data.queueLevel];
  const headline = `${data.name}: ${queueLabel}.`;

  return {
    country, countryName: data.name, queueLevel: data.queueLevel, queueLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/queue-culture-checker/calculate
// @access Public
exports.calculateQueueCulture = (req, res) => {
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
// @route POST /api/tools/queue-culture-checker/pdf
// @access Public
exports.generateQueueCulturePdf = async (req, res) => {
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
      [email, firstName || null, 'queue-culture-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Queue Culture Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="queue-culture-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.queueLabel);

    pdfService.heading(doc, 'General queueing tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Where a ticket-number system exists (common at banks, pharmacies, and government offices), always take a number rather than assuming a visible physical line — it\'s usually the real order, even if the line looks informal.',
      'In "assertive" destinations, standing quietly at the back and waiting to be noticed can mean waiting a very long time — stating your turn clearly and holding your position is the practical, not rude, approach.',
      'In "strict" destinations, even briefly stepping out of a line to check something can cost you your spot — treat your place in line as something to hold, not just claim.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚶 Your ${result.countryName} queue culture guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the queue culture check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond local etiquette? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send queue-culture-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateQueueCulturePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
