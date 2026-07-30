const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Gift-giving etiquette per destination — how important gift-giving is
// socially/in business, and the specific taboos worth knowing before you
// show up with the wrong thing. Distinct from etiquetteController.js
// (general social etiquette — greetings, gestures, dining — not
// specifically about gifts) and tippingController.js (paying for service,
// not giving a personal gift). giftCultureLevel: 'highly-ritualized' (gift-
// giving is a significant, ritualized part of social/business culture,
// with real taboos to avoid) | 'valued-with-taboos' (gifts are meaningful
// and appreciated, with specific things worth avoiding) | 'casual-few-
// rules' (gifts are a nice, appreciated gesture with no major taboos) |
// 'not-expected' (gift-giving isn't a strong cultural expectation for
// casual travelers).
const COUNTRIES = {
  france: { name: 'France', giftCultureLevel: 'valued-with-taboos', note: 'Bringing flowers or wine when invited to a French home is customary — avoid chrysanthemums (associated with funerals) and skip cheap wine, since French hosts often have strong opinions on it.' },
  austria: { name: 'Austria', giftCultureLevel: 'casual-few-rules', note: 'Bringing flowers, wine, or chocolates when invited to an Austrian home is customary and well received — there are no major taboos, just avoid arriving empty-handed.' },
  'czech-republic': { name: 'Czech Republic', giftCultureLevel: 'casual-few-rules', note: 'An odd number of flowers, unwrapped before handing over, is the traditional host gift — wine or chocolates work well too.' },
  denmark: { name: 'Denmark', giftCultureLevel: 'not-expected', note: 'Gift-giving is fairly low-key — bringing a small bottle of wine or flowers when invited to someone\'s home is a nice gesture but not a strict expectation.' },
  germany: { name: 'Germany', giftCultureLevel: 'casual-few-rules', note: 'An odd number of flowers (excluding 13), unwrapped before handing over, is the traditional gift when invited to a German home — avoid red roses, which imply romantic interest.' },
  greece: { name: 'Greece', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift like pastries, flowers, or wine when invited to a Greek home is appreciated and well received, with no major taboos to navigate.' },
  hungary: { name: 'Hungary', giftCultureLevel: 'casual-few-rules', note: 'An odd number of flowers, unwrapped, is the traditional host gift in Hungary — wine or chocolates are also well received.' },
  iceland: { name: 'Iceland', giftCultureLevel: 'not-expected', note: 'Gift-giving for casual visits is low-key — a bottle of wine or small treat when invited to someone\'s home is a nice gesture but not expected.' },
  italy: { name: 'Italy', giftCultureLevel: 'valued-with-taboos', note: 'Wine, pastries, or flowers are welcome gifts when invited to an Italian home — avoid chrysanthemums (funeral association) and be thoughtful about wine quality if your host is a wine enthusiast, which is common.' },
  netherlands: { name: 'Netherlands', giftCultureLevel: 'casual-few-rules', note: 'Flowers or a small treat when invited to a Dutch home is a nice, appreciated gesture — there are no major taboos to worry about.' },
  portugal: { name: 'Portugal', giftCultureLevel: 'casual-few-rules', note: 'Wine, pastries, or flowers when invited to a Portuguese home are well received and appreciated, with no major taboos to navigate.' },
  spain: { name: 'Spain', giftCultureLevel: 'casual-few-rules', note: 'Wine, pastries, or flowers when invited to a Spanish home are appreciated — gift-giving is fairly relaxed with no major taboos.' },
  sweden: { name: 'Sweden', giftCultureLevel: 'not-expected', note: 'Gift-giving for casual visits is low-key — flowers or a small treat when invited to someone\'s home is a nice gesture but not a strong expectation.' },
  switzerland: { name: 'Switzerland', giftCultureLevel: 'casual-few-rules', note: 'Chocolates, wine, or flowers when invited to a Swiss home are well received — arrive on time with your gift, since punctuality itself is taken seriously here.' },
  ireland: { name: 'Ireland', giftCultureLevel: 'casual-few-rules', note: 'Wine, chocolates, or flowers when invited to an Irish home are appreciated, with no major taboos to worry about.' },
  'united-kingdom': { name: 'United Kingdom', giftCultureLevel: 'casual-few-rules', note: 'Wine, chocolates, or flowers when invited to a British home are a nice, appreciated gesture, with no major taboos to navigate.' },
  turkey: { name: 'Turkey', giftCultureLevel: 'valued-with-taboos', note: 'Bringing pastries, chocolates, or flowers when invited to a Turkish home is appreciated — avoid alcohol as a gift unless you know your host drinks, and skip giving an even number of flowers, which is associated with funerals.' },
  japan: { name: 'Japan', giftCultureLevel: 'highly-ritualized', note: "Gift-giving (omiyage) is a genuinely important social ritual — gifts are typically wrapped elaborately, given and received with both hands, and not opened immediately in front of the giver. Avoid gifts in sets of four (the number sounds like 'death') and sharp objects like knives, which symbolize severing the relationship." },
  thailand: { name: 'Thailand', giftCultureLevel: 'valued-with-taboos', note: 'Bringing fruit, sweets, or a small gift when invited to a Thai home is appreciated — gifts are usually not opened immediately in front of the giver, and avoid giving anything associated with funerals, like handkerchiefs.' },
  indonesia: { name: 'Indonesia', giftCultureLevel: 'valued-with-taboos', note: "Bringing food or a small gift when invited to an Indonesian home is appreciated — use your right hand (or both hands) to give it, and if visiting a Muslim household, avoid alcohol or pork-derived products." },
  singapore: { name: 'Singapore', giftCultureLevel: 'valued-with-taboos', note: "Bringing fruit, sweets, or a small gift when invited to a Singaporean home is customary — gifts are often not opened immediately, and avoid clocks (associated with death) or giving in sets of four." },
  'south-korea': { name: 'South Korea', giftCultureLevel: 'highly-ritualized', note: 'Gift-giving is an important social ritual — give and receive gifts with both hands, and gifts are typically not opened immediately in front of the giver. Avoid gifts in sets of four, and avoid giving anything sharp like scissors or knives.' },
  'hong-kong': { name: 'Hong Kong', giftCultureLevel: 'valued-with-taboos', note: "Bringing fruit or sweets when invited to a home in Hong Kong is appreciated — avoid clocks (sounds like 'attending a funeral' in Cantonese) and giving in sets of four." },
  vietnam: { name: 'Vietnam', giftCultureLevel: 'valued-with-taboos', note: 'Bringing fruit, tea, or sweets when invited to a Vietnamese home is appreciated — avoid handkerchiefs or gifts wrapped in black or white, which are associated with funerals.' },
  philippines: { name: 'Philippines', giftCultureLevel: 'casual-few-rules', note: 'Bringing food, sweets, or a small gift when invited to a Filipino home is a nice, well-received gesture, with no major taboos to worry about.' },
  malaysia: { name: 'Malaysia', giftCultureLevel: 'valued-with-taboos', note: "Bringing fruit or sweets when invited to a Malaysian home is appreciated — use your right hand to give it, and if visiting a Muslim household, avoid alcohol or anything containing pork." },
  china: { name: 'China', giftCultureLevel: 'highly-ritualized', note: "Gift-giving is an important social and business ritual — give and receive with both hands, and expect your gift to be politely refused once or twice before being accepted. Avoid clocks (sounds like 'attending a funeral'), sharp objects, and white or all-black wrapping, all associated with death." },
  india: { name: 'India', giftCultureLevel: 'valued-with-taboos', note: 'Bringing sweets or a small gift when invited to an Indian home is appreciated — avoid leather items if visiting a Hindu household and alcohol if visiting a Muslim or strictly religious household; gifts are often not opened immediately.' },
  maldives: { name: 'Maldives', giftCultureLevel: 'not-expected', note: "The resort-based nature of most visits means gift-giving isn't a strong expectation — a small thank-you gesture for resort staff is appreciated but not required." },
  taiwan: { name: 'Taiwan', giftCultureLevel: 'highly-ritualized', note: "Gift-giving is a meaningful social ritual — give and receive with both hands, and avoid clocks (sounds like 'attending a funeral'), sharp objects, and giving in sets of four." },
  'sri-lanka': { name: 'Sri Lanka', giftCultureLevel: 'valued-with-taboos', note: 'Bringing sweets or fruit when invited to a Sri Lankan home is appreciated — avoid alcohol if visiting a Buddhist or Muslim household.' },
  cambodia: { name: 'Cambodia', giftCultureLevel: 'casual-few-rules', note: 'Bringing fruit or sweets when invited to a Cambodian home is a nice, appreciated gesture with no major taboos to navigate.' },
  australia: { name: 'Australia', giftCultureLevel: 'not-expected', note: '"Bring a plate" for shared meals is common social shorthand — bringing wine or a small treat when invited to someone\'s home is appreciated but not a strong expectation.' },
  'new-zealand': { name: 'New Zealand', giftCultureLevel: 'not-expected', note: 'Gift-giving for casual visits is low-key — a bottle of wine or small treat when invited to someone\'s home is a nice gesture but not expected.' },
  fiji: { name: 'Fiji', giftCultureLevel: 'valued-with-taboos', note: 'If visiting a Fijian village, a gift of yaqona (kava root) for the traditional sevusevu ceremony is genuinely expected and meaningful — for casual social visits, a small gift is a nice but less formal gesture.' },
  'french-polynesia': { name: 'French Polynesia', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to someone\'s home is a nice, appreciated gesture with no major taboos.' },
  mexico: { name: 'Mexico', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or flowers when invited to a Mexican home is appreciated — avoid marigolds, which are strongly associated with Día de los Muertos.' },
  'dominican-republic': { name: 'Dominican Republic', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or a small gift when invited to a home in the Dominican Republic is a nice, appreciated gesture with no major taboos.' },
  'puerto-rico': { name: 'Puerto Rico', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or a small gift when invited to a Puerto Rican home is appreciated, with no major taboos to navigate.' },
  bahamas: { name: 'Bahamas', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine or a small gift when invited to a home in the Bahamas is a nice, appreciated gesture with no major taboos.' },
  jamaica: { name: 'Jamaica', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to a Jamaican home is appreciated, with no major taboos to worry about.' },
  aruba: { name: 'Aruba', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine or a small gift when invited to a home in Aruba is a nice, appreciated gesture with no major taboos.' },
  'turks-and-caicos': { name: 'Turks and Caicos', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine or a small gift when invited to a home is a nice, appreciated gesture with no major taboos.' },
  'st-lucia': { name: 'St. Lucia', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to a home in St. Lucia is appreciated, with no major taboos to worry about.' },
  'costa-rica': { name: 'Costa Rica', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or a small gift when invited to a Costa Rican home is appreciated, with no major taboos to navigate.' },
  panama: { name: 'Panama', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine or a small gift when invited to a Panamanian home is a nice, appreciated gesture with no major taboos.' },
  belize: { name: 'Belize', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to a home in Belize is appreciated, with no major taboos to worry about.' },
  'cayman-islands': { name: 'Cayman Islands', giftCultureLevel: 'not-expected', note: 'Gift-giving for casual visits is low-key — bringing wine or a small treat is a nice gesture but not a strong expectation.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to a home is appreciated, with no major taboos to worry about.' },
  curacao: { name: 'Curaçao', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine or a small gift when invited to a home in Curaçao is a nice, appreciated gesture with no major taboos.' },
  canada: { name: 'Canada', giftCultureLevel: 'not-expected', note: 'Gift-giving for casual visits is low-key — bringing wine or a small treat when invited to someone\'s home is a nice gesture but not a strong expectation.' },
  'united-arab-emirates': { name: 'United Arab Emirates', giftCultureLevel: 'valued-with-taboos', note: 'Bringing sweets, dates, or a small gift when invited to an Emirati home is appreciated — avoid alcohol and pork-derived products, and give and receive gifts with your right hand only.' },
  morocco: { name: 'Morocco', giftCultureLevel: 'valued-with-taboos', note: 'Bringing pastries, dates, or tea when invited to a Moroccan home is appreciated — avoid alcohol, and give and receive gifts with your right hand only.' },
  'south-africa': { name: 'South Africa', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine or a small gift when invited to a South African home — a braai (barbecue) especially — is appreciated, with no major taboos to worry about.' },
  qatar: { name: 'Qatar', giftCultureLevel: 'valued-with-taboos', note: 'Bringing sweets, dates, or a small gift when invited to a Qatari home is appreciated — avoid alcohol and pork-derived products, and give and receive gifts with your right hand only.' },
  israel: { name: 'Israel', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, flowers, or dessert when invited to an Israeli home is appreciated — if your host keeps kosher, check that any food gift is certified kosher.' },
  tanzania: { name: 'Tanzania', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to a Tanzanian home is appreciated, with no major taboos — give and receive with your right hand.' },
  kenya: { name: 'Kenya', giftCultureLevel: 'casual-few-rules', note: 'Bringing a small gift or treat when invited to a Kenyan home is appreciated, with no major taboos — give and receive with your right hand.' },
  argentina: { name: 'Argentina', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or flowers when invited to an Argentine home is appreciated — avoid lilies and purple flowers, which are associated with funerals.' },
  peru: { name: 'Peru', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or a small gift when invited to a Peruvian home is appreciated, with no major taboos to navigate.' },
  chile: { name: 'Chile', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or flowers when invited to a Chilean home is appreciated — avoid yellow flowers, which some consider a sign of disrespect.' },
  colombia: { name: 'Colombia', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or flowers when invited to a Colombian home is appreciated, with no major taboos to navigate.' },
  brazil: { name: 'Brazil', giftCultureLevel: 'casual-few-rules', note: 'Bringing wine, dessert, or flowers when invited to a Brazilian home is appreciated — avoid purple and black flowers, which are associated with mourning.' },
  'united-states': { name: 'United States', giftCultureLevel: 'not-expected', note: 'Gift-giving for casual visits is low-key — bringing wine, dessert, or flowers when invited to someone\'s home is a nice gesture but not a strong expectation.' },
};

const GIFT_LABELS = {
  'highly-ritualized': 'Highly Ritualized — Real Etiquette Rules Apply',
  'valued-with-taboos': 'Valued — A Few Real Taboos to Avoid',
  'casual-few-rules': 'Casual — Appreciated, Few Rules',
  'not-expected': 'Not Expected — Low-Key Culture',
};

const DISCLAIMER = "This reflects general social norms for casual visits, not a complete etiquette guide — customs vary by household, religion, and region, and business gift-giving often has its own, stricter rules. When in doubt, a modest, thoughtfully chosen gift is rarely the wrong call.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const giftLabel = GIFT_LABELS[data.giftCultureLevel];
  const headline = `${data.name}: ${giftLabel}.`;

  return {
    country, countryName: data.name, giftCultureLevel: data.giftCultureLevel, giftLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/gift-giving-checker/calculate
// @access Public
exports.calculateGiftGiving = (req, res) => {
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
// @route POST /api/tools/gift-giving-checker/pdf
// @access Public
exports.generateGiftGivingPdf = async (req, res) => {
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
      [email, firstName || null, 'gift-giving-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Gift-Giving Etiquette Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="gift-giving-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.giftLabel);

    pdfService.heading(doc, 'General gift-giving tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'When unsure, a modest gift from your home country or region — food, a small craft item — is almost always well received and gives you something easy to talk about.',
      'If a gift is politely declined once, offering it again is normal in many cultures — genuine refusal is usually clear from tone and repetition, not a single "no."',
      'For business contexts specifically, research your counterpart\'s company policy first — many organizations cap gift value or prohibit gifts entirely, regardless of local social custom.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🎁 Your ${result.countryName} gift-giving guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the gift-giving check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond gift etiquette? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send gift-giving-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateGiftGivingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
