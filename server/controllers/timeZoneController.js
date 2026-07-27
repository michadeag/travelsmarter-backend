const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Standard-time UTC offset per country (ignoring daylight saving — see
// dstNote for countries where DST typically shifts this by ~1 hour).
// Large countries spanning multiple zones use a major-city reference
// (noted in dstNote/multiZone) rather than attempting per-region precision.
const COUNTRIES = {
  'united-states': { name: 'United States', utcOffset: -5, dstNote: 'Uses Eastern Time (New York) as a reference — the US spans 6 time zones, so adjust if you mean a different region.' },
  canada: { name: 'Canada', utcOffset: -5, dstNote: 'Uses Eastern Time (Toronto) as a reference — Canada spans 6 time zones, so adjust if you mean a different region.' },
  mexico: { name: 'Mexico', utcOffset: -6, dstNote: null },
  brazil: { name: 'Brazil', utcOffset: -3, dstNote: 'Uses Brasília time — Brazil abolished daylight saving in 2019, so this stays constant year-round.' },
  argentina: { name: 'Argentina', utcOffset: -3, dstNote: 'No daylight saving — stays constant year-round.' },
  chile: { name: 'Chile', utcOffset: -4, dstNote: 'Chile observes daylight saving in the Southern Hemisphere pattern (opposite season from the Northern Hemisphere).' },
  colombia: { name: 'Colombia', utcOffset: -5, dstNote: 'No daylight saving — stays constant year-round.' },
  peru: { name: 'Peru', utcOffset: -5, dstNote: 'No daylight saving — stays constant year-round.' },
  'costa-rica': { name: 'Costa Rica', utcOffset: -6, dstNote: 'No daylight saving — stays constant year-round.' },

  'united-kingdom': { name: 'United Kingdom', utcOffset: 0, dstNote: 'Shifts to UTC+1 during British Summer Time (late March-October).' },
  ireland: { name: 'Ireland', utcOffset: 0, dstNote: 'Shifts to UTC+1 during summer time (late March-October).' },
  france: { name: 'France', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  germany: { name: 'Germany', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  italy: { name: 'Italy', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  spain: { name: 'Spain', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  netherlands: { name: 'Netherlands', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  portugal: { name: 'Portugal', utcOffset: 0, dstNote: 'Shifts to UTC+1 during summer time (late March-October).' },
  greece: { name: 'Greece', utcOffset: 2, dstNote: 'Shifts to UTC+3 during summer time (late March-October).' },
  austria: { name: 'Austria', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  switzerland: { name: 'Switzerland', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  poland: { name: 'Poland', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  'czech-republic': { name: 'Czech Republic', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  norway: { name: 'Norway', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  sweden: { name: 'Sweden', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  denmark: { name: 'Denmark', utcOffset: 1, dstNote: 'Shifts to UTC+2 during summer time (late March-October).' },
  iceland: { name: 'Iceland', utcOffset: 0, dstNote: 'No daylight saving — stays constant year-round.' },

  japan: { name: 'Japan', utcOffset: 9, dstNote: 'No daylight saving — stays constant year-round.' },
  'south-korea': { name: 'South Korea', utcOffset: 9, dstNote: 'No daylight saving — stays constant year-round.' },
  china: { name: 'China', utcOffset: 8, dstNote: 'One official time zone nationwide despite the country\'s geographic width — no daylight saving.' },
  thailand: { name: 'Thailand', utcOffset: 7, dstNote: 'No daylight saving — stays constant year-round.' },
  vietnam: { name: 'Vietnam', utcOffset: 7, dstNote: 'No daylight saving — stays constant year-round.' },
  indonesia: { name: 'Indonesia', utcOffset: 7, dstNote: 'Uses Western Indonesia Time (Jakarta) as a reference — Indonesia spans 3 time zones.' },
  philippines: { name: 'Philippines', utcOffset: 8, dstNote: 'No daylight saving — stays constant year-round.' },
  malaysia: { name: 'Malaysia', utcOffset: 8, dstNote: 'No daylight saving — stays constant year-round.' },
  singapore: { name: 'Singapore', utcOffset: 8, dstNote: 'No daylight saving — stays constant year-round.' },
  india: { name: 'India', utcOffset: 5.5, dstNote: 'India uses a unique 30-minute offset (UTC+5:30) and has no daylight saving.' },

  turkey: { name: 'Turkey', utcOffset: 3, dstNote: 'No daylight saving since 2016 — stays constant year-round.' },
  israel: { name: 'Israel', utcOffset: 2, dstNote: 'Shifts to UTC+3 during daylight saving (spring-autumn).' },
  'united-arab-emirates': { name: 'United Arab Emirates', utcOffset: 4, dstNote: 'No daylight saving — stays constant year-round.' },
  'saudi-arabia': { name: 'Saudi Arabia', utcOffset: 3, dstNote: 'No daylight saving — stays constant year-round.' },
  egypt: { name: 'Egypt', utcOffset: 2, dstNote: 'Egypt has changed its daylight saving policy multiple times in recent years — verify current status closer to your dates.' },
  morocco: { name: 'Morocco', utcOffset: 1, dstNote: 'Morocco observes daylight saving with a pause during Ramadan — one of the more unusual DST schedules worldwide, worth double-checking.' },
  jordan: { name: 'Jordan', utcOffset: 3, dstNote: null },
  kenya: { name: 'Kenya', utcOffset: 3, dstNote: 'No daylight saving — stays constant year-round.' },
  'south-africa': { name: 'South Africa', utcOffset: 2, dstNote: 'No daylight saving — stays constant year-round.' },

  australia: { name: 'Australia', utcOffset: 10, dstNote: 'Uses Eastern Time (Sydney) as a reference — Australia spans 3 time zones, and shifts to UTC+11 during Southern Hemisphere daylight saving (October-April).' },
  'new-zealand': { name: 'New Zealand', utcOffset: 12, dstNote: 'Shifts to UTC+13 during Southern Hemisphere daylight saving (late September-April).' },
};

function formatHour(h) {
  let hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  hh = ((hh % 24) + 24) % 24;
  const period = hh < 12 ? 'AM' : 'PM';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

function computeResult({ origin, destination }) {
  const originData = COUNTRIES[origin];
  const destData = COUNTRIES[destination];
  if (!originData) throw new Error('Unknown origin country');
  if (!destData) throw new Error('Unknown destination country');

  const offsetDiff = destData.utcOffset - originData.utcOffset;
  const absDiff = Math.abs(offsetDiff);
  const direction = offsetDiff > 0 ? 'ahead of' : offsetDiff < 0 ? 'behind' : 'the same time as';

  let difficulty, difficultyLabel;
  if (absDiff <= 3) { difficulty = 'easy'; difficultyLabel = 'Easy — your waking hours overlap substantially, so real-time calls work at most normal times.'; }
  else if (absDiff <= 8) { difficulty = 'moderate'; difficultyLabel = 'Moderate — there\'s a real overlap window, but you\'ll likely need to plan around it (e.g. your evening / their morning).'; }
  else { difficulty = 'difficult'; difficultyLabel = 'Difficult — little or no waking-hours overlap; expect one side to take an early morning or late night call.'; }

  const morningInDest = formatHour((9 + offsetDiff + 24) % 24);
  const eveningInDest = formatHour((18 + offsetDiff + 24) % 24);

  const headline = absDiff === 0
    ? `${destData.name} is the same time as ${originData.name}.`
    : `${destData.name} is ${absDiff % 1 === 0 ? absDiff : absDiff.toFixed(1)} hours ${direction} ${originData.name}.`;

  return {
    origin, destination, originName: originData.name, destinationName: destData.name,
    offsetDiff, absDiff, difficulty, difficultyLabel,
    morningExample: `If it's 9:00 AM in ${originData.name}, it's ${morningInDest} in ${destData.name}.`,
    eveningExample: `If it's 6:00 PM in ${originData.name}, it's ${eveningInDest} in ${destData.name}.`,
    dstNote: [originData.dstNote, destData.dstNote].filter(Boolean).join(' '),
    headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/time-zone-checker/calculate
// @access Public
exports.calculateTimeZone = (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) return res.status(400).json({ success: false, error: 'origin and destination are required' });
    const result = computeResult({ origin, destination });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/time-zone-checker/pdf
// @access Public
exports.generateTimeZonePdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, origin, destination } = req.body;
    if (!email || !origin || !destination) {
      return res.status(400).json({ success: false, error: 'email, origin and destination are required' });
    }

    const result = computeResult({ origin, destination });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'time-zone-checker',
        JSON.stringify({ origin, destination }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.originName} to ${result.destinationName} Time Zone Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="time-zone-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.morningExample);
    pdfService.paragraph(doc, result.eveningExample);

    pdfService.highlightBox(doc, result.difficultyLabel);

    if (result.dstNote) {
      pdfService.heading(doc, 'Daylight saving note');
      pdfService.paragraph(doc, result.dstNote);
    }

    pdfService.heading(doc, 'Staying in touch while traveling');
    pdfService.bulletList(doc, [
      'Agree on a specific meeting time in one person\'s local time zone, stated explicitly (e.g. "3pm your time") — "let\'s call later" is a common source of missed calls across time zones.',
      'Most phones and calendar apps can display a second time zone — set this up before you travel rather than doing mental math on the fly.',
      'This guide uses standard-time offsets — actual difference can shift by up to 1-2 hours around daylight saving transitions in either location, so double-check close to your travel dates.',
    ]);

    pdfService.addFooterCTA(doc, destination);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🕐 Your ${result.originName} → ${result.destinationName} time zone guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your time zone check:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond time zones? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${destination}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send time-zone-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateTimeZonePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
