const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// The single most disruptive recurring holiday/festival SEASON per country
// — distinct from publicHolidayController.js (single-day closures) and
// businessHoursController.js (daily patterns). This is about multi-day or
// multi-week periods that can mean closed businesses, sold-out transport
// and hotels, and significant price surges — the kind of thing that
// blindsides travelers who only checked the weather forecast. Many of
// these dates shift year to year (lunar calendars, moveable feasts), so
// exact dates aren't given — impact: 'high' | 'moderate' | 'low'.
const COUNTRIES = {
  france: { name: 'France', season: 'August holidays', impact: 'moderate', note: "Much of France, especially smaller towns, takes summer holiday in August — many independent restaurants and shops close for one to three weeks. Paris itself stays largely open, but check specific businesses outside the capital." },
  austria: { name: 'Austria', season: 'Christmas markets season', impact: 'moderate', note: 'December Christmas markets draw large crowds in Vienna and Salzburg, pushing up hotel prices — otherwise no major disruptive season.' },
  'czech-republic': { name: 'Czech Republic', season: 'Christmas markets season', impact: 'moderate', note: "Prague's December Christmas markets draw large crowds and higher hotel prices — otherwise no major disruptive season." },
  denmark: { name: 'Denmark', season: 'No major disruptive season', impact: 'low', note: 'Denmark has no single holiday period that significantly disrupts travel — plan around weather and typical peak summer pricing instead.' },
  germany: { name: 'Germany', season: 'Oktoberfest & Christmas markets', impact: 'moderate', note: "Munich's Oktoberfest (late September–early October) and December Christmas markets nationwide both mean packed hotels and higher prices — book well ahead if your trip overlaps." },
  greece: { name: 'Greece', season: 'August peak season', impact: 'moderate', note: 'August is when Greeks themselves travel most, alongside peak international tourism — expect the highest prices and biggest crowds of the year on the islands.' },
  hungary: { name: 'Hungary', season: 'Christmas markets season', impact: 'moderate', note: "Budapest's December Christmas markets draw crowds and higher prices — otherwise no major disruptive season." },
  iceland: { name: 'Iceland', season: 'No major disruptive season', impact: 'low', note: 'Iceland has no single holiday period that significantly disrupts travel — summer peak season pricing is the main thing to plan around.' },
  italy: { name: 'Italy', season: 'Ferragosto (mid-August)', impact: 'high', note: "Around August 15th, huge numbers of Italians travel domestically and many small businesses — especially restaurants and shops in smaller towns — close for one to three weeks. Rome, Florence, and Venice stay open for tourists, but smaller destinations can feel shut down." },
  netherlands: { name: 'Netherlands', season: 'No major disruptive season', impact: 'low', note: 'The Netherlands has no single holiday period that significantly disrupts travel.' },
  portugal: { name: 'Portugal', season: 'August peak season', impact: 'moderate', note: 'August is peak domestic and international travel season — expect the highest prices and biggest crowds, especially on the Algarve.' },
  spain: { name: 'Spain', season: 'Semana Santa & August', impact: 'high', note: 'Semana Santa (Holy Week, March/April) brings huge processions and crowds, especially in Seville and Andalusia — hotels book out and prices surge. August is also peak season nationwide as Spaniards themselves take their main holidays, with many local shops closing.' },
  sweden: { name: 'Sweden', season: 'Midsummer (late June)', impact: 'moderate', note: 'Midsummer weekend sees much of the country head to the countryside — Stockholm can feel unusually quiet, with some businesses closed.' },
  switzerland: { name: 'Switzerland', season: 'No major disruptive season', impact: 'low', note: 'Switzerland has no single holiday period that significantly disrupts travel.' },
  ireland: { name: 'Ireland', season: 'No major disruptive season', impact: 'low', note: 'Ireland has no single holiday period that significantly disrupts travel, beyond St. Patrick\'s Day (March 17) crowding in Dublin.' },
  'united-kingdom': { name: 'United Kingdom', season: 'No major disruptive season', impact: 'low', note: 'The UK has no single holiday period that significantly disrupts travel, beyond August bank holiday crowding.' },
  turkey: { name: 'Turkey', season: 'Ramadan', impact: 'moderate', note: "During Ramadan (dates shift yearly, roughly across the Islamic lunar calendar), many restaurants in more conservative areas close or reduce hours during daylight — coastal resort areas stay largely normal for tourists." },
  japan: { name: 'Japan', season: 'Golden Week (late April–early May)', impact: 'high', note: "A cluster of national holidays creates Japan's biggest domestic travel period — trains and hotels book out well in advance and prices surge nationwide. New Year (Jan 1-3) also sees many shops and restaurants close." },
  thailand: { name: 'Thailand', season: 'Songkran (mid-April)', impact: 'high', note: "Thailand's water festival is genuinely fun but disruptive — expect massive crowds, packed transport, and some businesses closed as the whole country celebrates for several days." },
  indonesia: { name: 'Indonesia', season: 'Ramadan & Lebaran (Eid)', impact: 'high', note: 'The days around Lebaran trigger "mudik" — one of the world\'s largest annual human migrations, as tens of millions travel home. Transport is overwhelmed and many businesses close for a week or more.' },
  singapore: { name: 'Singapore', season: 'Chinese New Year', impact: 'moderate', note: 'Some local businesses close for a few days around Chinese New Year, though Singapore\'s multicultural makeup means it stays far more open than mainland China.' },
  'south-korea': { name: 'South Korea', season: 'Chuseok & Lunar New Year', impact: 'high', note: 'Both holidays trigger huge domestic travel as Koreans return to hometowns — many small businesses close for several days, and trains/highways get very congested.' },
  'hong-kong': { name: 'Hong Kong', season: 'Lunar New Year', impact: 'high', note: 'Many local businesses close for several days around Lunar New Year — major attractions and malls stay open, but don\'t count on smaller restaurants and shops.' },
  vietnam: { name: 'Vietnam', season: 'Tet (Lunar New Year)', impact: 'high', note: 'Tet is Vietnam\'s biggest holiday by far — many businesses, including restaurants, close for a week or more, and domestic transport is fully booked well in advance.' },
  philippines: { name: 'Philippines', season: 'Holy Week (Semana Santa)', impact: 'high', note: 'Much of the country shuts down for Holy Week as Filipinos travel to their home provinces — transport is heavily booked and many businesses in Manila close.' },
  malaysia: { name: 'Malaysia', season: 'Ramadan, Hari Raya & Chinese New Year', impact: 'high', note: "Malaysia's multiple major holiday seasons each bring real disruption — reduced restaurant hours during Ramadan, then closures around Hari Raya and Chinese New Year as different communities travel." },
  china: { name: 'China', season: 'Spring Festival & Golden Week', impact: 'high', note: 'The Spring Festival (Lunar New Year, Jan/Feb) triggers the largest annual human migration on Earth — expect fully booked trains and hotels, and many small businesses closed for a week or more. National Day Golden Week (Oct 1) is similarly disruptive on a smaller scale.' },
  india: { name: 'India', season: 'Diwali season', impact: 'high', note: 'Diwali triggers a major domestic travel surge with significant price increases on flights and trains — book well ahead if your trip overlaps.' },
  maldives: { name: 'Maldives', season: 'No major disruptive season', impact: 'low', note: 'Resort-island tourism in the Maldives is largely insulated from local holiday disruption.' },
  taiwan: { name: 'Taiwan', season: 'Lunar New Year', impact: 'high', note: 'Many local businesses close for several days around Lunar New Year, and domestic transport gets heavily booked as families reunite.' },
  'sri-lanka': { name: 'Sri Lanka', season: 'Sinhala & Tamil New Year (mid-April)', impact: 'moderate', note: 'Many local businesses close for several days around the New Year as people travel to be with family.' },
  cambodia: { name: 'Cambodia', season: 'Khmer New Year (mid-April)', impact: 'high', note: "Cambodia's biggest holiday sees many businesses close for several days as people travel to their home villages." },
  australia: { name: 'Australia', season: 'Christmas–New Year (summer)', impact: 'moderate', note: "Falling in Australia's summer, this period sees beach destinations packed and prices at their highest of the year — book well ahead." },
  'new-zealand': { name: 'New Zealand', season: 'Christmas–New Year (summer)', impact: 'moderate', note: "Falling in New Zealand's summer, this is the peak domestic travel period with the highest prices of the year." },
  fiji: { name: 'Fiji', season: 'No major disruptive season', impact: 'low', note: 'Resort tourism in Fiji is largely insulated from local holiday disruption.' },
  'french-polynesia': { name: 'French Polynesia', season: 'No major disruptive season', impact: 'low', note: 'Resort tourism in French Polynesia is largely insulated from local holiday disruption.' },
  mexico: { name: 'Mexico', season: 'Semana Santa (Holy Week)', impact: 'high', note: 'Huge numbers of Mexicans travel to beach destinations during Holy Week — expect the highest prices and biggest crowds of the year at coastal resorts.' },
  'dominican-republic': { name: 'Dominican Republic', season: 'Semana Santa (Holy Week)', impact: 'moderate', note: 'A major domestic travel period with higher prices and crowds at beach destinations.' },
  'puerto-rico': { name: 'Puerto Rico', season: 'Christmas–New Year season', impact: 'moderate', note: 'Puerto Rico\'s holiday season runs unusually long, with festivities into mid-January — expect higher prices and a livelier, more crowded atmosphere.' },
  bahamas: { name: 'Bahamas', season: 'No major disruptive season', impact: 'low', note: 'Resort tourism in the Bahamas is largely insulated from local holiday disruption.' },
  jamaica: { name: 'Jamaica', season: 'Christmas–New Year season', impact: 'moderate', note: 'Peak season for both tourism and local celebration — expect higher prices and a livelier atmosphere.' },
  aruba: { name: 'Aruba', season: 'No major disruptive season', impact: 'low', note: 'Resort tourism in Aruba is largely insulated from local holiday disruption.' },
  'turks-and-caicos': { name: 'Turks and Caicos', season: 'No major disruptive season', impact: 'low', note: 'Resort tourism here is largely insulated from local holiday disruption.' },
  'st-lucia': { name: 'St. Lucia', season: 'No major disruptive season', impact: 'low', note: 'Resort tourism here is largely insulated from local holiday disruption.' },
  'costa-rica': { name: 'Costa Rica', season: 'Semana Santa (Holy Week)', impact: 'moderate', note: 'A major domestic travel period, especially to beach destinations — expect higher prices and crowds.' },
  panama: { name: 'Panama', season: 'Carnival (Feb/March)', impact: 'high', note: 'The days before Ash Wednesday see much of the country celebrate Carnival, especially in Las Tablas — many businesses close and domestic transport is heavily booked.' },
  belize: { name: 'Belize', season: 'No major disruptive season', impact: 'low', note: 'Belize has no single holiday period that significantly disrupts travel.' },
  'cayman-islands': { name: 'Cayman Islands', season: 'No major disruptive season', impact: 'low', note: 'The Cayman Islands have no single holiday period that significantly disrupts travel.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', season: 'No major disruptive season', impact: 'low', note: 'Antigua and Barbuda have no single holiday period that significantly disrupts travel.' },
  curacao: { name: 'Curaçao', season: 'No major disruptive season', impact: 'low', note: 'Curaçao has no single holiday period that significantly disrupts travel.' },
  canada: { name: 'Canada', season: 'No major disruptive season', impact: 'moderate', note: 'No single dominant disruptive season, though the Christmas–New Year period and Canada Day (July 1) bring higher prices and crowds in major cities.' },
  'united-arab-emirates': { name: 'United Arab Emirates', season: 'Ramadan', impact: 'moderate', note: 'During Ramadan, restaurants and cafes reduce hours or close during daylight, and business hours generally shorten — evenings, however, come alive with special events.' },
  morocco: { name: 'Morocco', season: 'Ramadan', impact: 'high', note: 'During Ramadan, many restaurants close during daylight hours outside tourist hotels, and general business hours shorten significantly — plan meals around evening iftar hours.' },
  'south-africa': { name: 'South Africa', season: 'Christmas–New Year (summer)', impact: 'moderate', note: "Falling in South Africa's summer, this is peak domestic and international travel season with higher prices and bigger crowds at coastal destinations." },
  qatar: { name: 'Qatar', season: 'Ramadan', impact: 'moderate', note: 'During Ramadan, restaurants and cafes reduce hours or close during daylight, and business hours generally shorten.' },
  israel: { name: 'Israel', season: 'Passover & the High Holidays', impact: 'high', note: 'Passover (spring) and the High Holidays (Rosh Hashanah, Yom Kippur, Sukkot in autumn) see many businesses close for one or more days, domestic travel surge, and hotel prices rise significantly.' },
  tanzania: { name: 'Tanzania', season: 'No major disruptive season', impact: 'low', note: 'Safari tourism in Tanzania is largely insulated from local holiday disruption — plan around wildlife migration season instead.' },
  kenya: { name: 'Kenya', season: 'No major disruptive season', impact: 'low', note: 'Safari tourism in Kenya is largely insulated from local holiday disruption — plan around wildlife migration season instead.' },
  argentina: { name: 'Argentina', season: 'January–February summer holidays', impact: 'moderate', note: 'Many Argentines take their main holiday in January and February — some Buenos Aires businesses close as locals head to the coast, while beach destinations get busy and pricier.' },
  peru: { name: 'Peru', season: 'No single dominant season', impact: 'moderate', note: "Peru's Independence Day (late July) and Inti Raymi festival in Cusco (June 24) both bring crowds and higher prices to their respective regions." },
  chile: { name: 'Chile', season: 'February summer holidays', impact: 'moderate', note: 'February is when Chileans themselves take their main summer holiday — Santiago can feel quieter while coastal and southern destinations get busier and pricier.' },
  colombia: { name: 'Colombia', season: 'Semana Santa (Holy Week)', impact: 'moderate', note: 'A major domestic travel period, especially to Popayán and other cities known for elaborate processions — expect higher prices and crowds.' },
  brazil: { name: 'Brazil', season: 'Carnival (Feb/March)', impact: 'high', note: "Carnival is Brazil's biggest disruption of the year — many businesses close, cities like Rio and Salvador are packed and expensive, and normal services (banks, some transport) can be limited for several days." },
  'united-states': { name: 'United States', season: 'Thanksgiving & Christmas–New Year', impact: 'moderate', note: 'Thanksgiving week is the busiest domestic air travel period of the year, and the Christmas–New Year stretch brings high prices and crowds nationwide — book well ahead for either.' },
};

const IMPACT_LABELS = {
  high: 'High Disruption',
  moderate: 'Moderate Disruption',
  low: 'Low Disruption',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const impactLabel = IMPACT_LABELS[data.impact];
  const headline = `${data.name}: ${data.season} — ${impactLabel}.`;

  return {
    country, countryName: data.name, season: data.season, impact: data.impact,
    impactLabel, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/holiday-season-checker/calculate
// @access Public
exports.calculateHolidaySeason = (req, res) => {
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
// @route POST /api/tools/holiday-season-checker/pdf
// @access Public
exports.generateHolidaySeasonPdf = async (req, res) => {
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
      [email, firstName || null, 'holiday-season-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Holiday Season Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="holiday-season-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.season} — ${result.impactLabel}`);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      'Exact dates for lunar-calendar and moveable holidays shift year to year — search the specific year of your trip to confirm.',
      'If your trip overlaps a high-disruption season, book flights, trains, and hotels as far in advance as possible — availability disappears fast.',
      'Even during high-disruption seasons, major tourist attractions and international hotels usually stay open — it\'s smaller local businesses and domestic transport that get hit hardest.',
      'A high-disruption season isn\'t necessarily a reason to avoid a trip — some, like Carnival or Songkran, are genuinely worth experiencing if you plan around them.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📅 Your ${result.countryName} holiday season guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the holiday season check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond seasonal timing? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send holiday-season-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateHolidaySeasonPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
