const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// How easy it is to find halal food per destination — a dietary-
// availability topic not covered by any other tool in this app.
// availabilityLevel: 'widespread' (halal is the norm or extensively
// certified and available almost everywhere) | 'good' (large Muslim
// communities support genuinely good availability, concentrated in
// major cities) | 'limited' (findable with some research, mostly in
// capital/tourist areas) | 'rare' (genuinely hard to find outside
// self-catering or a handful of specific restaurants).
const COUNTRIES = {
  france: { name: 'France', availabilityLevel: 'good', note: "France has one of Europe's largest Muslim populations, and halal restaurants, butchers, and even halal fast-food chains are common in Paris and other major cities — much less so in small towns." },
  austria: { name: 'Austria', availabilityLevel: 'limited', note: 'Halal restaurants and shops exist in Vienna, largely serving the local Muslim community, but options thin out quickly outside the capital.' },
  'czech-republic': { name: 'Czech Republic', availabilityLevel: 'limited', note: 'A small but growing number of halal restaurants exist in Prague; options are sparse elsewhere in the country.' },
  denmark: { name: 'Denmark', availabilityLevel: 'limited', note: 'Halal restaurants and shops are findable in Copenhagen, serving the local Muslim community; options thin out outside the capital.' },
  germany: { name: 'Germany', availabilityLevel: 'good', note: "Germany has one of Europe's largest Muslim populations, and halal restaurants, butchers, and Turkish-style döner shops are genuinely common in most major cities." },
  greece: { name: 'Greece', availabilityLevel: 'limited', note: 'Halal options exist in Athens, largely serving the local Muslim and immigrant community; options thin out considerably outside the capital and tourist islands.' },
  hungary: { name: 'Hungary', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Budapest; options are sparse elsewhere in the country.' },
  iceland: { name: 'Iceland', availabilityLevel: 'limited', note: "A handful of halal-friendly options exist in Reykjavík; Iceland's very small Muslim community means options are genuinely limited." },
  italy: { name: 'Italy', availabilityLevel: 'limited', note: 'Halal restaurants exist in Rome, Milan, and other major cities, largely serving immigrant communities; smaller towns and tourist areas often have little to no dedicated halal food.' },
  netherlands: { name: 'Netherlands', availabilityLevel: 'good', note: 'The Netherlands has a well-established Muslim population, and halal restaurants, butchers, and shops are genuinely common in Amsterdam, Rotterdam, and other major cities.' },
  portugal: { name: 'Portugal', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Lisbon; options thin out considerably elsewhere in the country.' },
  spain: { name: 'Spain', availabilityLevel: 'limited', note: 'Halal restaurants exist in Madrid, Barcelona, and other major cities, largely serving immigrant communities; smaller towns and resort areas often have little dedicated halal food.' },
  sweden: { name: 'Sweden', availabilityLevel: 'good', note: 'Sweden has a well-established Muslim population, and halal restaurants, butchers, and shops are genuinely common in Stockholm, Malmö, and other major cities.' },
  switzerland: { name: 'Switzerland', availabilityLevel: 'limited', note: 'Halal options exist in Zurich, Geneva, and other major cities, largely serving the local Muslim community; options thin out outside them.' },
  ireland: { name: 'Ireland', availabilityLevel: 'limited', note: 'A small but growing number of halal restaurants exist in Dublin; options are sparse elsewhere in the country.' },
  'united-kingdom': { name: 'United Kingdom', availabilityLevel: 'good', note: 'The UK has one of the largest and most established Muslim populations in Europe, and halal food — from restaurants to major supermarket chains — is genuinely widely available in most cities, not just London.' },
  turkey: { name: 'Turkey', availabilityLevel: 'widespread', note: "Turkey is a Muslim-majority country, and virtually all food is halal by default outside a small number of international establishments — this is essentially a non-issue here." },
  japan: { name: 'Japan', availabilityLevel: 'limited', note: "Japan's tourism boards have invested in halal-certified restaurants and prayer facilities in Tokyo, Osaka, and other major cities in recent years, but options remain genuinely limited and require some planning outside those curated areas." },
  thailand: { name: 'Thailand', availabilityLevel: 'good', note: "Thailand has a significant Muslim population (especially in the south) and a well-developed halal tourism industry — halal restaurants and halal-certified hotels are genuinely easy to find in Bangkok and major tourist areas." },
  indonesia: { name: 'Indonesia', availabilityLevel: 'widespread', note: "Indonesia is the world's most populous Muslim-majority country, and halal food is the default virtually everywhere — Hindu-majority Bali is a partial exception, where non-halal and halal options coexist widely." },
  singapore: { name: 'Singapore', availabilityLevel: 'widespread', note: "Singapore has a large, well-established Muslim population and one of the world's most rigorous halal certification systems — halal restaurants, hawker stalls, and even halal-certified chain outlets are genuinely everywhere." },
  'south-korea': { name: 'South Korea', availabilityLevel: 'limited', note: "South Korea has actively developed halal-certified restaurants and a Muslim-friendly tourism scene, especially around Itaewon in Seoul, but options remain genuinely limited and concentrated outside those specific areas." },
  'hong-kong': { name: 'Hong Kong', availabilityLevel: 'good', note: 'Hong Kong is a genuinely multicultural city, and halal restaurants are readily findable, particularly around Kowloon and areas with South Asian and Middle Eastern communities.' },
  vietnam: { name: 'Vietnam', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Ho Chi Minh City and Hanoi, largely serving the local Muslim community and Muslim tourists; options thin out considerably elsewhere.' },
  philippines: { name: 'Philippines', availabilityLevel: 'good', note: 'The Philippines has a significant Muslim population (especially in Mindanao), and Manila has a genuinely good number of halal restaurants catering to both locals and tourists.' },
  malaysia: { name: 'Malaysia', availabilityLevel: 'widespread', note: 'Malaysia is a Muslim-majority country with one of the most rigorous halal certification systems in the world — halal food is the default virtually everywhere, including most restaurant chains and hawker stalls.' },
  china: { name: 'China', availabilityLevel: 'good', note: "China has a significant Hui Muslim population, and halal restaurants (often marked with Arabic script or a green sign) are genuinely common in most major cities, not just Xinjiang." },
  india: { name: 'India', availabilityLevel: 'good', note: 'India has one of the largest Muslim populations in the world, and halal food is genuinely widely available in most cities — especially strong in Delhi, Hyderabad, and Mumbai.' },
  maldives: { name: 'Maldives', availabilityLevel: 'good', note: 'The Maldives is a Muslim-majority nation, so standard local food is halal by default — resort islands catering to international tourists do serve alcohol and non-halal items on request, so it\'s worth confirming with your specific resort.' },
  taiwan: { name: 'Taiwan', availabilityLevel: 'limited', note: "Taiwan has invested in Muslim-friendly tourism with a growing number of halal-certified restaurants in Taipei, but options remain genuinely limited and require some planning outside curated areas." },
  'sri-lanka': { name: 'Sri Lanka', availabilityLevel: 'good', note: 'Sri Lanka has a well-established Muslim minority, and halal restaurants are genuinely easy to find in Colombo and other major towns.' },
  cambodia: { name: 'Cambodia', availabilityLevel: 'limited', note: "A small Cham Muslim minority supports a limited number of halal restaurants, mainly in Phnom Penh; options thin out considerably elsewhere." },
  australia: { name: 'Australia', availabilityLevel: 'good', note: 'Australia has well-established Muslim communities in its major cities, and halal restaurants, butchers, and certified products are genuinely easy to find in Sydney, Melbourne, and other large cities.' },
  'new-zealand': { name: 'New Zealand', availabilityLevel: 'limited', note: "A small but established Muslim community supports a growing number of halal options in Auckland; options thin out considerably elsewhere in the country." },
  fiji: { name: 'Fiji', availabilityLevel: 'good', note: 'Fiji has a notable Indo-Fijian Muslim minority, and halal food is genuinely easier to find here than in most other Pacific island destinations, particularly around Suva.' },
  'french-polynesia': { name: 'French Polynesia', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  mexico: { name: 'Mexico', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Mexico City, largely serving a small local Muslim and Middle Eastern immigrant community; options are essentially nonexistent in most resort areas.' },
  'dominican-republic': { name: 'Dominican Republic', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  'puerto-rico': { name: 'Puerto Rico', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  bahamas: { name: 'Bahamas', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  jamaica: { name: 'Jamaica', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  aruba: { name: 'Aruba', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  'turks-and-caicos': { name: 'Turks and Caicos', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  'st-lucia': { name: 'St. Lucia', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  'costa-rica': { name: 'Costa Rica', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside a few spots in San José and self-catering elsewhere.' },
  panama: { name: 'Panama', availabilityLevel: 'rare', note: 'A small Muslim community supports a handful of halal restaurants in Panama City; options are essentially nonexistent elsewhere.' },
  belize: { name: 'Belize', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  'cayman-islands': { name: 'Cayman Islands', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  curacao: { name: 'Curaçao', availabilityLevel: 'rare', note: 'A very small Muslim community means dedicated halal food is genuinely hard to find outside self-catering or asking specific restaurants about ingredients.' },
  canada: { name: 'Canada', availabilityLevel: 'good', note: 'Canada has well-established Muslim communities in Toronto, Vancouver, and other major cities, and halal restaurants, butchers, and certified products are genuinely easy to find there.' },
  'united-arab-emirates': { name: 'United Arab Emirates', availabilityLevel: 'widespread', note: "The UAE is a Muslim-majority country with rigorous halal standards, and virtually all food served is halal by default — the main exception is a small number of licensed international restaurants and hotel bars that also serve alcohol and pork to non-Muslim guests." },
  morocco: { name: 'Morocco', availabilityLevel: 'widespread', note: "Morocco is a Muslim-majority country, and virtually all food is halal by default outside a small number of international/tourist establishments — this is essentially a non-issue here." },
  'south-africa': { name: 'South Africa', availabilityLevel: 'good', note: "South Africa has a well-established Cape Malay Muslim community, and halal restaurants, butchers, and certified products are genuinely easy to find, especially in Cape Town and Durban." },
  qatar: { name: 'Qatar', availabilityLevel: 'widespread', note: "Qatar is a Muslim-majority country with rigorous halal standards, and virtually all food served is halal by default — the main exception is a small number of licensed international hotel restaurants and bars." },
  israel: { name: 'Israel', availabilityLevel: 'good', note: 'Halal food is genuinely easy to find in Arab-majority areas like East Jerusalem, Nazareth, and Jaffa; kosher food (which shares some but not all dietary rules with halal) is far more prevalent in Jewish-majority areas.' },
  tanzania: { name: 'Tanzania', availabilityLevel: 'good', note: "Zanzibar and the Swahili coast have a Muslim-majority population, and halal food is the default there — mainland safari areas and international hotels typically offer both halal and non-halal options." },
  kenya: { name: 'Kenya', availabilityLevel: 'good', note: "Coastal areas like Mombasa and Lamu have a significant Muslim population, and halal food is genuinely easy to find there — inland and safari areas typically offer both halal and non-halal options at international hotels." },
  argentina: { name: 'Argentina', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Buenos Aires, serving a modest local Muslim and Middle Eastern immigrant community; options are essentially nonexistent elsewhere.' },
  peru: { name: 'Peru', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Lima; options are essentially nonexistent on the main tourist circuit outside the capital.' },
  chile: { name: 'Chile', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Santiago, serving a modest local Muslim and Middle Eastern immigrant community; options are essentially nonexistent elsewhere.' },
  colombia: { name: 'Colombia', availabilityLevel: 'limited', note: 'A small number of halal restaurants exist in Bogotá; options are essentially nonexistent elsewhere in the country.' },
  brazil: { name: 'Brazil', availabilityLevel: 'limited', note: 'A notable Arab-Brazilian community in São Paulo supports a real, if limited, number of halal restaurants; options thin out considerably elsewhere.' },
  'united-states': { name: 'United States', availabilityLevel: 'good', note: 'Large, well-established Muslim communities in cities like New York, Chicago, Detroit, and Los Angeles support genuinely good halal food availability — smaller towns and rural areas can be much more limited.' },
};

const AVAILABILITY_LABELS = {
  widespread: 'Widespread — the Default, Not the Exception',
  good: 'Good — Easy to Find in Major Cities',
  limited: 'Limited — Findable With Some Research',
  rare: 'Rare — Plan Ahead or Self-Cater',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const availabilityLabel = AVAILABILITY_LABELS[data.availabilityLevel];
  const headline = `${data.name}: ${availabilityLabel}.`;

  return {
    country, countryName: data.name, availabilityLevel: data.availabilityLevel, availabilityLabel,
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/halal-food-checker/calculate
// @access Public
exports.calculateHalalFood = (req, res) => {
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
// @route POST /api/tools/halal-food-checker/pdf
// @access Public
exports.generateHalalFoodPdf = async (req, res) => {
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
      [email, firstName || null, 'halal-food-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Halal Food Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="halal-food-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.availabilityLabel);

    pdfService.heading(doc, 'Tips for finding halal food anywhere');
    pdfService.bulletList(doc, [
      'Apps like Zabihah and HalalTrip crowdsource verified halal restaurant listings worldwide, and are worth checking before you rely on general search results.',
      'Vegetarian and seafood dishes are widely available fallback options almost everywhere, even where dedicated halal meat is hard to find.',
      'Self-catering (a kitchenette or grocery run) is a reliable backup in destinations with limited options — look for halal-certified packaged goods at larger supermarkets.',
      'When in doubt, asking directly about ingredients and preparation is normal and expected — most restaurant staff, even without halal certification, can tell you what\'s in a dish.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🍽️ Your ${result.countryName} halal food guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the halal food availability check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond finding food? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send halal-food-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateHalalFoodPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
