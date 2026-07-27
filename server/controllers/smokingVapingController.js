const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Public smoking restrictiveness + e-cigarette/vaping legality per country.
// smoking: 'strict' (banned almost everywhere, heavy fines) | 'moderate'
// (typical indoor ban, outdoor generally fine) | 'relaxed' (widely
// tolerated, weak enforcement). vaping: 'legal' (may buy/bring/use,
// usually age-restricted) | 'restricted' (sale/import limited or
// flavor-restricted — bringing your own carries some risk) | 'banned'
// (illegal to possess — confiscation/fines/prosecution risk).
const COUNTRIES = {
  china: { name: 'China', smoking: 'relaxed', vaping: 'restricted', note: 'Smoking is extremely common and only weakly restricted indoors in a handful of major cities. Flavored e-cigarettes were banned from retail sale in 2022 — only tobacco-flavored devices are sold legally, and bringing foreign flavored vapes in bulk can draw customs attention.' },
  'united-arab-emirates': { name: 'United Arab Emirates', smoking: 'moderate', vaping: 'legal', note: 'Smoking is banned in enclosed public places but common in designated areas and shisha lounges. Vaping was legalized in 2019 and is heavily taxed — devices are widely sold.' },
  'saudi-arabia': { name: 'Saudi Arabia', smoking: 'moderate', vaping: 'legal', note: "Indoor smoking has been banned in public places since 2011, though it's common in cafes' designated smoking sections. Vaping was legalized in 2018 but requires Saudi/GCC-compliant health warning labels — devices without them can be seized at customs." },
  turkey: { name: 'Turkey', smoking: 'moderate', vaping: 'restricted', note: 'Indoor smoking has been banned since 2009 and is strictly enforced, though very common in outdoor cafes. Domestic sale, production, and import of e-cigarettes has technically been banned since 2020 — personal possession of a device for your own use is usually tolerated but remains a legal gray area.' },
  vietnam: { name: 'Vietnam', smoking: 'relaxed', vaping: 'banned', note: "Smoking is widely tolerated indoors and outdoors with weak enforcement. Vietnam's National Assembly banned production, trade, and import of e-cigarettes and heated tobacco products — bringing one in risks confiscation." },
  egypt: { name: 'Egypt', smoking: 'relaxed', vaping: 'restricted', note: 'Smoking and shisha are extremely common with few enforced restrictions. E-cigarettes require import approval in principle, and devices without paperwork have occasionally been seized at customs, though they are now widely sold in local shops.' },
  morocco: { name: 'Morocco', smoking: 'relaxed', vaping: 'restricted', note: 'Smoking is widely tolerated. Import regulations for e-cigarettes have tightened in recent years, and vapes have occasionally been confiscated at customs despite being sold openly in local shops.' },
  india: { name: 'India', smoking: 'moderate', vaping: 'banned', note: 'Indoor public smoking has been banned since 2008 with patchy enforcement. Production, sale, and import of e-cigarettes has been banned nationwide since 2019 — personal possession is a legal gray area but genuinely risky.' },
  indonesia: { name: 'Indonesia', smoking: 'relaxed', vaping: 'legal', note: 'Smoking is extremely common and culturally normalized, with weak enforcement even where technically banned. Vaping is legal, regulated, and taxed since 2018, with an 18+ purchase age.' },
  thailand: { name: 'Thailand', smoking: 'strict', vaping: 'banned', note: 'Indoor smoking is banned and smoking is prohibited on many popular beaches with real fines. Importing, selling, or possessing e-cigarettes is illegal — customs can fine or confiscate, and enforcement against tourists does happen.' },
  singapore: { name: 'Singapore', smoking: 'strict', vaping: 'banned', note: "Smoking is banned in almost all indoor and many outdoor public areas with heavy fines. Possessing, buying, or using e-cigarettes is illegal — tourists caught with vapes have made headlines for the fines involved." },
  'united-states': { name: 'United States', smoking: 'moderate', vaping: 'legal', note: 'Rules vary by state but indoor smoking is generally banned. Vaping is legal and regulated, with a federal purchase age of 21.' },
  canada: { name: 'Canada', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with a purchase age of 18 or 19 depending on the province.' },
  mexico: { name: 'Mexico', smoking: 'moderate', vaping: 'banned', note: 'Indoor smoking has been banned nationwide since 2021. Sale and import of e-cigarettes has officially been banned since a 2020 decree, though enforcement against a tourist carrying a single personal device is inconsistent.' },
  brazil: { name: 'Brazil', smoking: 'moderate', vaping: 'banned', note: "Indoor smoking is banned nationwide. Sale, import, and advertising of e-cigarettes has been banned by Brazil's health regulator ANVISA since 2009." },
  argentina: { name: 'Argentina', smoking: 'moderate', vaping: 'restricted', note: 'Indoor smoking is generally banned. Sale, import, and advertising of e-cigarettes has been banned by health authorities since 2011, though enforcement against travelers carrying a personal device is rare.' },
  chile: { name: 'Chile', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated as a tobacco product, with an 18+ purchase age.' },
  colombia: { name: 'Colombia', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal, regulated, and taxed since 2022, with an 18+ purchase age.' },
  peru: { name: 'Peru', smoking: 'moderate', vaping: 'restricted', note: 'Indoor smoking is generally banned. Import and sale of e-cigarettes face regulatory hurdles, and proposals to ban them outright have circulated repeatedly.' },
  'costa-rica': { name: 'Costa Rica', smoking: 'moderate', vaping: 'legal', note: 'A strict indoor smoking ban has been in place since 2012. Vaping is legal and regulated similarly to tobacco.' },
  'united-kingdom': { name: 'United Kingdom', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal, widely available, and even promoted as a smoking-cessation tool, with an 18+ purchase age.' },
  ireland: { name: 'Ireland', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  france: { name: 'France', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is banned but very common in outdoor cafes. Vaping is legal and regulated, with an 18+ purchase age.' },
  germany: { name: 'Germany', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  italy: { name: 'Italy', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  spain: { name: 'Spain', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  netherlands: { name: 'Netherlands', smoking: 'moderate', vaping: 'restricted', note: 'Indoor smoking is generally banned. Flavored e-liquid was banned from sale in 2023 — only tobacco-flavored e-liquid is legally sold.' },
  portugal: { name: 'Portugal', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  greece: { name: 'Greece', smoking: 'relaxed', vaping: 'legal', note: "An indoor smoking ban exists on paper but is weakly enforced — smoking indoors in bars and cafes remains common. Vaping is legal and regulated." },
  austria: { name: 'Austria', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  switzerland: { name: 'Switzerland', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  poland: { name: 'Poland', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  'czech-republic': { name: 'Czech Republic', smoking: 'relaxed', vaping: 'legal', note: 'Smoking remains fairly common and some designated smoking venues still exist despite the indoor ban. Vaping is legal and regulated.' },
  norway: { name: 'Norway', smoking: 'strict', vaping: 'restricted', note: 'Smoking is heavily taxed and banned in most public places. Nicotine e-liquid sale is restricted domestically — bringing your own for personal use is allowed only in limited quantities.' },
  sweden: { name: 'Sweden', smoking: 'strict', vaping: 'legal', note: 'Smoking rates are very low and enforcement of public bans is strict. Vaping is legal and regulated similarly to tobacco.' },
  denmark: { name: 'Denmark', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  iceland: { name: 'Iceland', smoking: 'strict', vaping: 'legal', note: 'Tobacco taxes are very high and indoor smoking bans are strictly enforced. Vaping is legal and regulated.' },
  japan: { name: 'Japan', smoking: 'relaxed', vaping: 'restricted', note: "Indoor smoking is still allowed in many small bars and restaurants under loopholes to the 2020 law. Nicotine-containing e-liquid is classified as a medical product and isn't legally sold — heated tobacco like IQOS is a separate, legal, and popular product." },
  'south-korea': { name: 'South Korea', smoking: 'moderate', vaping: 'legal', note: 'Smoking is banned indoors and in many outdoor public zones with real fines. Vaping is legal, regulated, and taxed like tobacco.' },
  malaysia: { name: 'Malaysia', smoking: 'moderate', vaping: 'legal', note: 'Smoking has been banned in restaurants and cafes since 2019. Vaping is legal, regulated under the Vape Act since 2023, with an 18+ purchase age.' },
  philippines: { name: 'Philippines', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated under the Vape Law (RA 11900), with an 18+ purchase age.' },
  israel: { name: 'Israel', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal and regulated, with an 18+ purchase age.' },
  jordan: { name: 'Jordan', smoking: 'relaxed', vaping: 'legal', note: 'Smoking and shisha are extremely common with weak enforcement of indoor bans. Vaping was legalized and taxed in 2019.' },
  kenya: { name: 'Kenya', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is legal, regulated, and taxed.' },
  'south-africa': { name: 'South Africa', smoking: 'moderate', vaping: 'legal', note: 'Indoor smoking is generally banned. Vaping is currently legal and regulated, though proposed legislation could tighten the rules.' },
  australia: { name: 'Australia', smoking: 'strict', vaping: 'restricted', note: 'Smoking is heavily taxed and strictly banned in most indoor and many outdoor public places. Since 2024 reforms, nicotine vapes require a prescription — tourists cannot simply buy or bring commercial nicotine vapes without one.' },
  'new-zealand': { name: 'New Zealand', smoking: 'strict', vaping: 'legal', note: 'Smoking is heavily taxed under a smoke-free-generation policy. Vaping is legal and regulated, with an 18+ purchase age and restrictions on flavors and marketing.' },
};

const SMOKING_LABELS = {
  strict: 'strict — banned in most indoor and many outdoor public spaces, with steep fines for violations',
  moderate: 'moderate — indoor smoking is generally banned but outdoor areas are usually unrestricted',
  relaxed: 'relaxed — smoking is widely tolerated with weak enforcement of any bans',
};

const VAPING_LABELS = {
  legal: 'legal to bring and use, though usually age-restricted',
  restricted: 'restricted — sale or import is limited or flavor-restricted, so bringing your own carries some risk',
  banned: 'illegal — possession can lead to confiscation, fines, or prosecution, so leave vapes at home',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `In ${data.name}, vaping is ${VAPING_LABELS[data.vaping]}. Smoking rules are ${SMOKING_LABELS[data.smoking]}.`;

  return {
    country, countryName: data.name, smoking: data.smoking, smokingLabel: SMOKING_LABELS[data.smoking],
    vaping: data.vaping, vapingLabel: VAPING_LABELS[data.vaping], note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/smoking-vaping-checker/calculate
// @access Public
exports.calculateSmokingVaping = (req, res) => {
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
// @route POST /api/tools/smoking-vaping-checker/pdf
// @access Public
exports.generateSmokingVapingPdf = async (req, res) => {
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
      [email, firstName || null, 'smoking-vaping-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Smoking & Vaping Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="smoking-vaping-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Vaping status: ${result.vapingLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.vaping === 'banned'
        ? "Leave vapes and e-cigarettes at home entirely — possession can mean confiscation, fines, or worse, and \"I didn't know\" is not accepted as an excuse at customs."
        : result.vaping === 'restricted'
        ? 'Pack only what you personally need and be ready to declare it — bulk quantities or unusual flavors are more likely to draw customs attention.'
        : 'Vaping is legal here, but pack spare batteries and e-liquid according to airline carry-on rules, since most airlines still restrict them in checked luggage.',
      result.smoking === 'strict'
        ? 'Expect real fines for smoking outside designated areas — check for signage before lighting up, even outdoors.'
        : 'Indoor smoking bans are standard practice — look for designated outdoor or ventilated areas.',
      'Rules can change quickly and enforcement varies by city — this guide reflects general national patterns, so check current status close to your travel dates.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚬 Your ${result.countryName} smoking & vaping guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your smoking & vaping check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond local rules? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send smoking-vaping-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSmokingVapingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
