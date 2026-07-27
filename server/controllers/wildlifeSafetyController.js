const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Wildlife/venomous animal hazard level per country. level: 'high'
// (notable venomous or dangerous wildlife is a real consideration for
// outdoor activities) | 'moderate' (some notable hazards, mainly in
// specific regions or activities) | 'low' (rarely a practical concern
// for typical travel).
const COUNTRIES = {
  australia: { name: 'Australia', level: 'high', note: 'Home to some of the world\'s most venomous snakes and spiders (funnel-web, redback), plus box jellyfish and saltwater crocodiles in northern waters — wear shoes outdoors, check swimming advisories, and never approach crocodile-warning signage.' },
  thailand: { name: 'Thailand', level: 'high', note: 'Venomous snakes (king cobra, kraits, vipers) are present, especially in rural and forested areas — watch your step on jungle trails and shake out shoes/bedding in rural accommodation.' },
  india: { name: 'India', level: 'high', note: 'India has one of the highest snakebite rates in the world, largely in rural areas — the "Big Four" venomous species (cobra, krait, Russell\'s viper, saw-scaled viper) are widespread. Wear closed shoes and use a light at night in rural areas.' },
  brazil: { name: 'Brazil', level: 'high', note: 'Amazon regions have venomous snakes, spiders, and other wildlife — stick to guided tours in rainforest areas, wear boots, and avoid reaching into dense vegetation or gaps in logs/rocks.' },
  'south-africa': { name: 'South Africa', level: 'high', note: 'Safari areas have dangerous large mammals (Big Five) and venomous snakes like the black mamba — always follow guide instructions on safari and never leave a vehicle in game reserves without permission.' },
  'costa-rica': { name: 'Costa Rica', level: 'high', note: 'Venomous snakes including the fer-de-lance are present in rainforest areas — guided eco-tourism significantly reduces risk; wear closed-toe shoes on jungle trails.' },
  indonesia: { name: 'Indonesia', level: 'high', note: 'Venomous snakes are present nationwide, and Komodo dragons (found only on a few specific islands) are genuinely dangerous — always stay with a ranger on Komodo Island.' },
  kenya: { name: 'Kenya', level: 'high', note: 'Safari areas have dangerous large mammals — always follow guide instructions and never leave a vehicle in game reserves without explicit permission.' },
  tanzania: { name: 'Tanzania', level: 'high', note: 'Safari and Kilimanjaro-adjacent areas have dangerous large mammals — always follow guide instructions on safari.' },

  'united-states': { name: 'United States', level: 'moderate', note: 'Rattlesnakes exist in many western/southern states, and bears are a real consideration in national parks — store food properly when camping and stay on marked trails.' },
  canada: { name: 'Canada', level: 'moderate', note: 'Black bears and, in some regions, grizzly bears are a genuine consideration for hikers and campers — carry bear spray in wilderness areas and store food away from tents.' },
  mexico: { name: 'Mexico', level: 'moderate', note: 'Scorpions and some venomous snakes are present, especially in drier regions — shake out shoes and bedding when staying in rural accommodation.' },
  egypt: { name: 'Egypt', level: 'moderate', note: 'Scorpions and some snakes are present in desert areas — check bedding and shoes when camping or staying in desert lodges.' },
  vietnam: { name: 'Vietnam', level: 'moderate', note: 'Venomous snakes are present, mainly in rural and mountainous areas — watch your step on rural trails.' },
  philippines: { name: 'Philippines', level: 'moderate', note: 'Some venomous snakes and jellyfish species are present — check local advisories before swimming in unfamiliar waters.' },
  malaysia: { name: 'Malaysia', level: 'moderate', note: 'Venomous snakes are present in forested and rural areas — stick to marked trails in jungle areas.' },
  turkey: { name: 'Turkey', level: 'moderate', note: 'Scorpions are present in rural and desert-adjacent areas — check shoes and bedding when staying in rural accommodation.' },
  morocco: { name: 'Morocco', level: 'moderate', note: 'Scorpions are present, especially in desert regions — check shoes and bedding, particularly when camping in the Sahara.' },
  peru: { name: 'Peru', level: 'moderate', note: 'Amazon regions have venomous snakes and spiders — guided tours significantly reduce risk; wear boots on jungle trails.' },
  argentina: { name: 'Argentina', level: 'moderate', note: 'Some venomous snakes and spiders exist in northern regions — a lower practical risk than most South American neighbors overall.' },
  colombia: { name: 'Colombia', level: 'moderate', note: 'Amazon and jungle regions have venomous snakes and spiders — guided tours significantly reduce risk.' },
  'sri-lanka': { name: 'Sri Lanka', level: 'moderate', note: 'Venomous snakes are present, mainly in rural and forested areas — watch your step on rural trails.' },
  nepal: { name: 'Nepal', level: 'moderate', note: 'Lower-elevation forested areas have some venomous snakes — a minor consideration compared to the trekking/altitude risks that dominate Nepal travel.' },
  cambodia: { name: 'Cambodia', level: 'moderate', note: 'Venomous snakes are present, mainly in rural areas — watch your step on rural trails.' },
  china: { name: 'China', level: 'moderate', note: 'Some regions (particularly southern/rural areas) have venomous snakes — a minor consideration for most urban/standard tourist itineraries.' },

  'united-kingdom': { name: 'United Kingdom', level: 'low', note: 'The adder is the only venomous snake, and bites are rarely serious — dangerous wildlife is not a practical concern for typical travel.' },
  ireland: { name: 'Ireland', level: 'low', note: 'Ireland has no native snakes at all — dangerous wildlife is not a practical concern for typical travel.' },
  france: { name: 'France', level: 'low', note: 'A few mildly venomous snake species exist in rural areas, but dangerous wildlife is not a practical concern for typical travel.' },
  germany: { name: 'Germany', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  italy: { name: 'Italy', level: 'low', note: 'A few mildly venomous snake species exist in rural areas, but dangerous wildlife is not a practical concern for typical travel.' },
  spain: { name: 'Spain', level: 'low', note: 'A few mildly venomous snake species exist in rural areas, but dangerous wildlife is not a practical concern for typical travel.' },
  netherlands: { name: 'Netherlands', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  portugal: { name: 'Portugal', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  greece: { name: 'Greece', level: 'low', note: 'A few mildly venomous snake species exist in rural areas, but dangerous wildlife is not a practical concern for typical travel.' },
  austria: { name: 'Austria', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  switzerland: { name: 'Switzerland', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  poland: { name: 'Poland', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  'czech-republic': { name: 'Czech Republic', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  norway: { name: 'Norway', level: 'low', note: 'Brown bears exist in remote northern areas but are rarely encountered — not a practical concern for typical travel.' },
  sweden: { name: 'Sweden', level: 'low', note: 'Brown bears exist in remote northern areas but are rarely encountered — not a practical concern for typical travel.' },
  denmark: { name: 'Denmark', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  iceland: { name: 'Iceland', level: 'low', note: 'Iceland has no native land predators or venomous animals at all — dangerous wildlife is genuinely not a concern.' },
  japan: { name: 'Japan', level: 'low', note: 'Some venomous snakes exist on southern islands (Okinawa), but dangerous wildlife is not a practical concern for most travel.' },
  'south-korea': { name: 'South Korea', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  singapore: { name: 'Singapore', level: 'low', note: 'Highly urbanized with minimal wildlife exposure — not a practical concern for typical travel.' },
  'new-zealand': { name: 'New Zealand', level: 'low', note: 'New Zealand has no native snakes and no dangerous native land mammals at all — one of the safest destinations in the world on this front.' },
  israel: { name: 'Israel', level: 'low', note: 'Some venomous snakes exist in desert areas, but dangerous wildlife is not a practical concern for typical travel.' },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 'low', note: 'Dangerous wildlife is not a practical concern for typical travel.' },
  'saudi-arabia': { name: 'Saudi Arabia', level: 'low', note: 'Some venomous snakes and scorpions exist in desert areas, but dangerous wildlife is not a practical concern for typical urban travel.' },
  jordan: { name: 'Jordan', level: 'low', note: 'Some scorpions exist in desert areas, but dangerous wildlife is not a practical concern for typical travel.' },
  chile: { name: 'Chile', level: 'low', note: 'Chile has very few dangerous wild animals compared to its South American neighbors — not a significant practical concern.' },
};

const LEVEL_LABELS = {
  high: 'high — notable venomous or dangerous wildlife is a real consideration for outdoor activities',
  moderate: 'moderate — some notable wildlife hazards exist, mainly in specific regions or activities',
  low: 'low — dangerous wildlife is rarely a practical concern for typical travel',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s wildlife hazard level is ${LEVEL_LABELS[data.level]}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel: LEVEL_LABELS[data.level],
    note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/wildlife-safety-checker/calculate
// @access Public
exports.calculateWildlifeSafety = (req, res) => {
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
// @route POST /api/tools/wildlife-safety-checker/pdf
// @access Public
exports.generateWildlifeSafetyPdf = async (req, res) => {
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
      [email, firstName || null, 'wildlife-safety-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Wildlife Safety Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="wildlife-safety-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.levelLabel);

    pdfService.heading(doc, 'General wildlife safety tips');
    pdfService.bulletList(doc, [
      'If bitten or stung by anything venomous, stay calm, keep the affected limb still and below heart level if possible, and get to medical care immediately — don\'t attempt to suck out venom or apply a tourniquet, both are outdated advice that can cause more harm.',
      'Wear closed-toe shoes on rural trails, and check shoes and bedding before use in rural or outdoor accommodation, especially at dawn and dusk when many species are most active.',
      'Always book guided tours for wildlife-viewing activities (safaris, jungle treks) rather than exploring independently — guides know current local hazards and how to respond to them.',
      'This guide reflects general, widely-known patterns — always check current specific advisories for your exact destination and activities before you travel.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🐍 Your ${result.countryName} wildlife safety guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your wildlife safety check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond wildlife safety? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send wildlife-safety-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateWildlifeSafetyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
