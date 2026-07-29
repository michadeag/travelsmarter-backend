const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Solo female travel safety orientation per country — distinct from
// travelAdvisoryController.js (general crime/terrorism risk affecting all
// travelers) and dressCodeController.js (general modesty norms for
// everyone). This is specifically about unwanted-attention risk
// (catcalling, staring, groping on crowded transit) and practical
// considerations unique to women traveling alone. riskLevel: 'low'
// (minimal unwanted attention reported) | 'moderate' (persistent but
// generally non-violent catcalling/staring is commonly reported —
// millions of women still visit safely) | 'high' (a well-documented,
// frequently-cited concern requiring real extra caution). This is
// deliberately a general orientation, not real-time data — every result,
// PDF, and email carries a disclaimer pointing to current, crowd-sourced
// resources for the latest traveler reports.
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'moderate', note: "Generally safe, but persistent catcalling in cities (especially Paris) is a commonly reported annoyance rather than a safety threat. Standard public-transit awareness applies at night." },
  austria: { name: 'Austria', riskLevel: 'low', note: 'Consistently rated among the most comfortable destinations in Europe for women traveling alone, with minimal unwanted attention reported.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'low', note: 'Generally very comfortable for solo female travelers — standard pickpocket awareness in Prague tourist areas applies, but harassment reports are low.' },
  denmark: { name: 'Denmark', riskLevel: 'low', note: 'Consistently rated among the most comfortable destinations in the world for women traveling alone.' },
  germany: { name: 'Germany', riskLevel: 'low', note: 'Generally very comfortable for solo female travelers, with minimal unwanted attention reported even late at night in major cities.' },
  greece: { name: 'Greece', riskLevel: 'moderate', note: 'Generally safe and welcoming, but catcalling in tourist areas and on the islands is a commonly reported annoyance.' },
  hungary: { name: 'Hungary', riskLevel: 'low', note: 'Generally comfortable for solo female travelers, with low reported harassment.' },
  iceland: { name: 'Iceland', riskLevel: 'low', note: 'Routinely ranked as one of the single best destinations in the world for solo female travelers, both for safety and for how comfortable it is to travel alone.' },
  italy: { name: 'Italy', riskLevel: 'moderate', note: 'Generally safe, but persistent catcalling — especially in the south and in crowded tourist areas — is a well-documented, commonly reported annoyance.' },
  netherlands: { name: 'Netherlands', riskLevel: 'low', note: 'Generally very comfortable for solo female travelers, including cycling and using public transit alone.' },
  portugal: { name: 'Portugal', riskLevel: 'low', note: 'Consistently rated among the more comfortable destinations in Europe for women traveling alone.' },
  spain: { name: 'Spain', riskLevel: 'moderate', note: 'Generally safe and popular with solo female travelers, but catcalling ("piropos") in some cities is a commonly reported cultural norm to be aware of.' },
  sweden: { name: 'Sweden', riskLevel: 'low', note: 'Consistently rated among the most comfortable destinations in the world for women traveling alone.' },
  switzerland: { name: 'Switzerland', riskLevel: 'low', note: 'Consistently rated among the most comfortable destinations in the world for women traveling alone.' },
  ireland: { name: 'Ireland', riskLevel: 'low', note: 'Generally very comfortable for solo female travelers, with a strong reputation for friendliness toward solo tourists in general.' },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'low', note: 'Generally very comfortable for solo female travelers, though standard nighttime awareness in big-city nightlife areas applies.' },
  turkey: { name: 'Turkey', riskLevel: 'moderate', note: "Istanbul and coastal tourist areas are visited safely by huge numbers of solo female travelers, but persistent staring and catcalling outside those areas is commonly reported — dressing more conservatively away from beach resorts helps." },
  japan: { name: 'Japan', riskLevel: 'low', note: 'One of the most consistently praised destinations in the world for solo female travelers — extremely low harassment and crime, with women-only train cars available during rush hour in major cities as an extra option.' },
  thailand: { name: 'Thailand', riskLevel: 'moderate', note: "One of the most popular solo-female-travel destinations in the world and generally very welcoming — the main practical issues reported are scams and occasional groping on crowded public transport, not violent crime." },
  indonesia: { name: 'Indonesia', riskLevel: 'moderate', note: "Bali is one of the most popular solo-female-travel destinations in Southeast Asia and generally very comfortable; dressing more conservatively is expected outside beach and tourist areas, especially in Muslim-majority regions." },
  singapore: { name: 'Singapore', riskLevel: 'low', note: 'One of the most comfortable and orderly destinations in the world for women traveling alone, day or night.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', note: 'A very comfortable destination for solo female travelers, with low crime even late at night in major cities.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', note: 'Generally very comfortable and safe for solo female travelers, with efficient, well-lit public transit.' },
  vietnam: { name: 'Vietnam', riskLevel: 'moderate', note: 'Generally safe and popular with solo female travelers — persistent staring and occasional catcalling are commonly reported, but violent incidents are rare.' },
  philippines: { name: 'Philippines', riskLevel: 'moderate', note: 'Generally friendly and welcoming to solo female travelers, though catcalling in cities is a commonly reported annoyance.' },
  malaysia: { name: 'Malaysia', riskLevel: 'moderate', note: 'Generally safe for solo female travelers in Kuala Lumpur and main tourist areas; more conservative dress is expected in Muslim-majority regions outside the main cities.' },
  china: { name: 'China', riskLevel: 'moderate', note: 'Generally very safe from violent crime, and solo female travelers commonly report feeling comfortable — some staring or curiosity is more common outside major tourist cities.' },
  india: { name: 'India', riskLevel: 'high', note: "India is the most frequently and consistently cited destination in solo-female-travel communities as requiring real extra caution — persistent staring, groping on crowded public transport, and unwanted attention are widely documented. Millions of women do travel here, often on organized tours or with a trusted local guide, and dressing conservatively and avoiding walking alone late at night makes a real difference." },
  maldives: { name: 'Maldives', riskLevel: 'low', note: 'Resort-based tourism is very comfortable and low-hassle for solo female travelers.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', note: 'One of the most consistently praised destinations in Asia for solo female travelers, with very low harassment and crime.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', note: "Generally safe, but persistent catcalling and occasional groping on crowded public transport is commonly reported — sitting in designated women's train carriages, where available, helps." },
  cambodia: { name: 'Cambodia', riskLevel: 'moderate', note: 'Generally safe and welcoming to solo female travelers; standard scam and catcalling awareness applies in busier tourist areas.' },
  australia: { name: 'Australia', riskLevel: 'low', note: 'A very comfortable, popular destination for solo female travelers, with wildlife and natural hazards a bigger practical concern than harassment.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'low', note: 'Consistently rated among the best destinations in the world for solo female travelers.' },
  fiji: { name: 'Fiji', riskLevel: 'low', note: 'Generally comfortable and welcoming for solo female travelers, especially within resort and tourist areas.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'low', note: 'A very comfortable, low-hassle destination for solo female travelers.' },
  mexico: { name: 'Mexico', riskLevel: 'moderate', note: "Millions of women travel solo through Mexico's well-touristed areas (Mexico City's main districts, the Yucatán, Oaxaca) safely and comfortably every year — catcalling is a commonly reported annoyance, and sticking to recommended areas matters more here than in most destinations." },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'moderate', note: 'Resort areas are generally comfortable for solo female travelers; persistent catcalling and vendor hustling outside resort zones is commonly reported.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'low', note: 'Generally comfortable for solo female travelers in main tourist areas, with standard nighttime awareness elsewhere.' },
  bahamas: { name: 'Bahamas', riskLevel: 'low', note: 'Resort and tourist areas are generally comfortable and low-hassle for solo female travelers.' },
  jamaica: { name: 'Jamaica', riskLevel: 'moderate', note: 'Resort areas are generally comfortable; persistent catcalling and vendor hustling outside resort zones is commonly reported by solo female travelers.' },
  aruba: { name: 'Aruba', riskLevel: 'low', note: 'One of the more comfortable Caribbean destinations for solo female travelers, with low reported harassment.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'low', note: 'A comfortable, low-hassle destination for solo female travelers, popular for resort tourism.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'low', note: 'Resort areas are generally comfortable and welcoming for solo female travelers.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'low', note: 'Consistently rated as one of the more comfortable Latin American destinations for solo female travelers, with a well-established backpacker and eco-tourism infrastructure.' },
  panama: { name: 'Panama', riskLevel: 'low', note: 'Generally comfortable for solo female travelers in Panama City and main tourist areas.' },
  belize: { name: 'Belize', riskLevel: 'low', note: 'Tourist zones and cayes are generally comfortable and welcoming for solo female travelers.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'low', note: 'One of the more comfortable and low-hassle Caribbean destinations for solo female travelers.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'low', note: 'A comfortable, low-hassle destination for solo female travelers, popular for resort tourism.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', note: 'One of the more comfortable and low-hassle Caribbean destinations for solo female travelers.' },
  canada: { name: 'Canada', riskLevel: 'low', note: 'A very comfortable, popular destination for solo female travelers.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'low', note: "Extremely low crime and strict law enforcement make this genuinely comfortable for solo female travelers — dress and behavior norms are more conservative than in Western countries, so it's worth knowing local expectations before you go." },
  morocco: { name: 'Morocco', riskLevel: 'high', note: "Morocco is one of the most frequently cited destinations in solo-female-travel communities as requiring real extra caution — persistent street harassment and catcalling, especially in medinas, is widely and consistently documented. Millions of women do visit and enjoy it, often dressing conservatively, traveling with a companion in medinas, and booking accommodations with strong reviews from other solo female travelers." },
  'south-africa': { name: 'South Africa', riskLevel: 'moderate', note: 'Major tourist areas and organized safaris are visited safely and comfortably by huge numbers of solo female travelers every year, though South Africa\'s generally higher crime rate means avoiding walking alone after dark matters more here than in most destinations.' },
  qatar: { name: 'Qatar', riskLevel: 'low', note: "Extremely low crime makes this genuinely comfortable for solo female travelers — dress and behavior norms are more conservative than in Western countries, so it's worth knowing local expectations before you go." },
  israel: { name: 'Israel', riskLevel: 'low', note: 'Generally comfortable for solo female travelers in terms of harassment risk specifically — check the separate, fluid security-situation advisory before booking or traveling.' },
  tanzania: { name: 'Tanzania', riskLevel: 'moderate', note: 'Safari areas are visited safely and comfortably by huge numbers of solo female travelers, usually as part of an organized tour; standard petty-crime awareness applies in cities.' },
  kenya: { name: 'Kenya', riskLevel: 'moderate', note: 'Major safari and coastal tourist areas are visited safely and comfortably by huge numbers of solo female travelers, usually as part of an organized tour; standard petty-crime awareness applies in cities.' },
  argentina: { name: 'Argentina', riskLevel: 'low', note: 'Buenos Aires is consistently rated as one of the more comfortable South American cities for solo female travelers, by regional standards.' },
  peru: { name: 'Peru', riskLevel: 'moderate', note: 'Main tourist routes (Lima, Cusco, Machu Picchu) are visited safely and comfortably by huge numbers of solo female travelers; some catcalling in cities is commonly reported.' },
  chile: { name: 'Chile', riskLevel: 'low', note: 'Consistently rated as one of the more comfortable South American destinations for solo female travelers.' },
  colombia: { name: 'Colombia', riskLevel: 'moderate', note: "Tourist areas (Cartagena, Medellín, Bogotá's main districts) are visited safely and comfortably by huge numbers of solo female travelers every year — catcalling (\"piropos\") is a well-documented, commonly reported cultural norm rather than a safety threat." },
  brazil: { name: 'Brazil', riskLevel: 'moderate', note: 'Major tourist areas are visited safely and comfortably by huge numbers of solo female travelers every year; general street-crime awareness (as with any traveler) matters more here than in most destinations, especially after dark.' },
  'united-states': { name: 'United States', riskLevel: 'low', note: 'Generally comfortable for solo female travelers by international standards, with wide regional and city-by-city variation in general crime awareness needed, same as any traveler.' },
};

const RISK_LABELS = {
  low: 'Low Harassment Risk',
  moderate: 'Moderate — Some Unwanted Attention Common',
  high: 'High — Extra Caution Advised',
};

const DISCLAIMER = "This is general orientation, not real-time data, and every solo traveler's experience differs — cross-check current, crowd-sourced reports from other solo female travelers (forums like Solo Female Travelers Club, recent blog posts, or Facebook travel groups) closer to your trip, and always check your own government's official travel advisory too.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const riskLabel = RISK_LABELS[data.riskLevel];
  const headline = `${data.name}: ${riskLabel}.`;

  return {
    country, countryName: data.name, riskLevel: data.riskLevel, riskLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/solo-female-travel-checker/calculate
// @access Public
exports.calculateSoloFemaleTravel = (req, res) => {
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
// @route POST /api/tools/solo-female-travel-checker/pdf
// @access Public
exports.generateSoloFemaleTravelPdf = async (req, res) => {
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
      [email, firstName || null, 'solo-female-travel-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Solo Female Travel Safety Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="solo-female-travel-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.riskLabel);

    pdfService.heading(doc, 'General solo female travel habits that help anywhere');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Share your itinerary and check in regularly with someone back home — a simple daily "arrived safely" text costs nothing.',
      'Book your first night or two in advance in a well-reviewed area before you arrive, so you\'re not searching for accommodation while tired and disoriented.',
      'Trust your instincts over politeness — it\'s always okay to leave a situation, decline help you didn\'t ask for, or say no firmly.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧭 Your ${result.countryName} solo female travel safety check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the solo female travel orientation for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond safety prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send solo-female-travel-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSoloFemaleTravelPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
