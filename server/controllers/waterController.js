const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Tap water safety per country, reused from Tool #3's country list.
// status: 'safe' | 'caution' | 'not_recommended'
// This is general orientation, not a guarantee — local conditions
// (rural vs. city, after storms, etc.) can vary even within a country.
const COUNTRIES = {
  france: { name: 'France', status: 'safe', note: 'Tap water is safe to drink throughout France, including Paris.' },
  austria: { name: 'Austria', status: 'safe', note: 'Tap water is safe to drink throughout Austria and is generally excellent quality.' },
  'czech-republic': { name: 'Czech Republic', status: 'safe', note: 'Tap water is safe to drink throughout the Czech Republic.' },
  denmark: { name: 'Denmark', status: 'safe', note: 'Tap water is safe to drink throughout Denmark and considered among the best-tasting in Europe.' },
  germany: { name: 'Germany', status: 'safe', note: 'Tap water is safe to drink throughout Germany and is tightly regulated.' },
  greece: { name: 'Greece', status: 'safe', note: 'Tap water is generally safe in major cities and Athens; on some smaller islands, bottled water is more commonly used due to local infrastructure — check locally.' },
  hungary: { name: 'Hungary', status: 'safe', note: 'Tap water is safe to drink throughout Hungary, including Budapest.' },
  iceland: { name: 'Iceland', status: 'safe', note: 'Tap water is safe to drink throughout Iceland and is famously pure, often sourced directly from glaciers.' },
  italy: { name: 'Italy', status: 'safe', note: 'Tap water is safe to drink throughout Italy, including the public drinking fountains (nasoni) in Rome.' },
  netherlands: { name: 'Netherlands', status: 'safe', note: 'Tap water is safe to drink throughout the Netherlands and considered among the best quality in the world.' },
  portugal: { name: 'Portugal', status: 'safe', note: 'Tap water is safe to drink throughout Portugal, including Lisbon.' },
  spain: { name: 'Spain', status: 'safe', note: 'Tap water is safe to drink throughout Spain, though many locals prefer bottled water for taste.' },
  sweden: { name: 'Sweden', status: 'safe', note: 'Tap water is safe to drink throughout Sweden and is of very high quality.' },
  switzerland: { name: 'Switzerland', status: 'safe', note: 'Tap water is safe to drink throughout Switzerland, including from many public fountains.' },
  ireland: { name: 'Ireland', status: 'safe', note: 'Tap water is safe to drink throughout Ireland.' },
  'united-kingdom': { name: 'United Kingdom', status: 'safe', note: 'Tap water is safe to drink throughout the UK.' },
  turkey: { name: 'Turkey', status: 'caution', note: 'Tap water is treated but many locals and visitors still prefer bottled water, especially outside major hotels, due to taste and mineral content rather than a strict safety concern.' },
  japan: { name: 'Japan', status: 'safe', note: 'Tap water is safe to drink throughout Japan and is tightly regulated.' },
  thailand: { name: 'Thailand', status: 'not_recommended', note: 'Stick to bottled or filtered water — tap water is not generally safe to drink, even in Bangkok. Avoid ice unless you know it\'s made from purified water.' },
  indonesia: { name: 'Indonesia', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Indonesia, including Bali — tap water is not safe to drink.' },
  singapore: { name: 'Singapore', status: 'safe', note: 'Tap water is safe to drink throughout Singapore and is tightly regulated.' },
  'south-korea': { name: 'South Korea', status: 'safe', note: 'Tap water is technically safe in most of South Korea, though many locals still prefer boiled or filtered water for taste — bottled water is widely available if you\'d rather be cautious.' },
  'hong-kong': { name: 'Hong Kong', status: 'caution', note: 'Tap water is treated to safe standards, but aging building pipes can affect quality — many residents boil or filter water; bottled water is a safe default for visitors.' },
  vietnam: { name: 'Vietnam', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Vietnam — tap water is not safe to drink.' },
  philippines: { name: 'Philippines', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout the Philippines — tap water safety varies widely and isn\'t reliable for travelers.' },
  malaysia: { name: 'Malaysia', status: 'caution', note: 'Tap water is treated but many locals boil it before drinking — bottled or filtered water is the safer default for visitors, especially outside Kuala Lumpur.' },
  china: { name: 'China', status: 'not_recommended', note: 'Stick to bottled or boiled water throughout mainland China — tap water is not recommended for drinking directly, even in major cities.' },
  india: { name: 'India', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout India — tap water is not safe to drink, and this is one of the most common causes of travelers\' illness in the country. Be cautious of ice too.' },
  maldives: { name: 'Maldives', status: 'caution', note: 'Most resorts provide desalinated or bottled water that\'s safe to drink — but avoid tap water on local islands unless confirmed treated.' },
  taiwan: { name: 'Taiwan', status: 'caution', note: 'Tap water is treated but many locals boil it before drinking due to older plumbing — bottled or filtered water is the safer default for visitors.' },
  'sri-lanka': { name: 'Sri Lanka', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Sri Lanka — tap water is not recommended for drinking.' },
  cambodia: { name: 'Cambodia', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Cambodia — tap water is not safe to drink.' },
  australia: { name: 'Australia', status: 'safe', note: 'Tap water is safe to drink throughout Australia\'s cities; in remote areas, follow any posted local advisories.' },
  'new-zealand': { name: 'New Zealand', status: 'safe', note: 'Tap water is safe to drink throughout New Zealand\'s cities and towns.' },
  fiji: { name: 'Fiji', status: 'caution', note: 'Tap water in Nadi and Suva is generally treated, but bottled or resort-filtered water is the safer default, especially on outer islands.' },
  'french-polynesia': { name: 'French Polynesia', status: 'caution', note: 'Tap water in Papeete is treated, but bottled water is commonly used and recommended, especially on smaller islands and atolls.' },
  mexico: { name: 'Mexico', status: 'not_recommended', note: 'Stick to bottled or purified water throughout Mexico, including resort areas — tap water is not safe to drink, and this includes ice unless confirmed purified.' },
  'dominican-republic': { name: 'Dominican Republic', status: 'not_recommended', note: 'Stick to bottled water throughout the Dominican Republic — tap water is not safe to drink, even at most resorts (though resort ice/drinking water is usually purified separately).' },
  'puerto-rico': { name: 'Puerto Rico', status: 'safe', note: 'Tap water is generally safe to drink in Puerto Rico, following US standards.' },
  bahamas: { name: 'Bahamas', status: 'caution', note: 'Tap water in Nassau is generally treated, but many locals and hotels still use bottled or filtered water — a safe default for visitors.' },
  jamaica: { name: 'Jamaica', status: 'caution', note: 'Tap water in resort areas and Kingston is generally treated, but bottled water is the safer default, especially outside major tourist zones.' },
  aruba: { name: 'Aruba', status: 'safe', note: 'Tap water is safe to drink throughout Aruba, thanks to a modern desalination system.' },
  'turks-and-caicos': { name: 'Turks and Caicos', status: 'caution', note: 'Tap water is treated but many rely on bottled or desalinated water — a safe default for visitors.' },
  'st-lucia': { name: 'St. Lucia', status: 'caution', note: 'Tap water is generally treated in resort areas, but bottled water is the safer default, especially outside tourist zones.' },
  'costa-rica': { name: 'Costa Rica', status: 'safe', note: 'Tap water is safe to drink in most of Costa Rica, including San José, though in remote rural areas it\'s worth checking locally.' },
  panama: { name: 'Panama', status: 'safe', note: 'Tap water is safe to drink in Panama City and most tourist areas, though remote rural areas may vary.' },
  belize: { name: 'Belize', status: 'caution', note: 'Tap water in Belize City and resort areas is generally treated, but bottled or filtered water is the safer default, especially outside main towns.' },
  'cayman-islands': { name: 'Cayman Islands', status: 'safe', note: 'Tap water is safe to drink throughout the Cayman Islands, thanks to modern desalination.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', status: 'caution', note: 'Tap water is treated but bottled water is commonly used and recommended for visitors.' },
  curacao: { name: 'Curaçao', status: 'safe', note: 'Tap water is safe to drink throughout Curaçao, thanks to a modern desalination system.' },
  canada: { name: 'Canada', status: 'safe', note: 'Tap water is safe to drink throughout Canada.' },
  'united-arab-emirates': { name: 'United Arab Emirates', status: 'safe', note: 'Tap water is technically safe (desalinated) throughout the UAE, though most residents and hotels default to bottled water for taste.' },
  morocco: { name: 'Morocco', status: 'not_recommended', note: 'Stick to bottled water throughout Morocco — tap water is not recommended for drinking, especially outside major hotels.' },
  'south-africa': { name: 'South Africa', status: 'safe', note: 'Tap water is safe to drink in most South African cities, including Cape Town, though check for any local drought-related advisories.' },
  qatar: { name: 'Qatar', status: 'safe', note: 'Tap water is technically safe (desalinated) throughout Qatar, though bottled water is commonly preferred for taste.' },
  israel: { name: 'Israel', status: 'safe', note: 'Tap water is safe to drink throughout Israel.' },
  tanzania: { name: 'Tanzania', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Tanzania, including Zanzibar — tap water is not safe to drink.' },
  kenya: { name: 'Kenya', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Kenya — tap water is not safe to drink, even in Nairobi.' },
  argentina: { name: 'Argentina', status: 'safe', note: 'Tap water is safe to drink in Buenos Aires and most major Argentine cities.' },
  peru: { name: 'Peru', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Peru, including Lima and Cusco — tap water is not recommended for drinking.' },
  chile: { name: 'Chile', status: 'safe', note: 'Tap water is safe to drink in Santiago and most of Chile, though it can have a distinct mineral taste in some regions.' },
  colombia: { name: 'Colombia', status: 'caution', note: 'Tap water is treated and generally safe in Bogotá, but bottled or filtered water is the safer default in Cartagena and other coastal/rural areas.' },
  brazil: { name: 'Brazil', status: 'not_recommended', note: 'Stick to bottled or filtered water throughout Brazil — tap water quality varies significantly and isn\'t reliable for travelers.' },
};

const STATUS_LABELS = { safe: 'Safe to drink', caution: 'Use caution', not_recommended: 'Not recommended' };

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  let headline;
  if (data.status === 'safe') {
    headline = `${data.name}: tap water is safe to drink.`;
  } else if (data.status === 'caution') {
    headline = `${data.name}: tap water is treated but bottled or filtered water is the safer default.`;
  } else {
    headline = `${data.name}: stick to bottled or filtered water — tap water isn't recommended.`;
  }

  return {
    country, countryName: data.name, status: data.status, statusLabel: STATUS_LABELS[data.status],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/water-safety-checker/calculate
// @access Public
exports.calculateWaterSafety = (req, res) => {
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
// @route POST /api/tools/water-safety-checker/pdf
// @access Public
exports.generateWaterSafetyPdf = async (req, res) => {
  try {
    const { email, firstName, country } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      ['water-safety-checker', firstName || null, 'water-safety-checker',
        JSON.stringify({ country }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Water Safety Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="water-safety-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `${result.countryName}: ${result.statusLabel}`);

    pdfService.heading(doc, 'General tips');
    pdfService.bulletList(doc, [
      'If tap water isn\'t recommended, extend that caution to ice cubes in drinks, unless you know a venue uses purified ice.',
      'Brushing your teeth with tap water is usually fine even where drinking it isn\'t recommended — but if in doubt, use bottled water for that too.',
      'A reusable water bottle with a built-in filter can save money and reduce plastic waste in destinations where bottled water is the default.',
      'Sealed bottled water from a reputable brand is the simplest safe option almost everywhere — check the seal is intact before drinking.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💧 Your ${result.countryName} water safety guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your water safety check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond water safety? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send water-safety-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateWaterSafetyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
