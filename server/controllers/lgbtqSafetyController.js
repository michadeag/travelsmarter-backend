const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// LGBTQ+ travel safety orientation per country. status: 'legal_and_protected'
// (same-sex activity legal, relationships legally recognized) | 'legal'
// (same-sex activity legal, but little or no formal relationship
// recognition — social acceptance varies widely within this group, noted
// per-country) | 'criminalized' (same-sex sexual activity is illegal).
// This is general legal/structural orientation, not real-time — laws and
// enforcement in this area have been changing quickly (in both
// directions) in multiple countries, so every result, PDF, and email
// carries an explicit disclaimer pointing to a live, specialized source
// (Equaldex) for current, city-level detail. Country list matches the
// shared 64-country roster used across the other tools.
const COUNTRIES = {
  france: { name: 'France', status: 'legal_and_protected', note: 'Same-sex marriage and adoption have been legal nationwide since 2013, with strong anti-discrimination protections.' },
  austria: { name: 'Austria', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2019, with full legal equality.' },
  'czech-republic': { name: 'Czech Republic', status: 'legal', note: 'Registered partnerships are recognized, but marriage and adoption rights remain more limited than in much of Western Europe.' },
  denmark: { name: 'Denmark', status: 'legal_and_protected', note: 'One of the most LGBTQ+-friendly countries in the world — same-sex marriage has been legal since 2012.' },
  germany: { name: 'Germany', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2017, with strong legal protections and a visible, welcoming LGBTQ+ scene in major cities.' },
  greece: { name: 'Greece', status: 'legal_and_protected', note: 'Same-sex marriage was legalized in 2024 — generally welcoming, especially in Athens and popular island destinations.' },
  hungary: { name: 'Hungary', status: 'legal', note: 'Same-sex partnerships (not marriage) are recognized, but the government has passed increasingly restrictive laws on LGBTQ+ visibility in recent years — discretion is advised outside Budapest.' },
  iceland: { name: 'Iceland', status: 'legal_and_protected', note: 'Consistently ranks among the most LGBTQ+-friendly countries in the world — same-sex marriage has been legal since 2010.' },
  italy: { name: 'Italy', status: 'legal', note: 'Civil unions are recognized since 2016, but marriage and adoption rights remain more limited — Rome and major cities are generally welcoming.' },
  netherlands: { name: 'Netherlands', status: 'legal_and_protected', note: 'The first country in the world to legalize same-sex marriage (2001) — one of the most LGBTQ+-friendly destinations globally.' },
  portugal: { name: 'Portugal', status: 'legal_and_protected', note: 'Same-sex marriage and adoption have been legal since 2010, with strong protections.' },
  spain: { name: 'Spain', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2005 — one of the most progressive and welcoming destinations, especially Madrid and Barcelona.' },
  sweden: { name: 'Sweden', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2009, with strong legal protections.' },
  switzerland: { name: 'Switzerland', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2022, completing full legal equality.' },
  ireland: { name: 'Ireland', status: 'legal_and_protected', note: 'Legalized same-sex marriage by public referendum in 2015 — generally very welcoming.' },
  'united-kingdom': { name: 'United Kingdom', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2014 (England, Wales, Scotland), with strong anti-discrimination protections.' },
  turkey: { name: 'Turkey', status: 'legal', note: 'Same-sex activity is legal, but there is no relationship recognition and the social climate is conservative — public displays of affection are best avoided, and pride events have faced restrictions in recent years.' },
  japan: { name: 'Japan', status: 'legal', note: 'Legal and generally safe, though same-sex marriage is not recognized nationally — some cities issue local partnership certificates. Public displays of affection are uncommon culturally, for any couple.' },
  thailand: { name: 'Thailand', status: 'legal_and_protected', note: 'Thailand became the first Southeast Asian country to legalize same-sex marriage, effective January 2025 — a visible, welcoming LGBTQ+ scene, especially in Bangkok and Pattaya.' },
  indonesia: { name: 'Indonesia', status: 'legal', note: 'Legal nationally except in Aceh province (which applies Sharia law), but social conservatism is real and growing — discretion is strongly advised outside tourist-oriented areas of Bali.' },
  singapore: { name: 'Singapore', status: 'legal', note: 'Section 377A, which criminalized same-sex activity, was repealed in 2022 — legal now, though marriage is still not recognized and the culture remains fairly conservative.' },
  'south-korea': { name: 'South Korea', status: 'legal', note: 'Legal, with no marriage recognition — generally safe but public visibility is low; discretion is culturally the norm rather than a specific risk.' },
  'hong-kong': { name: 'Hong Kong', status: 'legal', note: 'Legal, with limited partial recognition via court rulings but no marriage — generally safe and increasingly visible.' },
  vietnam: { name: 'Vietnam', status: 'legal', note: 'Legal, with growing social tolerance, though same-sex marriage is not legally recognized.' },
  philippines: { name: 'Philippines', status: 'legal', note: 'Legal and culturally fairly tolerant, though there is no national marriage or civil union recognition.' },
  malaysia: { name: 'Malaysia', status: 'criminalized', note: 'Same-sex sexual activity is illegal under both civil and Sharia law and is actively enforced — real legal risk, discretion is essential.' },
  china: { name: 'China', status: 'legal', note: 'Legal since 1997, but marriage is not recognized and LGBTQ+ content/visibility faces censorship — public discretion is advised.' },
  india: { name: 'India', status: 'legal', note: "Decriminalized by the Supreme Court in 2018, but a 2023 ruling declined to extend marriage rights — social acceptance varies widely, with much greater visibility in major cities." },
  maldives: { name: 'Maldives', status: 'criminalized', note: "Same-sex activity is illegal under Sharia-influenced law. In practice, resort-island tourism is fairly insulated, but the legal risk is real — discretion is essential." },
  taiwan: { name: 'Taiwan', status: 'legal_and_protected', note: 'The first place in Asia to legalize same-sex marriage (2019) — widely considered one of the most LGBTQ+-friendly destinations in Asia.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'criminalized', note: 'A colonial-era law criminalizing same-sex activity remains on the books and is rarely enforced against tourists, but the legal risk is real — discretion is essential.' },
  cambodia: { name: 'Cambodia', status: 'legal', note: 'No laws criminalize same-sex activity, and the culture is generally tolerant, though there is no marriage or union recognition.' },
  australia: { name: 'Australia', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2017, with strong protections and a very visible, welcoming LGBTQ+ scene.' },
  'new-zealand': { name: 'New Zealand', status: 'legal_and_protected', note: 'One of the most LGBTQ+-friendly countries in the world — same-sex marriage has been legal since 2013.' },
  fiji: { name: 'Fiji', status: 'legal', note: 'Decriminalized in 2010 and generally tolerant in tourist areas, though there is no marriage recognition and rural areas tend to be more conservative.' },
  'french-polynesia': { name: 'French Polynesia', status: 'legal_and_protected', note: 'French law applies — same-sex marriage is legal, and the islands are generally welcoming.' },
  mexico: { name: 'Mexico', status: 'legal_and_protected', note: 'Same-sex marriage is now legal and recognized nationwide, with Mexico City and coastal tourist destinations especially well known for a visible, welcoming LGBTQ+ scene.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'legal', note: 'Legal, with no marriage or union recognition — resort areas are generally welcoming, though the broader culture remains fairly conservative.' },
  'puerto-rico': { name: 'Puerto Rico', status: 'legal_and_protected', note: 'As US territory, same-sex marriage is legally recognized nationwide, with San Juan known for a visible LGBTQ+ scene.' },
  bahamas: { name: 'Bahamas', status: 'legal', note: 'Decriminalized since 1991, with no marriage recognition — resort areas are generally welcoming, though the wider culture remains conservative.' },
  jamaica: { name: 'Jamaica', status: 'criminalized', note: "A colonial-era 'buggery' law criminalizing same-sex activity between men remains on the books and enforcement/social hostility is a real, documented concern — this is one of the more difficult Caribbean destinations for LGBTQ+ travelers." },
  aruba: { name: 'Aruba', status: 'legal', note: 'Legal, with civil unions recognized under Dutch law — generally tolerant, especially in tourist areas.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'legal', note: 'Legal, with no marriage recognition — resort areas are generally welcoming, though the wider culture is fairly conservative.' },
  'st-lucia': { name: 'St. Lucia', status: 'legal', note: 'A colonial-era law technically remains on the books but has been subject to legal challenges regionally in recent years — check current status before you go, and expect a fairly conservative general culture.' },
  'costa-rica': { name: 'Costa Rica', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2020 — the most progressive country in Central America on this front, and generally welcoming.' },
  panama: { name: 'Panama', status: 'legal', note: 'Decriminalized since 2008, with no marriage recognition — Panama City is generally more tolerant than rural areas.' },
  belize: { name: 'Belize', status: 'legal', note: 'Decriminalized by a 2016 court ruling, with growing tolerance since, though there is no marriage or union recognition.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'legal', note: 'Legal, with civil partnerships recognized following a 2020 court ruling — generally more conservative culturally than nearby destinations.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'legal', note: 'Decriminalized by a 2022 court ruling — legal now, though there is no marriage or union recognition and the culture remains fairly conservative.' },
  curacao: { name: 'Curaçao', status: 'legal', note: 'Legal, with civil unions available under Dutch-associated law — generally tolerant, especially in tourist areas.' },
  canada: { name: 'Canada', status: 'legal_and_protected', note: 'Same-sex marriage has been legal nationwide since 2005 — one of the most LGBTQ+-friendly countries in the world.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'criminalized', note: 'Same-sex sexual activity is illegal under UAE law — real legal risk applies to tourists as well as residents; discretion is essential.' },
  morocco: { name: 'Morocco', status: 'criminalized', note: "Same-sex activity is illegal under the penal code and is periodically enforced — real legal risk; discretion is essential." },
  'south-africa': { name: 'South Africa', status: 'legal_and_protected', note: 'The first country in Africa to legalize same-sex marriage (2006), with full constitutional protection — though be aware that acceptance varies significantly by region, with more visible communities in Cape Town and Johannesburg.' },
  qatar: { name: 'Qatar', status: 'criminalized', note: 'Same-sex sexual activity is illegal under Qatari law — real legal risk applies to tourists as well as residents; discretion is essential.' },
  israel: { name: 'Israel', status: 'legal', note: "Legal, with a very visible and welcoming LGBTQ+ scene in Tel Aviv (one of the world's major Pride destinations) — same-sex marriage isn't performed domestically, though foreign same-sex marriages are recognized. The rest of the country tends to be more religiously conservative." },
  tanzania: { name: 'Tanzania', status: 'criminalized', note: 'Same-sex sexual activity is illegal and has historically been enforced harshly — real legal risk; discretion is essential.' },
  kenya: { name: 'Kenya', status: 'criminalized', note: 'A colonial-era law criminalizing same-sex activity remains in force — real legal risk; discretion is essential, including on safari trips outside major cities.' },
  argentina: { name: 'Argentina', status: 'legal_and_protected', note: 'The first country in Latin America to legalize same-sex marriage (2010), with strong protections and a very welcoming culture, especially in Buenos Aires.' },
  peru: { name: 'Peru', status: 'legal', note: 'Legal, with no marriage or civil union recognition nationally — Lima is generally more tolerant than rural areas.' },
  chile: { name: 'Chile', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2022, with strong protections.' },
  colombia: { name: 'Colombia', status: 'legal_and_protected', note: 'Same-sex marriage has been legal since 2016, with Bogotá and Medellín known for visible, welcoming LGBTQ+ scenes.' },
  brazil: { name: 'Brazil', status: 'legal_and_protected', note: "Same-sex marriage has been legal since 2013 with strong constitutional protections, and Brazil hosts some of the world's largest Pride celebrations — that said, anti-LGBTQ+ violence remains a real, documented concern in parts of the country, so stick to well-trafficked areas at night as you would anywhere." },
  'united-states': { name: 'United States', status: 'legal_and_protected', note: 'Same-sex marriage has been legal nationwide since 2015 — protections and social acceptance vary considerably by state and region, so it\'s worth knowing the specific area you\'re visiting.' },
};

const STATUS_LABELS = {
  legal_and_protected: 'Legal & Recognized',
  legal: 'Legal',
  criminalized: 'Criminalized',
};

const DISCLAIMER = "This is general legal/structural orientation, not real-time data — laws, enforcement, and social climate in this area have been changing quickly (in both directions) in multiple countries, and can vary by specific city or region within a country. Always check a current, specialized source like Equaldex.com before you book and again shortly before you fly.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const statusLabel = STATUS_LABELS[data.status];
  const headline = `${data.name}: ${statusLabel}.`;

  return {
    country, countryName: data.name, status: data.status, statusLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/lgbtq-travel-safety-checker/calculate
// @access Public
exports.calculateLgbtqSafety = (req, res) => {
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
// @route POST /api/tools/lgbtq-travel-safety-checker/pdf
// @access Public
exports.generateLgbtqSafetyPdf = async (req, res) => {
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
      [email, firstName || null, 'lgbtq-travel-safety-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} LGBTQ+ Travel Safety`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="lgbtq-travel-safety-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.statusLabel);

    pdfService.heading(doc, 'Before you book or fly');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'For up-to-date, city-level detail, check Equaldex.com or ILGA World\'s legal mapping report before you travel.',
      'Save your embassy or consulate\'s emergency contact number before you travel, not after you need it.',
      'Even in generally welcoming countries, acceptance and safety can vary a lot by specific city, region, or neighborhood — research your exact itinerary too.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🏳️‍🌈 Your ${result.countryName} LGBTQ+ travel safety check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the safety orientation for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond safety prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send lgbtq-travel-safety-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLgbtqSafetyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
