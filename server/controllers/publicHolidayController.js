const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Public holidays per country. type:'fixed' holidays land on the same
// Gregorian date every year and are matched exactly against the trip's date
// range. type:'variable' holidays (lunar-calendar or Easter-based) shift
// year to year — rather than guess a specific date, we flag them as
// "possible" whenever the trip overlaps their typical month window, and
// tell the traveler to verify the exact date for their travel year.
const NEW_YEAR = { name: "New Year's Day", type: 'fixed', month: 1, day: 1 };
const LABOUR_DAY = { name: 'Labour Day', type: 'fixed', month: 5, day: 1 };
const CHRISTMAS = { name: 'Christmas Day', type: 'fixed', month: 12, day: 25 };
const EASTER = { name: 'Easter / Good Friday', type: 'variable', months: [3, 4], note: 'Date shifts every year, typically falling in March or April.' };
const LUNAR_NEW_YEAR = { name: 'Lunar New Year', type: 'variable', months: [1, 2], note: 'Date shifts every year based on the lunar calendar, typically late January or February.' };
const EID_FITR = { name: 'Eid al-Fitr', type: 'variable', months: [2, 3, 4], note: "Shifts about 11 days earlier each Gregorian year — check the exact date for your travel year." };
const EID_ADHA = { name: 'Eid al-Adha', type: 'variable', months: [4, 5, 6], note: "Shifts about 11 days earlier each Gregorian year — check the exact date for your travel year." };
const DIWALI = { name: 'Diwali', type: 'variable', months: [10, 11], note: 'Date shifts every year based on the lunar calendar, typically October or November.' };
const THANKSGIVING = { name: 'Thanksgiving', type: 'variable', months: [11], note: 'Always the 4th Thursday of November — many businesses close, and travel volume spikes around it.' };
const GOLDEN_WEEK = { name: 'Golden Week', type: 'variable', months: [4, 5], note: 'A cluster of national holidays in late April/early May — expect widespread closures and heavy domestic travel.' };
const CHUSEOK = { name: 'Chuseok', type: 'variable', months: [9, 10], note: 'Korean harvest festival, date shifts every year based on the lunar calendar, typically September or October.' };

const COUNTRIES = {
  thailand: { name: 'Thailand', holidays: [NEW_YEAR, { name: 'Songkran (Thai New Year)', type: 'fixed', month: 4, day: 13 }, { name: "King's Birthday", type: 'fixed', month: 7, day: 28 }, { name: 'Chulalongkorn Day', type: 'fixed', month: 10, day: 23 }] },
  indonesia: { name: 'Indonesia', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 8, day: 17 }, EID_FITR] },
  vietnam: { name: 'Vietnam', holidays: [NEW_YEAR, { name: 'Reunification Day', type: 'fixed', month: 4, day: 30 }, { name: 'National Day', type: 'fixed', month: 9, day: 2 }, LUNAR_NEW_YEAR] },
  philippines: { name: 'Philippines', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 6, day: 12 }, CHRISTMAS, EASTER] },
  malaysia: { name: 'Malaysia', holidays: [NEW_YEAR, { name: 'Merdeka Day (National Day)', type: 'fixed', month: 8, day: 31 }, LUNAR_NEW_YEAR, EID_FITR] },
  singapore: { name: 'Singapore', holidays: [NEW_YEAR, { name: 'National Day', type: 'fixed', month: 8, day: 9 }, LUNAR_NEW_YEAR, EID_FITR, DIWALI] },
  china: { name: 'China', holidays: [NEW_YEAR, { name: 'National Day (Golden Week)', type: 'fixed', month: 10, day: 1 }, LUNAR_NEW_YEAR] },
  india: { name: 'India', holidays: [{ name: 'Republic Day', type: 'fixed', month: 1, day: 26 }, { name: 'Independence Day', type: 'fixed', month: 8, day: 15 }, DIWALI] },
  japan: { name: 'Japan', holidays: [NEW_YEAR, { name: 'National Foundation Day', type: 'fixed', month: 2, day: 11 }, GOLDEN_WEEK] },
  'south-korea': { name: 'South Korea', holidays: [{ name: 'Liberation Day', type: 'fixed', month: 8, day: 15 }, { name: 'National Foundation Day', type: 'fixed', month: 10, day: 3 }, LUNAR_NEW_YEAR, CHUSEOK] },

  france: { name: 'France', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'Bastille Day', type: 'fixed', month: 7, day: 14 }, CHRISTMAS, EASTER] },
  germany: { name: 'Germany', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'German Unity Day', type: 'fixed', month: 10, day: 3 }, CHRISTMAS, EASTER] },
  italy: { name: 'Italy', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'Republic Day', type: 'fixed', month: 6, day: 2 }, { name: 'Ferragosto', type: 'fixed', month: 8, day: 15 }, CHRISTMAS, EASTER] },
  spain: { name: 'Spain', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'National Day', type: 'fixed', month: 10, day: 12 }, CHRISTMAS, EASTER] },
  netherlands: { name: 'Netherlands', holidays: [NEW_YEAR, { name: "King's Day", type: 'fixed', month: 4, day: 27 }, CHRISTMAS, EASTER] },
  portugal: { name: 'Portugal', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'Portugal Day', type: 'fixed', month: 6, day: 10 }, { name: 'Restoration of Independence', type: 'fixed', month: 12, day: 1 }, CHRISTMAS, EASTER] },
  greece: { name: 'Greece', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 3, day: 25 }, { name: 'Ochi Day', type: 'fixed', month: 10, day: 28 }, CHRISTMAS, EASTER] },
  austria: { name: 'Austria', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'National Day', type: 'fixed', month: 10, day: 26 }, CHRISTMAS, EASTER] },
  switzerland: { name: 'Switzerland', holidays: [NEW_YEAR, { name: 'Swiss National Day', type: 'fixed', month: 8, day: 1 }, CHRISTMAS, EASTER] },
  ireland: { name: 'Ireland', holidays: [NEW_YEAR, { name: "St. Patrick's Day", type: 'fixed', month: 3, day: 17 }, CHRISTMAS, EASTER] },
  poland: { name: 'Poland', holidays: [NEW_YEAR, { name: 'Constitution Day', type: 'fixed', month: 5, day: 3 }, { name: 'Independence Day', type: 'fixed', month: 11, day: 11 }, CHRISTMAS, EASTER] },
  sweden: { name: 'Sweden', holidays: [NEW_YEAR, { name: 'National Day', type: 'fixed', month: 6, day: 6 }, { name: 'Midsummer', type: 'variable', months: [6], note: 'Always falls on a Friday/Saturday in late June — many businesses close, especially outside major cities.' }, CHRISTMAS] },
  norway: { name: 'Norway', holidays: [NEW_YEAR, { name: 'Constitution Day', type: 'fixed', month: 5, day: 17 }, CHRISTMAS, EASTER] },
  'czech-republic': { name: 'Czech Republic', holidays: [NEW_YEAR, LABOUR_DAY, { name: 'Statehood Day', type: 'fixed', month: 9, day: 28 }, CHRISTMAS, EASTER] },

  'united-kingdom': { name: 'United Kingdom', holidays: [NEW_YEAR, CHRISTMAS, { name: 'Boxing Day', type: 'fixed', month: 12, day: 26 }, EASTER] },
  'united-states': { name: 'United States', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 7, day: 4 }, THANKSGIVING, CHRISTMAS] },
  canada: { name: 'Canada', holidays: [NEW_YEAR, { name: 'Canada Day', type: 'fixed', month: 7, day: 1 }, { name: 'Thanksgiving (Canada)', type: 'variable', months: [10], note: 'Always the 2nd Monday of October.' }, CHRISTMAS] },
  mexico: { name: 'Mexico', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 9, day: 16 }, { name: 'Day of the Dead', type: 'fixed', month: 11, day: 2 }, CHRISTMAS, EASTER] },
  brazil: { name: 'Brazil', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 9, day: 7 }, { name: 'Carnival', type: 'variable', months: [2, 3], note: 'Date shifts every year (tied to Easter), typically February or early March — major closures and huge crowds in cities like Rio.' }, CHRISTMAS] },
  argentina: { name: 'Argentina', holidays: [NEW_YEAR, { name: 'Revolution Day', type: 'fixed', month: 5, day: 25 }, { name: 'Independence Day', type: 'fixed', month: 7, day: 9 }, CHRISTMAS, EASTER] },
  chile: { name: 'Chile', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 9, day: 18 }, CHRISTMAS, EASTER] },
  colombia: { name: 'Colombia', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 7, day: 20 }, CHRISTMAS, EASTER] },
  peru: { name: 'Peru', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 7, day: 28 }, CHRISTMAS, EASTER] },
  'costa-rica': { name: 'Costa Rica', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 9, day: 15 }, CHRISTMAS, EASTER] },

  turkey: { name: 'Turkey', holidays: [NEW_YEAR, { name: 'Republic Day', type: 'fixed', month: 10, day: 29 }, EID_FITR, EID_ADHA] },
  israel: { name: 'Israel', holidays: [{ name: 'Independence Day (Yom HaAtzmaut)', type: 'variable', months: [4, 5], note: 'Follows the Hebrew calendar, typically April or May.' }, { name: 'Rosh Hashanah / Yom Kippur', type: 'variable', months: [9, 10], note: 'Follows the Hebrew calendar, typically September or October — many businesses close for multiple days.' }] },
  'united-arab-emirates': { name: 'United Arab Emirates', holidays: [NEW_YEAR, { name: 'National Day', type: 'fixed', month: 12, day: 2 }, EID_FITR, EID_ADHA] },
  'saudi-arabia': { name: 'Saudi Arabia', holidays: [{ name: 'National Day', type: 'fixed', month: 9, day: 23 }, EID_FITR, EID_ADHA] },
  egypt: { name: 'Egypt', holidays: [{ name: 'Revolution Day', type: 'fixed', month: 7, day: 23 }, EID_FITR, EID_ADHA] },
  morocco: { name: 'Morocco', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 11, day: 18 }, EID_FITR, EID_ADHA] },
  kenya: { name: 'Kenya', holidays: [NEW_YEAR, { name: 'Jamhuri Day (Independence)', type: 'fixed', month: 12, day: 12 }, CHRISTMAS, EASTER] },
  nigeria: { name: 'Nigeria', holidays: [NEW_YEAR, { name: 'Independence Day', type: 'fixed', month: 10, day: 1 }, CHRISTMAS, EID_FITR] },
  'south-africa': { name: 'South Africa', holidays: [NEW_YEAR, { name: 'Freedom Day', type: 'fixed', month: 4, day: 27 }, { name: 'Heritage Day', type: 'fixed', month: 9, day: 24 }, CHRISTMAS, EASTER] },

  australia: { name: 'Australia', holidays: [NEW_YEAR, { name: 'Australia Day', type: 'fixed', month: 1, day: 26 }, { name: 'ANZAC Day', type: 'fixed', month: 4, day: 25 }, CHRISTMAS, EASTER] },
  'new-zealand': { name: 'New Zealand', holidays: [NEW_YEAR, { name: 'Waitangi Day', type: 'fixed', month: 2, day: 6 }, { name: 'ANZAC Day', type: 'fixed', month: 4, day: 25 }, CHRISTMAS, EASTER] },
};

function monthsInRange(startDate, endDate) {
  const months = new Set();
  const d = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
  while (d.getTime() <= end.getTime()) {
    months.add(d.getUTCMonth() + 1);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return months;
}

function computeResult({ country, startDate, endDate }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');
  if (!startDate || !endDate) throw new Error('Trip start and end dates are required');

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid date');
  if (end.getTime() < start.getTime()) throw new Error('End date must be after start date');

  const confirmed = [];
  const possible = [];
  const spannedMonths = monthsInRange(start, end);

  for (const holiday of data.holidays) {
    if (holiday.type === 'fixed') {
      for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year++) {
        const d = new Date(Date.UTC(year, holiday.month - 1, holiday.day));
        if (d.getTime() >= start.getTime() && d.getTime() <= end.getTime()) {
          confirmed.push({ name: holiday.name, date: d.toISOString().split('T')[0] });
        }
      }
    } else {
      const overlaps = holiday.months.some(m => spannedMonths.has(m));
      if (overlaps) possible.push({ name: holiday.name, note: holiday.note });
    }
  }

  let headline;
  if (confirmed.length > 0) {
    const names = confirmed.map(h => h.name).join(', ');
    headline = `${confirmed.length} public holiday${confirmed.length > 1 ? 's' : ''} fall${confirmed.length > 1 ? '' : 's'} during your trip to ${data.name}: ${names} — expect some closures.`;
  } else if (possible.length > 0) {
    headline = `No confirmed fixed-date holidays, but ${possible.map(h => h.name).join(' and ')} could fall during your trip to ${data.name} — worth double-checking the exact date.`;
  } else {
    headline = `No major public holidays expected during your trip to ${data.name} — should be business as usual.`;
  }

  return { country, countryName: data.name, confirmed, possible, headline };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/public-holiday-checker/calculate
// @access Public
exports.calculatePublicHoliday = (req, res) => {
  try {
    const { country, startDate, endDate } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country, startDate, endDate });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/public-holiday-checker/pdf
// @access Public
exports.generatePublicHolidayPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, country, startDate, endDate } = req.body;
    if (!email || !country || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'email, country, startDate and endDate are required' });
    }

    const result = computeResult({ country, startDate, endDate });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'public-holiday-checker',
        JSON.stringify({ country, startDate, endDate }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Public Holiday Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="public-holiday-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);

    if (result.confirmed.length > 0) {
      pdfService.heading(doc, 'Confirmed holidays during your trip');
      pdfService.bulletList(doc, result.confirmed.map(h => `${h.name} — ${h.date}`));
    }
    if (result.possible.length > 0) {
      pdfService.heading(doc, 'Worth double-checking');
      pdfService.bulletList(doc, result.possible.map(h => `${h.name} — ${h.note}`));
    }

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      'Banks, government offices, and many local shops commonly close on public holidays — plan cash withdrawals and paperwork around them.',
      'Restaurants and tourist attractions sometimes stay open with special hours during holidays — worth checking specific venues rather than assuming everything is closed.',
      'Public holidays can also mean the opposite problem — packed transport and fully booked restaurants as locals travel too, so book ahead if your trip overlaps one.',
      'This guide reflects general, widely-known holiday patterns — always reconfirm exact dates with an official source close to your travel dates, especially for lunar-calendar holidays.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📅 Your ${result.countryName} public holiday check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your public holiday check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond holiday closures? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send public-holiday-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePublicHolidayPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
