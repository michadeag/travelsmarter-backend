const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Standard greeting style and personal-space expectations per destination —
// distinct from etiquetteController.js (general taboos/rules) and
// dressCodeController.js (clothing). greetingStyle: 'handshake' (a firm
// handshake is the standard, expected greeting, including with strangers
// and in business contexts) | 'cheek-kiss' (cheek kissing or air-kissing
// between acquaintances, sometimes alongside a handshake, is normal and
// expected in social settings) | 'bow' (a bow, wai, or non-contact gesture
// is the standard respectful greeting, and physical contact with
// strangers is generally avoided) | 'minimal-contact' (a light handshake
// or verbal greeting is fine, but personal space is valued and closer
// contact like hugging or cheek-kissing is reserved for close relationships).
const COUNTRIES = {
  france: { name: 'France', greetingStyle: 'cheek-kiss', note: '"La bise" (cheek kissing, usually twice) is the standard greeting between people who know each other, even casually — a handshake is fine for first business meetings, but expect cheek kisses to follow once you\'re acquainted.' },
  austria: { name: 'Austria', greetingStyle: 'handshake', note: 'A firm handshake with eye contact is the standard greeting, especially in business — it stays the default even after you know someone well.' },
  'czech-republic': { name: 'Czech Republic', greetingStyle: 'handshake', note: 'A firm handshake is the standard greeting, especially with new acquaintances or in business — closer friends may add a light cheek kiss.' },
  denmark: { name: 'Denmark', greetingStyle: 'handshake', note: 'A brief, firm handshake is the standard greeting — Danes generally keep more physical distance than southern Europeans, even among friends.' },
  germany: { name: 'Germany', greetingStyle: 'handshake', note: 'A firm handshake with direct eye contact is the standard greeting in both business and social settings, and it is used more consistently here than almost anywhere else.' },
  greece: { name: 'Greece', greetingStyle: 'cheek-kiss', note: 'A handshake is normal for first meetings, but cheek kissing (usually once on each cheek) is standard between friends and family, and happens quickly once you are acquainted.' },
  hungary: { name: 'Hungary', greetingStyle: 'handshake', note: 'A firm handshake is the standard greeting — closer friends and family may add a light cheek kiss, but a handshake is always safe.' },
  iceland: { name: 'Iceland', greetingStyle: 'handshake', note: 'A relaxed handshake is the standard greeting — Icelanders are generally reserved with physical contact outside close relationships.' },
  italy: { name: 'Italy', greetingStyle: 'cheek-kiss', note: 'Cheek kissing (usually on both cheeks) is standard between acquaintances, alongside warm, expressive body language — a handshake works for first business meetings.' },
  netherlands: { name: 'Netherlands', greetingStyle: 'handshake', note: 'A firm handshake is the standard greeting — three cheek kisses are common among friends and family, but a handshake is the safe default with new people.' },
  portugal: { name: 'Portugal', greetingStyle: 'cheek-kiss', note: 'Cheek kissing (usually twice, starting with the right cheek) is standard between women and between men and women who know each other — men typically shake hands with each other.' },
  spain: { name: 'Spain', greetingStyle: 'cheek-kiss', note: 'Cheek kissing (twice, starting with the right cheek) is the standard greeting between women and between men and women, even on first meeting in social settings.' },
  sweden: { name: 'Sweden', greetingStyle: 'handshake', note: 'A brief, firm handshake is the standard greeting — Swedes generally value personal space and keep physical contact minimal outside close relationships.' },
  switzerland: { name: 'Switzerland', greetingStyle: 'cheek-kiss', note: 'A handshake is standard for first and business meetings, but three cheek kisses are common once you are acquainted, especially in French- and Italian-speaking regions.' },
  ireland: { name: 'Ireland', greetingStyle: 'handshake', note: 'A relaxed handshake is the standard greeting — Irish social interactions are warm but generally not physically demonstrative with new acquaintances.' },
  'united-kingdom': { name: 'United Kingdom', greetingStyle: 'handshake', note: 'A polite handshake is the standard greeting, especially on first meeting — the British generally value personal space and keep initial contact reserved.' },
  turkey: { name: 'Turkey', greetingStyle: 'cheek-kiss', note: 'A handshake is standard for first meetings, but a single cheek kiss (or air-kiss) alongside a handshake is common once acquainted, particularly among the same gender.' },
  japan: { name: 'Japan', greetingStyle: 'bow', note: 'A bow is the traditional and still-common greeting, with depth signaling respect — physical contact like handshaking or hugging with people you\'ve just met is unusual, though handshakes are increasingly used in international business.' },
  thailand: { name: 'Thailand', greetingStyle: 'bow', note: 'The "wai" — pressed-together palms with a slight bow — is the traditional greeting, and it is genuinely appreciated when visitors attempt it; physical contact with strangers, including handshakes, is less common.' },
  indonesia: { name: 'Indonesia', greetingStyle: 'minimal-contact', note: 'A light handshake (sometimes with a slight bow or hand-to-chest gesture afterward) is standard, but keep it gentle — a firm Western-style handshake can come across as overly forceful.' },
  singapore: { name: 'Singapore', greetingStyle: 'handshake', note: 'A handshake is the standard, expected greeting across Singapore\'s multicultural population, though it may be lighter or briefer than a typical Western handshake.' },
  'south-korea': { name: 'South Korea', greetingStyle: 'bow', note: 'A slight bow, often combined with a handshake in business or with foreigners, is the standard respectful greeting — the bow depth signals the level of respect.' },
  'hong-kong': { name: 'Hong Kong', greetingStyle: 'handshake', note: 'A handshake is the standard greeting in this internationally-influenced business culture — a light nod may accompany it as a sign of respect.' },
  vietnam: { name: 'Vietnam', greetingStyle: 'minimal-contact', note: 'A light handshake is standard, especially in business — a nod or slight bow is also common, and physical contact with strangers is generally kept minimal.' },
  philippines: { name: 'Philippines', greetingStyle: 'handshake', note: 'A warm handshake is the standard greeting — with elders, some Filipinos use "mano" (touching the elder\'s hand to their forehead) as a sign of respect, which visitors aren\'t expected to replicate.' },
  malaysia: { name: 'Malaysia', greetingStyle: 'minimal-contact', note: 'A light handshake is common, but many Muslim Malaysians (especially women) may prefer a nod or hand-on-heart gesture instead of physical contact between genders — wait to see if a hand is offered.' },
  china: { name: 'China', greetingStyle: 'handshake', note: 'A handshake, sometimes with a slight nod, is the standard greeting in business and social settings — it tends to be lighter than a typical Western handshake.' },
  india: { name: 'India', greetingStyle: 'minimal-contact', note: 'The "namaste" (pressed palms with a slight bow) is a common and appreciated greeting, especially with elders; handshakes are common in business, but cross-gender physical contact is often more reserved.' },
  maldives: { name: 'Maldives', greetingStyle: 'minimal-contact', note: 'A handshake is common between men, and a nod or verbal greeting is standard between genders in this predominantly Muslim country — wait for a hand to be offered before initiating cross-gender contact.' },
  taiwan: { name: 'Taiwan', greetingStyle: 'handshake', note: 'A light handshake, sometimes with a slight nod, is the standard greeting — a genuine, gentle handshake is generally appreciated over an overly firm one.' },
  'sri-lanka': { name: 'Sri Lanka', greetingStyle: 'minimal-contact', note: 'The "ayubowan" gesture (pressed palms with a slight bow, similar to namaste) is a traditional and respectful greeting — handshakes are common in business, but keep cross-gender contact reserved unless a hand is offered.' },
  cambodia: { name: 'Cambodia', greetingStyle: 'bow', note: 'The "sampeah" — pressed palms with a bow, the height signaling respect — is the traditional greeting, and it\'s appreciated when visitors attempt it, though handshakes are also common with foreigners.' },
  australia: { name: 'Australia', greetingStyle: 'handshake', note: 'A relaxed, firm handshake is the standard greeting — Australians tend to be informal and friendly from the first meeting.' },
  'new-zealand': { name: 'New Zealand', greetingStyle: 'handshake', note: 'A relaxed, firm handshake is the standard greeting — in some Māori cultural contexts, the "hongi" (pressing noses and foreheads together) may be offered, but this is not expected of visitors.' },
  fiji: { name: 'Fiji', greetingStyle: 'handshake', note: 'A warm handshake, often accompanied by "bula" (a friendly greeting), is standard — Fijian culture is generally warm and welcoming from the first meeting.' },
  'french-polynesia': { name: 'French Polynesia', greetingStyle: 'cheek-kiss', note: 'A cheek kiss or two, reflecting French cultural influence, is common among acquaintances, alongside warm, relaxed Polynesian hospitality — a handshake works fine for first meetings.' },
  mexico: { name: 'Mexico', greetingStyle: 'cheek-kiss', note: 'A handshake is standard for first and business meetings, but a single cheek kiss (or air-kiss) is common between women and between men and women once acquainted.' },
  'dominican-republic': { name: 'Dominican Republic', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between women and between men and women, even on first meeting in social settings — men typically shake hands with each other.' },
  'puerto-rico': { name: 'Puerto Rico', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common, warm greeting between women and between men and women, reflecting broader Latin American norms — men typically shake hands with each other.' },
  bahamas: { name: 'Bahamas', greetingStyle: 'handshake', note: 'A warm, friendly handshake is the standard greeting, often accompanied by genuine small talk — Bahamian culture is generally relaxed and welcoming.' },
  jamaica: { name: 'Jamaica', greetingStyle: 'handshake', note: 'A warm handshake is the standard greeting — Jamaican social culture is generally friendly and expressive, though physical contact with new acquaintances stays at a handshake.' },
  aruba: { name: 'Aruba', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between acquaintances, reflecting Dutch and Latin American cultural influence — a handshake works fine for first meetings.' },
  'turks-and-caicos': { name: 'Turks and Caicos', greetingStyle: 'handshake', note: 'A warm handshake is the standard greeting, reflecting relaxed Caribbean hospitality — physical contact with new acquaintances generally stays at a handshake.' },
  'st-lucia': { name: 'St. Lucia', greetingStyle: 'handshake', note: 'A warm handshake is the standard greeting — St. Lucian culture is generally friendly, though physical contact with new acquaintances stays at a handshake.' },
  'costa-rica': { name: 'Costa Rica', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between women and between men and women, reflecting broader Latin American norms — men typically shake hands with each other.' },
  panama: { name: 'Panama', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between women and between men and women, reflecting broader Latin American norms — men typically shake hands with each other.' },
  belize: { name: 'Belize', greetingStyle: 'handshake', note: 'A warm handshake is the standard greeting across Belize\'s culturally diverse population — physical contact with new acquaintances generally stays at a handshake.' },
  'cayman-islands': { name: 'Cayman Islands', greetingStyle: 'handshake', note: 'A warm, polite handshake is the standard greeting, reflecting the islands\' relaxed but somewhat formal British-Caribbean culture.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', greetingStyle: 'handshake', note: 'A warm handshake is the standard greeting — Antiguan culture is generally friendly, though physical contact with new acquaintances stays at a handshake.' },
  curacao: { name: 'Curaçao', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between acquaintances, reflecting Dutch and Latin American cultural influence — a handshake works fine for first meetings.' },
  canada: { name: 'Canada', greetingStyle: 'handshake', note: 'A friendly, firm handshake is the standard greeting across Canada — it stays the default in both business and social settings.' },
  'united-arab-emirates': { name: 'United Arab Emirates', greetingStyle: 'minimal-contact', note: 'A handshake is standard between men, but wait for an Emirati woman to offer her hand first, as some prefer a nod or hand-on-heart gesture instead of cross-gender physical contact.' },
  morocco: { name: 'Morocco', greetingStyle: 'minimal-contact', note: 'A handshake is common between men, and a hand-on-heart gesture often follows as a sign of warmth — wait for a woman to offer her hand before initiating cross-gender contact.' },
  'south-africa': { name: 'South Africa', greetingStyle: 'handshake', note: 'A firm handshake is the standard greeting across South Africa\'s diverse population — some greetings include a longer handshake with a grip shift as a sign of friendliness.' },
  qatar: { name: 'Qatar', greetingStyle: 'minimal-contact', note: 'A handshake is standard between men, but wait for a Qatari woman to offer her hand first, as many prefer a nod or verbal greeting instead of cross-gender physical contact.' },
  israel: { name: 'Israel', greetingStyle: 'handshake', note: 'A firm handshake is the standard greeting in most contexts — note that some Orthodox Jewish individuals avoid cross-gender physical contact, so it\'s fine to wait and see if a hand is offered.' },
  tanzania: { name: 'Tanzania', greetingStyle: 'handshake', note: 'A warm, often lingering handshake is the standard greeting, sometimes continuing throughout a conversation as a sign of friendliness and respect, particularly with elders.' },
  kenya: { name: 'Kenya', greetingStyle: 'handshake', note: 'A warm handshake, often somewhat prolonged, is the standard greeting — a firm grip and direct eye contact are generally seen as a sign of respect.' },
  argentina: { name: 'Argentina', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is the standard greeting between virtually everyone — women and men, and even men with men in many social contexts — right from the first meeting.' },
  peru: { name: 'Peru', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between women and between men and women, reflecting broader Latin American norms — men typically shake hands with each other.' },
  chile: { name: 'Chile', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between women and between men and women, reflecting broader Latin American norms — men typically shake hands with each other.' },
  colombia: { name: 'Colombia', greetingStyle: 'cheek-kiss', note: 'A single cheek kiss is a common greeting between women and between men and women, reflecting broader Latin American norms — men typically shake hands with each other.' },
  brazil: { name: 'Brazil', greetingStyle: 'cheek-kiss', note: 'Cheek kissing (once or twice, depending on region) between women and between men and women is standard and happens quickly, even on first meeting — men typically shake hands with each other.' },
  'united-states': { name: 'United States', greetingStyle: 'handshake', note: 'A firm handshake is the standard greeting, especially in business — hugging is reserved for closer friends and family, though it varies by region and setting.' },
};

const GREETING_LABELS = {
  handshake: 'Handshake — The Standard Greeting',
  'cheek-kiss': 'Cheek Kiss — Common Between Acquaintances',
  bow: 'Bow or Non-Contact Gesture — The Traditional Greeting',
  'minimal-contact': 'Minimal Contact — Personal Space Is Valued',
};

const DISCLAIMER = "This reflects the general, most common pattern for a destination, not a fixed rule — greeting style varies by region, generation, and setting, and it's always fine to follow the other person's lead or offer a simple handshake if you're unsure.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const greetingLabel = GREETING_LABELS[data.greetingStyle];
  const headline = `${data.name}: ${greetingLabel}.`;

  return {
    country, countryName: data.name, greetingStyle: data.greetingStyle, greetingLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/greeting-checker/calculate
// @access Public
exports.calculateGreeting = (req, res) => {
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
// @route POST /api/tools/greeting-checker/pdf
// @access Public
exports.generateGreetingPdf = async (req, res) => {
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
      [email, firstName || null, 'greeting-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Greeting Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="greeting-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.greetingLabel);

    pdfService.heading(doc, 'General greeting tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'When in doubt, a light handshake or friendly nod is a safe default almost anywhere in the world.',
      'Let the other person initiate closer contact like a hug or cheek kiss — following their lead avoids any awkwardness.',
      'In cross-gender situations in more conservative destinations, it\'s polite to wait and see if a hand is offered before extending yours.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `👋 Your ${result.countryName} greeting guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the greeting norm check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond greetings? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send greeting-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateGreetingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
