const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Weekend days + typical business hours + closure pattern per country.
// closurePattern: 'siesta' (long midday/afternoon closure) | 'friday-
// prayer' (businesses close briefly around Friday midday prayers) |
// 'sunday-closing' (most shops closed/reduced on Sundays) | 'standard'
// (no major recurring closure to plan around).
const COUNTRIES = {
  china: { name: 'China', weekendDays: 'Saturday and Sunday', businessHours: 'Shops and malls: roughly 10am-10pm daily, including weekends', closurePattern: 'standard', note: 'Government offices and banks typically run Monday-Friday, 9am-5pm, and are closed on weekends. Retail and restaurants operate long, consistent hours seven days a week.' },
  'united-arab-emirates': { name: 'United Arab Emirates', weekendDays: 'Saturday and Sunday (shifted from the traditional Friday-Saturday weekend in 2022, with a shortened Friday)', businessHours: 'Shops and malls: 10am-10pm/midnight, seven days a week', closurePattern: 'friday-prayer', note: 'The federal government moved to a Saturday-Sunday weekend in January 2022, with Friday now a half working day that includes a break for midday prayers. Malls and retail generally stay open long hours regardless.' },
  'saudi-arabia': { name: 'Saudi Arabia', weekendDays: 'Friday and Saturday', businessHours: 'Most businesses: 9am-1pm and 4pm-9pm, split by a midday break', closurePattern: 'friday-prayer', note: 'Business hours often split around midday prayer times, especially on Friday, when many shops close from late morning until after Friday prayers.' },
  turkey: { name: 'Turkey', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: roughly 9am/10am-7pm/8pm, many staying open through lunch', closurePattern: 'standard', note: 'Government offices and banks follow standard Monday-Friday hours; shops and bazaars often stay open later into the evening, especially in tourist areas.' },
  vietnam: { name: 'Vietnam', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: often 8am-9pm or later, seven days a week', closurePattern: 'standard', note: 'Government offices typically close for a midday lunch break (11:30am-1:30pm) and on weekends, but shops, markets, and restaurants tend to stay open long hours daily.' },
  egypt: { name: 'Egypt', weekendDays: 'Friday and Saturday', businessHours: 'Shops: 10am-10pm or later, though hours shift during Ramadan', closurePattern: 'friday-prayer', note: 'Friday is the main prayer day, so many businesses open later or close briefly around midday prayers. Ramadan significantly shortens daytime hours and shifts activity to evening.' },
  morocco: { name: 'Morocco', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-1pm and 3pm-7pm, split by a midday break', closurePattern: 'friday-prayer', note: 'Friday midday sees many businesses close briefly for prayers. During Ramadan, hours shift substantially, with many businesses opening later and closing overnight.' },
  india: { name: 'India', weekendDays: 'Saturday and Sunday, though many shops open all 7 days', businessHours: 'Shops: 10am/11am-8pm/9pm', closurePattern: 'standard', note: 'Government offices and banks follow a Monday-Friday/Saturday schedule (varies by state and institution) with a midday lunch break; retail shops often stay open seven days a week.' },
  indonesia: { name: 'Indonesia', weekendDays: 'Saturday and Sunday', businessHours: 'Shops and malls: 10am-10pm, seven days a week', closurePattern: 'friday-prayer', note: 'Friday midday prayers can briefly affect business hours in more traditional areas, though malls and tourist-area shops generally stay open.' },
  thailand: { name: 'Thailand', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-9pm or later, seven days a week', closurePattern: 'standard', note: 'Government offices follow Monday-Friday hours with a lunch break; retail, malls, and markets typically stay open daily with long hours.' },
  singapore: { name: 'Singapore', weekendDays: 'Saturday and Sunday', businessHours: 'Malls and shops: 10am/11am-9pm/10pm, seven days a week', closurePattern: 'standard', note: 'Singapore retail runs long, consistent hours every day of the week — closures for lunch or prayer are uncommon outside smaller family-run shops.' },

  'united-states': { name: 'United States', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-6pm/9pm, many open weekends too', closurePattern: 'standard', note: 'Business hours vary by state and city, but most retail stays open seven days a week, including reduced Sunday hours in some smaller towns.' },
  canada: { name: 'Canada', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-6pm/9pm, most open weekends', closurePattern: 'standard', note: 'Similar to the US — most retail is open seven days a week, though smaller towns may have reduced Sunday hours.' },
  mexico: { name: 'Mexico', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-8pm, many with a midday slowdown', closurePattern: 'standard', note: 'Smaller local businesses sometimes close for a midday break, especially outside major cities, but malls and chain stores keep consistent hours.' },
  brazil: { name: 'Brazil', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-6pm/7pm on weekdays, shorter hours Saturday, many closed Sunday', closurePattern: 'sunday-closing', note: 'Many smaller shops close on Sundays, though malls and larger retail centers typically stay open.' },
  argentina: { name: 'Argentina', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-8pm, some with a midday break outside Buenos Aires', closurePattern: 'siesta', note: 'Smaller towns outside Buenos Aires often observe a midday closure; the capital itself generally keeps continuous hours.' },
  chile: { name: 'Chile', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-8pm, malls open on weekends', closurePattern: 'standard', note: 'Retail hours are fairly consistent throughout the week, including weekends, especially in Santiago.' },
  colombia: { name: 'Colombia', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-7pm/8pm', closurePattern: 'standard', note: 'Malls and larger shops keep consistent hours all week; smaller local shops may have more variable hours.' },
  peru: { name: 'Peru', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-8pm, some with a midday break outside Lima', closurePattern: 'siesta', note: 'Smaller towns and markets outside Lima sometimes observe a midday slowdown.' },
  'costa-rica': { name: 'Costa Rica', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 8am/9am-6pm/7pm', closurePattern: 'standard', note: 'Business hours are fairly consistent, though some smaller sodas (local eateries) and shops close earlier on Sundays.' },

  'united-kingdom': { name: 'United Kingdom', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-5:30pm/6pm weekdays, reduced Sunday hours (often 11am-5pm by law for larger stores)', closurePattern: 'sunday-closing', note: 'Larger stores are legally restricted to 6 hours of trading on Sundays in England and Wales — plan around shorter Sunday hours.' },
  ireland: { name: 'Ireland', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-6pm weekdays, often shorter hours Sunday', closurePattern: 'sunday-closing', note: 'Many shops have reduced Sunday hours; smaller towns may see earlier closing times overall.' },
  france: { name: 'France', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-7pm, many closed Sunday and Monday morning', closurePattern: 'sunday-closing', note: 'Small and mid-size shops are frequently closed on Sundays and sometimes Monday mornings — plan grocery and errands accordingly. Many also close for a midday lunch break outside major cities.' },
  germany: { name: 'Germany', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-8pm weekdays, shorter Saturday hours, almost everything closed Sunday', closurePattern: 'sunday-closing', note: 'Sunday closing is strictly observed by law for most retail — supermarkets and shops are closed, so stock up on Saturday.' },
  italy: { name: 'Italy', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-1pm and 3:30pm/4pm-7:30pm, split by a midday break', closurePattern: 'siesta', note: 'Many shops, especially outside major cities and tourist centers, close for a few hours in the early afternoon (riposo) and reopen later.' },
  spain: { name: 'Spain', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-1:30pm/2pm and 4:30pm/5pm-8pm/8:30pm', closurePattern: 'siesta', note: 'The traditional siesta closure (roughly 2pm-5pm) is still common outside major cities and tourist zones — plan errands for morning or evening.' },
  netherlands: { name: 'Netherlands', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-6pm weekdays, many closed Sunday morning or all day in smaller towns', closurePattern: 'sunday-closing', note: 'Sunday trading has expanded in major cities but is still limited in smaller towns — check locally before planning Sunday errands.' },
  portugal: { name: 'Portugal', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-7pm weekdays, shorter Saturday hours, many closed Sunday', closurePattern: 'sunday-closing', note: 'Smaller shops often close on Sundays and for a midday break; malls and larger stores keep more consistent hours.' },
  greece: { name: 'Greece', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: split hours, roughly 9am-2:30pm and 5:30pm-8:30pm depending on the day', closurePattern: 'siesta', note: 'Greek retail hours follow a distinctive split schedule that varies by day of the week — many shops close for the afternoon on some days and stay open straight through on others (often Tuesday, Thursday, and Friday).' },
  austria: { name: 'Austria', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-6pm/6:30pm weekdays, shorter Saturday hours, almost everything closed Sunday', closurePattern: 'sunday-closing', note: 'Sunday closing is strictly observed — supermarkets and most retail are closed, so plan grocery shopping for Saturday.' },
  switzerland: { name: 'Switzerland', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-6:30pm/7pm weekdays, shorter Saturday hours, almost everything closed Sunday', closurePattern: 'sunday-closing', note: 'Sunday closing is the norm nationwide, with limited exceptions like train station shops and some tourist-area stores.' },
  poland: { name: 'Poland', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-8pm/9pm, though Sunday trading for larger stores has been periodically restricted', closurePattern: 'standard', note: "Poland has periodically restricted Sunday trading for larger stores in recent years — check current rules, as they've shifted, though smaller shops and restaurants generally stay open." },
  'czech-republic': { name: 'Czech Republic', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-8pm, many open all weekend', closurePattern: 'standard', note: 'Retail hours are fairly consistent through the week, including weekends, especially in Prague and larger cities.' },
  norway: { name: 'Norway', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am/10am-8pm weekdays, shorter Saturday hours, most closed Sunday', closurePattern: 'sunday-closing', note: 'Sunday closing is the norm for most retail by law, with exceptions for small convenience stores and some tourist-area shops.' },
  sweden: { name: 'Sweden', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-7pm weekdays, often shorter hours weekends', closurePattern: 'standard', note: 'Many shops in cities stay open on Sundays with reduced hours, though smaller towns may see more limited weekend hours.' },
  denmark: { name: 'Denmark', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-6pm/7pm weekdays, shorter weekend hours', closurePattern: 'standard', note: 'Sunday trading is generally allowed, though hours are often shorter than on weekdays.' },
  iceland: { name: 'Iceland', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-6pm/7pm weekdays, shorter weekend hours', closurePattern: 'standard', note: 'Retail hours are fairly consistent, with somewhat reduced hours on Sundays, especially outside Reykjavík.' },

  japan: { name: 'Japan', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-8pm/9pm, seven days a week', closurePattern: 'standard', note: 'Japanese retail keeps remarkably consistent hours all week, including weekends and most public holidays — convenience stores are frequently open 24/7.' },
  'south-korea': { name: 'South Korea', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 10am-9pm/10pm, seven days a week', closurePattern: 'standard', note: 'Retail hours are long and consistent throughout the week; large discount marts are legally required to close on certain Sundays each month — check locally.' },
  malaysia: { name: 'Malaysia', weekendDays: 'Saturday and Sunday nationally (Friday and Saturday in a few states like Kelantan and Terengganu)', businessHours: 'Shops and malls: 10am-10pm, seven days a week', closurePattern: 'friday-prayer', note: 'Friday midday prayers affect business hours in more traditional and Muslim-majority areas, and a couple of states officially observe a Friday-Saturday weekend instead of the national Saturday-Sunday standard.' },
  philippines: { name: 'Philippines', weekendDays: 'Saturday and Sunday', businessHours: 'Malls: 10am-9pm/10pm, seven days a week', closurePattern: 'standard', note: 'Malls and shopping centers keep long, consistent hours all week, including weekends and most holidays.' },

  israel: { name: 'Israel', weekendDays: 'Friday and Saturday (Shabbat)', businessHours: 'Shops: 9am-7pm Sunday-Thursday, shorter hours Friday, most closed Saturday', closurePattern: 'friday-prayer', note: 'Shabbat (Friday sundown to Saturday sundown) sees most businesses, public transport, and government offices closed — plan groceries and errands for before Friday afternoon.' },
  jordan: { name: 'Jordan', weekendDays: 'Friday and Saturday', businessHours: 'Shops: 9am-1pm and 4pm-8pm, split by a midday break', closurePattern: 'friday-prayer', note: 'Friday midday prayers mean many businesses close briefly; during Ramadan, hours shift substantially toward the evening.' },
  kenya: { name: 'Kenya', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 8am/9am-6pm/7pm weekdays, shorter Sunday hours', closurePattern: 'standard', note: 'Business hours are fairly consistent through the week; some smaller shops close earlier or stay shut on Sunday mornings.' },
  'south-africa': { name: 'South Africa', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-5pm/6pm weekdays, shorter hours Saturday and Sunday', closurePattern: 'standard', note: 'Malls generally stay open all week with slightly reduced weekend hours; smaller shops may close earlier or be closed Sunday.' },

  australia: { name: 'Australia', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-5:30pm weekdays, later on designated late-night shopping days, shorter weekend hours', closurePattern: 'standard', note: 'Trading hours vary by state, with some regions still restricting broader Sunday or public holiday trading for smaller retailers.' },
  'new-zealand': { name: 'New Zealand', weekendDays: 'Saturday and Sunday', businessHours: 'Shops: 9am-5:30pm weekdays, similar hours on weekends in cities', closurePattern: 'standard', note: 'Retail hours are fairly consistent across the week in cities; smaller towns may have reduced hours, especially on Sundays.' },
};

const CLOSURE_LABELS = {
  siesta: 'many shops and businesses close for a long midday/afternoon break, so plan errands for morning or evening',
  'friday-prayer': 'many businesses close briefly around midday Friday for prayers, and the weekly rhythm shifts around that',
  'sunday-closing': 'most shops are closed or have sharply reduced hours on Sundays, so plan ahead',
  standard: 'business hours are fairly consistent with no major recurring closure to plan around',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s weekend is ${data.weekendDays}. ${CLOSURE_LABELS[data.closurePattern]}.`;

  return {
    country, countryName: data.name, weekendDays: data.weekendDays, businessHours: data.businessHours,
    closurePattern: data.closurePattern, closurePatternLabel: CLOSURE_LABELS[data.closurePattern],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/business-hours-checker/calculate
// @access Public
exports.calculateBusinessHours = (req, res) => {
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
// @route POST /api/tools/business-hours-checker/pdf
// @access Public
exports.generateBusinessHoursPdf = async (req, res) => {
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
      [email, firstName || null, 'business-hours-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Business Hours & Weekend Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="business-hours-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Typical hours: ${result.businessHours}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.closurePattern === 'sunday-closing'
        ? "Do your grocery shopping and essential errands before Sunday — many shops, including supermarkets, will be closed or have very limited hours."
        : result.closurePattern === 'siesta'
        ? "Plan errands and shopping for the morning or evening — many local businesses close for a long midday break, especially outside major cities."
        : result.closurePattern === 'friday-prayer'
        ? "Avoid scheduling errands or business visits around Friday midday — many businesses pause briefly for prayers."
        : "Business hours here are fairly predictable day to day, but always double-check hours for smaller or family-run businesses.",
      `Remember the weekend here is ${result.weekendDays} — don't assume it matches your home country's schedule when planning activities or business meetings.`,
      'Public holidays can override normal hours entirely — check TravelSmarter\'s Public Holiday Checker for exact dates before you finalize your itinerary.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🕒 Your ${result.countryName} business hours & weekend guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your business hours check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond scheduling logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send business-hours-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateBusinessHoursPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
