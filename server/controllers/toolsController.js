const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Booking-window matrix (days before departure), derived from the same
// route-type data already taught in the Timing Intelligence module.
const BOOKING_WINDOWS = {
  domestic: { budget: [7, 14], premium: [14, 28] },
  short_haul: { budget: [14, 21], premium: [21, 35] },
  long_haul_transatlantic: { budget: [21, 35], premium: [28, 42] },
  long_haul_asia_pacific: { budget: [35, 49], premium: [42, 56] },
};

const TRIP_TYPE_LABELS = {
  domestic: 'Domestic',
  short_haul: 'Short-haul international',
  long_haul_transatlantic: 'Long-haul international (transatlantic)',
  long_haul_asia_pacific: 'Long-haul international (Asia/Pacific)',
};

const AIRLINE_TYPE_LABELS = {
  budget: 'Budget/low-cost carrier',
  premium: 'Full-service/premium airline',
};

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function computeResult({ tripType, airlineType, departureDate }) {
  const window = BOOKING_WINDOWS[tripType]?.[airlineType];
  if (!window) throw new Error('Invalid tripType or airlineType');

  const [minDays, maxDays] = window;
  const departure = new Date(departureDate + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const daysUntilDeparture = Math.round((departure - today) / (1000 * 60 * 60 * 24));
  const windowOpensAt = addDays(departure, -maxDays);
  const windowClosesAt = addDays(departure, -minDays);

  let status, headline;
  if (daysUntilDeparture > maxDays) {
    status = 'too_early';
    headline = `Too early to book yet — your optimal window opens ${formatDate(windowOpensAt)}`;
  } else if (daysUntilDeparture >= minDays) {
    status = 'optimal_now';
    headline = `You're in the optimal booking window right now — book by ${formatDate(windowClosesAt)}`;
  } else {
    status = 'past_optimal';
    headline = `You've passed the ideal window — prices are typically climbing, book soon`;
  }

  return {
    tripType,
    tripTypeLabel: TRIP_TYPE_LABELS[tripType],
    airlineType,
    airlineTypeLabel: AIRLINE_TYPE_LABELS[airlineType],
    departureDate,
    daysUntilDeparture,
    minDays,
    maxDays,
    windowOpensAt: windowOpensAt.toISOString().slice(0, 10),
    windowClosesAt: windowClosesAt.toISOString().slice(0, 10),
    windowOpensAtLabel: formatDate(windowOpensAt),
    windowClosesAtLabel: formatDate(windowClosesAt),
    status,
    headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/best-time-to-book/calculate
// @access Public
exports.calculateBestTimeToBook = (req, res) => {
  try {
    const { tripType, airlineType, departureDate } = req.body;
    if (!tripType || !airlineType || !departureDate) {
      return res.status(400).json({ success: false, error: 'tripType, airlineType, and departureDate are required' });
    }
    const result = computeResult({ tripType, airlineType, departureDate });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream the full PDF report, send a confirmation email
// @route POST /api/tools/best-time-to-book/pdf
// @access Public
exports.generateBestTimeToBookPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, tripType, airlineType, departureDate } = req.body;
    if (!email || !tripType || !airlineType || !departureDate) {
      return res.status(400).json({ success: false, error: 'email, tripType, airlineType, and departureDate are required' });
    }

    const result = computeResult({ tripType, airlineType, departureDate });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'best-time-to-book-flights',
        JSON.stringify({ tripType, airlineType, departureDate }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    // Build the PDF
    const doc = pdfService.createBrandedDoc('Best Time to Book Flights — Your Personalized Report');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="best-time-to-book-flights.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `For a ${result.tripTypeLabel.toLowerCase()} route on a ${result.airlineTypeLabel.toLowerCase()}, departing ${formatDate(new Date(departureDate + 'T00:00:00Z'))}, the optimal booking window is between ${result.windowOpensAtLabel} and ${result.windowClosesAtLabel} — that's ${result.minDays} to ${result.maxDays} days before departure.`);

    pdfService.highlightBox(doc, `Your window: ${result.windowOpensAtLabel} → ${result.windowClosesAtLabel}`);

    pdfService.heading(doc, 'Why this window');
    pdfService.paragraph(doc, 'Airlines manage pricing algorithmically to maximize revenue across the whole booking curve. Budget carriers tend to sell their cheapest seats early and raise prices steadily as the flight fills, so waiting rarely helps. Full-service airlines hold more inventory back and often release better fares and upgrade availability in the middle of the booking window — waiting a bit longer can pay off, but going too early or too late both cost you money.');

    pdfService.heading(doc, 'Extra timing tips');
    pdfService.bulletList(doc, [
      'Prices for most routes are lowest when checked Tuesday–Wednesday evening (UTC), right after airlines reset weekend pricing.',
      'Clear your browser cookies or use incognito mode before searching — repeated searches on the same route can trigger dynamic price increases.',
      'Shoulder-season travel (April–May, September–October) is consistently 30–50% cheaper than peak summer, on top of any timing optimization.',
      'Set a price alert as soon as your window opens rather than checking manually — the best fares can disappear within hours.',
    ]);

    pdfService.heading(doc, 'One thing this report can\'t do');
    pdfService.paragraph(doc, 'This is a timing estimate based on route-type patterns, not a live price check on your specific route. TravelSmarter members get automatic daily price checks on their exact saved routes, so they\'re alerted the moment a real price drop happens — not just when the calendar says it\'s likely.');

    pdfService.addFooterCTA(doc);
    doc.end();

    // Fire-and-forget confirmation email (PDF already streaming to the browser)
    emailService.sendEmail({
      to: email,
      subject: '✈️ Your Best Time to Book Flights report',
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's a quick recap of your personalized report:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want this kind of analysis automatically, on your exact route, with real-time price alerts instead of estimates? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send best-time-to-book confirmation email:', err.message));

  } catch (error) {
    console.error('generateBestTimeToBookPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
