const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Punctuality/time culture per destination — whether showing up a few
// minutes "late" to a social invitation is rude or completely normal.
// Distinct from etiquetteController.js (general social etiquette —
// greetings, gestures, dining — not specifically about time) and
// businessHoursController.js (when places are open, not social norms
// around arrival time). punctualityLevel: 'strict' (on-time means on-time,
// even a few minutes late is noticed and can be rude) | 'moderate' (a
// short grace period is normal, but real lateness is still noticed) |
// 'relaxed' (being 15-30+ minutes late to informal/social occasions is
// completely normal and not considered rude) | 'flexible' (time is
// treated loosely even in many everyday contexts — plans commonly shift).
const COUNTRIES = {
  france: { name: 'France', punctualityLevel: 'moderate', note: "Being 10-15 minutes late to a dinner invitation at someone's home is normal and even expected — arriving early is actually considered impolite. Business meetings run more strictly on time." },
  austria: { name: 'Austria', punctualityLevel: 'strict', note: 'Punctuality is taken seriously in both business and social settings — arriving even a few minutes late without notice is noticed.' },
  'czech-republic': { name: 'Czech Republic', punctualityLevel: 'moderate', note: 'Punctuality is valued, especially in business — a short grace period for social occasions is normal, but real lateness is still noticed.' },
  denmark: { name: 'Denmark', punctualityLevel: 'strict', note: 'Danes take punctuality seriously in both work and social life — being late, even by a few minutes, without a message is genuinely considered rude.' },
  germany: { name: 'Germany', punctualityLevel: 'strict', note: 'Punctuality is a strong cultural norm in both business and social settings — arriving even 5-10 minutes late without notice can be seen as disrespectful.' },
  greece: { name: 'Greece', punctualityLevel: 'relaxed', note: 'Social plans routinely start 20-30 minutes later than stated, and nobody minds — business meetings, especially with international partners, run more on schedule.' },
  hungary: { name: 'Hungary', punctualityLevel: 'moderate', note: 'Punctuality is generally expected and appreciated — a short grace period for social occasions is normal, but real lateness stands out.' },
  iceland: { name: 'Iceland', punctualityLevel: 'moderate', note: 'Punctuality is generally valued, though a few minutes of flexibility for informal social plans is normal.' },
  italy: { name: 'Italy', punctualityLevel: 'relaxed', note: "Social invitations, especially dinners, routinely start 15-30 minutes after the stated time — arriving exactly on time to someone's home can even catch the host off guard." },
  netherlands: { name: 'Netherlands', punctualityLevel: 'strict', note: 'Punctuality is a strong cultural norm — being late without texting ahead is genuinely considered rude, in both business and social contexts.' },
  portugal: { name: 'Portugal', punctualityLevel: 'relaxed', note: 'Social plans commonly run 15-20 minutes behind schedule without anyone minding — business settings tend to be more punctual, especially in Lisbon.' },
  spain: { name: 'Spain', punctualityLevel: 'relaxed', note: 'Social gatherings, especially dinners (which start late by Northern European standards anyway), have real flexibility around arrival time — showing up "on time" to a party can mean being the first one there, awkwardly.' },
  sweden: { name: 'Sweden', punctualityLevel: 'strict', note: 'Punctuality is taken very seriously — being even a few minutes late without a heads-up is noticed and can be seen as disrespectful of others\' time.' },
  switzerland: { name: 'Switzerland', punctualityLevel: 'strict', note: 'Punctuality is a defining cultural value — arriving late, even briefly, is genuinely frowned upon in both business and social settings.' },
  ireland: { name: 'Ireland', punctualityLevel: 'relaxed', note: '"Irish time" is a real, widely acknowledged concept — social plans routinely start 15-20 minutes later than stated, and nobody takes offense.' },
  'united-kingdom': { name: 'United Kingdom', punctualityLevel: 'moderate', note: "Business meetings run on time, but arriving 5-10 minutes late to a casual social invitation is normal — showing up exactly on the dot to someone's home can even seem presumptuous." },
  turkey: { name: 'Turkey', punctualityLevel: 'relaxed', note: 'Social plans have real flexibility around start time, and being 15-20 minutes late is not considered impolite — business meetings, especially in Istanbul, tend to run closer to schedule.' },
  japan: { name: 'Japan', punctualityLevel: 'strict', note: 'Punctuality is an extremely strong cultural value — arriving even a couple of minutes late, in any context, is genuinely considered disrespectful. Trains famously run to the minute, and people plan around that expectation.' },
  thailand: { name: 'Thailand', punctualityLevel: 'relaxed', note: '"Thai time" allows real flexibility for informal social plans — being 15-30 minutes late is common and rarely remarked on, though business meetings are expected to start on schedule.' },
  indonesia: { name: 'Indonesia', punctualityLevel: 'flexible', note: '"Jam karet" ("rubber time") is a genuinely recognized cultural concept — start times for social and even some casual business plans are treated as approximate rather than fixed.' },
  singapore: { name: 'Singapore', punctualityLevel: 'strict', note: 'Punctuality is taken seriously in both business and social life, reflecting the city\'s broader efficiency-oriented culture — being late without notice is noticed.' },
  'south-korea': { name: 'South Korea', punctualityLevel: 'strict', note: 'Punctuality is a strong cultural expectation, especially in business and with elders — arriving late without a heads-up is genuinely seen as disrespectful.' },
  'hong-kong': { name: 'Hong Kong', punctualityLevel: 'moderate', note: 'Punctuality is generally expected, especially in business — a short grace period for casual social plans is normal.' },
  vietnam: { name: 'Vietnam', punctualityLevel: 'relaxed', note: 'Social plans have real flexibility, and being 15-20 minutes late is common and not considered rude — business meetings, especially with foreign partners, run closer to schedule.' },
  philippines: { name: 'Philippines', punctualityLevel: 'relaxed', note: '"Filipino time" is a real, widely acknowledged concept for social gatherings — arriving 30 minutes or more after the stated time is common and not considered impolite.' },
  malaysia: { name: 'Malaysia', punctualityLevel: 'relaxed', note: 'Social plans commonly run behind schedule without anyone minding — business meetings are expected to start closer to on time, especially in Kuala Lumpur.' },
  china: { name: 'China', punctualityLevel: 'moderate', note: 'Business punctuality is genuinely important, especially for a first meeting — social plans have somewhat more flexibility, though showing up noticeably late is still not ideal.' },
  india: { name: 'India', punctualityLevel: 'flexible', note: '"IST" is jokingly reinterpreted by locals as "Indian Stretchable Time" — a widely acknowledged concept where social and even some casual professional start times are treated loosely.' },
  maldives: { name: 'Maldives', punctualityLevel: 'relaxed', note: 'The resort-based pace of life runs on genuine "island time" — schedules are relaxed and start times for activities are treated as approximate.' },
  taiwan: { name: 'Taiwan', punctualityLevel: 'strict', note: 'Punctuality is genuinely valued in both business and social settings — arriving late without notice is noticed and can come across as inconsiderate.' },
  'sri-lanka': { name: 'Sri Lanka', punctualityLevel: 'relaxed', note: 'Social plans have real flexibility around start time — being 15-30 minutes late is common and not considered impolite.' },
  cambodia: { name: 'Cambodia', punctualityLevel: 'relaxed', note: 'Social plans run with genuine flexibility — being late by 15-20 minutes is common and unremarkable.' },
  australia: { name: 'Australia', punctualityLevel: 'moderate', note: 'Punctuality is generally expected, though a short grace period for casual social invitations is normal — nobody minds being 5-10 minutes late to a barbecue.' },
  'new-zealand': { name: 'New Zealand', punctualityLevel: 'moderate', note: 'Punctuality is generally valued, with modest flexibility for informal social plans.' },
  fiji: { name: 'Fiji', punctualityLevel: 'flexible', note: '"Fiji time" is a genuinely recognized concept locally — schedules run loosely, and visitors are expected to relax into it rather than push against it.' },
  'french-polynesia': { name: 'French Polynesia', punctualityLevel: 'flexible', note: 'Island pace of life means schedules and start times are treated as approximate for most social and casual activities.' },
  mexico: { name: 'Mexico', punctualityLevel: 'relaxed', note: '"Hora mexicana" allows genuine flexibility for social plans — being 20-30 minutes late to a gathering is common and rarely remarked on, though business meetings run closer to schedule.' },
  'dominican-republic': { name: 'Dominican Republic', punctualityLevel: 'relaxed', note: 'Social plans have real flexibility around start time — being 20-30 minutes late is common and unremarkable.' },
  'puerto-rico': { name: 'Puerto Rico', punctualityLevel: 'relaxed', note: '"Hora puertorriqueña" is a real, acknowledged concept — social gatherings routinely start well after the stated time.' },
  bahamas: { name: 'Bahamas', punctualityLevel: 'relaxed', note: 'Genuine island-time pacing applies to most social plans — schedules are treated loosely outside of structured tours and transport.' },
  jamaica: { name: 'Jamaica', punctualityLevel: 'relaxed', note: '"Jamaican time" (or "soon come") is a real, widely acknowledged concept — social plans have real flexibility and lateness is rarely remarked on.' },
  aruba: { name: 'Aruba', punctualityLevel: 'relaxed', note: 'A relaxed island pace applies to most social plans — schedules are treated loosely outside of structured tours.' },
  'turks-and-caicos': { name: 'Turks and Caicos', punctualityLevel: 'relaxed', note: 'A relaxed island pace applies to most social plans — schedules are treated loosely outside of structured activities.' },
  'st-lucia': { name: 'St. Lucia', punctualityLevel: 'relaxed', note: 'A relaxed island pace applies to most social plans — schedules are treated loosely outside of structured tours.' },
  'costa-rica': { name: 'Costa Rica', punctualityLevel: 'relaxed', note: '"Tico time" is a real, locally acknowledged concept — social plans have genuine flexibility, and lateness is rarely remarked on.' },
  panama: { name: 'Panama', punctualityLevel: 'relaxed', note: 'Social plans have real flexibility around start time — business meetings in Panama City tend to run closer to schedule.' },
  belize: { name: 'Belize', punctualityLevel: 'relaxed', note: 'A relaxed Caribbean pace applies to most social plans — schedules are treated loosely outside of structured tours.' },
  'cayman-islands': { name: 'Cayman Islands', punctualityLevel: 'moderate', note: 'As a financial-services hub, business punctuality is genuinely expected — social plans carry the more relaxed Caribbean flexibility typical of the region.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', punctualityLevel: 'relaxed', note: 'A relaxed island pace applies to most social plans — schedules are treated loosely outside of structured activities.' },
  curacao: { name: 'Curaçao', punctualityLevel: 'relaxed', note: 'A relaxed island pace applies to most social plans — schedules are treated loosely outside of structured tours.' },
  canada: { name: 'Canada', punctualityLevel: 'moderate', note: 'Punctuality is generally expected, with a modest grace period considered normal for casual social invitations.' },
  'united-arab-emirates': { name: 'United Arab Emirates', punctualityLevel: 'moderate', note: 'Business meetings are generally expected to start on time, though social gatherings often begin somewhat later than the stated time without anyone minding.' },
  morocco: { name: 'Morocco', punctualityLevel: 'flexible', note: 'Social and even some casual business plans are treated with real flexibility — start times routinely shift, and patience is expected of visitors.' },
  'south-africa': { name: 'South Africa', punctualityLevel: 'moderate', note: 'Punctuality is generally expected in business settings, with a bit more flexibility for informal social plans.' },
  qatar: { name: 'Qatar', punctualityLevel: 'moderate', note: 'Business meetings are generally expected to start close to on time, though some flexibility for social gatherings is normal.' },
  israel: { name: 'Israel', punctualityLevel: 'moderate', note: 'Business punctuality is generally expected, though Israeli social culture is famously informal and relaxed about exact start times for gatherings.' },
  tanzania: { name: 'Tanzania', punctualityLevel: 'flexible', note: '"African time" is a widely acknowledged regional concept — social and many casual plans are treated with genuine flexibility, and visitors are expected to adjust their expectations accordingly.' },
  kenya: { name: 'Kenya', punctualityLevel: 'flexible', note: '"African time" is a widely acknowledged regional concept — social and many casual plans are treated with genuine flexibility, especially outside of formal business settings.' },
  argentina: { name: 'Argentina', punctualityLevel: 'relaxed', note: '"Hora argentina" is a real, locally acknowledged concept — dinners often start well after 9-10pm and social plans have real flexibility around timing.' },
  peru: { name: 'Peru', punctualityLevel: 'relaxed', note: 'Social plans have genuine flexibility around start time — business meetings, especially in Lima, run closer to schedule.' },
  chile: { name: 'Chile', punctualityLevel: 'moderate', note: 'Chile is often noted as more punctuality-conscious than much of the rest of Latin America, especially in business — social plans still carry some flexibility.' },
  colombia: { name: 'Colombia', punctualityLevel: 'relaxed', note: '"Hora colombiana" allows genuine flexibility for social plans — arriving 20-30 minutes after the stated time is common and unremarkable.' },
  brazil: { name: 'Brazil', punctualityLevel: 'relaxed', note: '"Hora brasileira" is a real, widely acknowledged concept — social gatherings routinely start well after the stated time, and showing up exactly on time can mean waiting for the host.' },
  'united-states': { name: 'United States', punctualityLevel: 'moderate', note: 'Business punctuality is generally expected and taken seriously — casual social invitations carry a commonly understood 10-15 minute grace period.' },
};

const PUNCTUALITY_LABELS = {
  strict: 'Strict — On Time Means On Time',
  moderate: "Moderate — A Few Minutes' Grace Is Normal",
  relaxed: 'Relaxed — Social Lateness Is Expected',
  flexible: 'Flexible — Time Is Treated Loosely',
};

const DISCLAIMER = "This reflects general social norms, not business-context rules — professional meetings tend to run more punctually than social gatherings almost everywhere, regardless of a country's overall reputation. When in doubt, showing up on time is never the wrong call.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const punctualityLabel = PUNCTUALITY_LABELS[data.punctualityLevel];
  const headline = `${data.name}: ${punctualityLabel}.`;

  return {
    country, countryName: data.name, punctualityLevel: data.punctualityLevel, punctualityLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/punctuality-checker/calculate
// @access Public
exports.calculatePunctuality = (req, res) => {
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
// @route POST /api/tools/punctuality-checker/pdf
// @access Public
exports.generatePunctualityPdf = async (req, res) => {
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
      [email, firstName || null, 'punctuality-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Punctuality & Time Culture Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="punctuality-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.punctualityLabel);

    pdfService.heading(doc, 'General time-culture tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'For business meetings anywhere in the world, default to arriving on time or a few minutes early — the downside of being early is minimal, but being late to a professional meeting is rarely well received, regardless of local social norms.',
      'If you\'re invited to someone\'s home in a "relaxed" or "flexible" culture, arriving exactly on time can be awkward — a short buffer after the stated time is often genuinely more considerate.',
      'When plans run late in a relaxed-time culture, resist the urge to visibly show frustration — it reads as a bigger deal to you than it does to your hosts.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `⏰ Your ${result.countryName} punctuality guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the punctuality check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond time culture? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send punctuality-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePunctualityPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
