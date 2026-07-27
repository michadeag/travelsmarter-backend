const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Primary natural disaster / severe weather hazard per country. riskLevel:
// 'high' (well-documented, serious risk) | 'moderate' (worth being aware
// of) | 'low' (minor consideration for most travelers). riskySeason
// describes when the hazard is most active, or 'no fixed season' for
// hazards like earthquakes that aren't seasonal.
const COUNTRIES = {
  china: { name: 'China', primaryHazard: 'earthquakes and flooding', riskLevel: 'moderate', riskySeason: 'no fixed season for earthquakes (most frequent in the west/southwest); flooding risk peaks June–September along the Yangtze basin', note: 'Earthquakes are the main geological hazard, concentrated in western and southwestern provinces. Coastal and southern regions also see flooding tied to the summer monsoon.' },
  'united-arab-emirates': { name: 'United Arab Emirates', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'The UAE sees very little natural disaster risk — occasional dust storms and rare flash flooding from heavy winter rain are the main concerns.' },
  'saudi-arabia': { name: 'Saudi Arabia', primaryHazard: 'flash flooding', riskLevel: 'low', riskySeason: 'winter (November–February), during rare heavy rain events', note: 'Overall natural disaster risk is low; the main hazard is flash flooding in low-lying wadis during infrequent but intense winter rainstorms.' },
  turkey: { name: 'Turkey', primaryHazard: 'earthquakes', riskLevel: 'high', riskySeason: 'no fixed season — quakes can strike at any time', note: 'Turkey is one of the most earthquake-prone countries in the world, straddling the North Anatolian and East Anatolian fault lines. The 2023 Kahramanmaraş earthquakes killed tens of thousands.' },
  vietnam: { name: 'Vietnam', primaryHazard: 'typhoons and flooding', riskLevel: 'high', riskySeason: 'June–November, peaking September–November along the central and northern coast', note: 'Typhoons regularly make landfall along the central coast, bringing severe flooding and landslides, especially September through November.' },
  egypt: { name: 'Egypt', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Egypt has very low natural disaster risk overall — rare flash flooding in desert wadis after unusual heavy rain is the main concern.' },
  morocco: { name: 'Morocco', primaryHazard: 'earthquakes', riskLevel: 'moderate', riskySeason: 'no fixed season', note: 'Morocco sits in a seismically active zone — the 2023 High Atlas earthquake killed nearly 3,000 people. Coastal areas also face rare tsunami risk.' },
  india: { name: 'India', primaryHazard: 'monsoon flooding and cyclones', riskLevel: 'high', riskySeason: 'June–September (monsoon) and April–December (cyclones on the east coast)', note: 'Monsoon flooding affects much of the country June through September, while the east coast (Bay of Bengal) faces cyclone risk especially April–June and October–December.' },
  indonesia: { name: 'Indonesia', primaryHazard: 'earthquakes, volcanic eruptions, and tsunamis', riskLevel: 'high', riskySeason: "no fixed season — Indonesia sits on the Pacific \"Ring of Fire\"", note: 'Indonesia is one of the most disaster-prone countries on Earth, with frequent earthquakes, active volcanoes, and tsunami risk along many coastlines.' },
  thailand: { name: 'Thailand', primaryHazard: 'monsoon flooding', riskLevel: 'moderate', riskySeason: 'June–October (monsoon season)', note: 'Seasonal monsoon flooding affects central and northern Thailand, notably Bangkok and Chiang Mai, from June through October.' },
  singapore: { name: 'Singapore', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: "Singapore's location just outside the earthquake and typhoon belts gives it one of the lowest natural disaster risk profiles in the region — flash flooding during heavy monsoon rain is the main concern." },

  'united-states': { name: 'United States', primaryHazard: 'hurricanes, tornadoes, and wildfires', riskLevel: 'moderate', riskySeason: 'June–November (Atlantic hurricane season) on the Gulf/East Coast; spring for Tornado Alley; summer/fall for Western wildfires', note: 'Risk varies enormously by region — hurricanes threaten the Gulf and East Coasts in fall, tornadoes are most common in the central Plains in spring, and wildfires peak in the West in late summer.' },
  canada: { name: 'Canada', primaryHazard: 'wildfires', riskLevel: 'moderate', riskySeason: 'May–September (wildfire season, worst in British Columbia and the Prairies)', note: 'Wildfire smoke has increasingly disrupted travel in summer months. Earthquake risk exists on the West Coast but is less frequent.' },
  mexico: { name: 'Mexico', primaryHazard: 'hurricanes and earthquakes', riskLevel: 'high', riskySeason: 'June–November (hurricane season on both coasts)', note: 'Mexico faces hurricane risk on both the Pacific and Gulf/Caribbean coasts June through November, plus ongoing earthquake risk along the Pacific coast year-round.' },
  brazil: { name: 'Brazil', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: "Brazil sits outside major fault lines and hurricane paths, giving it one of the lowest natural disaster risk profiles in the Americas — seasonal flooding in the Amazon basin is the main regional concern." },
  argentina: { name: 'Argentina', primaryHazard: 'flooding', riskLevel: 'low', riskySeason: 'summer months (December–March) in low-lying areas', note: 'Overall risk is low; the main hazard is seasonal river flooding in low-lying provinces during summer rains.' },
  chile: { name: 'Chile', primaryHazard: 'earthquakes and volcanic eruptions', riskLevel: 'high', riskySeason: 'no fixed season', note: 'Chile sits along the Pacific Ring of Fire and has experienced some of the largest earthquakes ever recorded, plus active volcanoes throughout the Andes.' },
  colombia: { name: 'Colombia', primaryHazard: 'earthquakes and volcanic eruptions', riskLevel: 'moderate', riskySeason: 'no fixed season, plus landslide risk during the rainy seasons (April–May and October–November)', note: 'Colombia has moderate seismic and volcanic activity, particularly in the Andean region, plus landslide risk during the rainy seasons.' },
  peru: { name: 'Peru', primaryHazard: 'earthquakes', riskLevel: 'moderate', riskySeason: 'no fixed season, plus landslide risk in the Andes during the rainy season (December–March)', note: "Peru's Pacific coast sits along an active subduction zone with regular seismic activity; the Andes region also faces landslide risk during the rainy season." },
  'costa-rica': { name: 'Costa Rica', primaryHazard: 'earthquakes and volcanic activity', riskLevel: 'moderate', riskySeason: 'no fixed season, plus hurricane-adjacent heavy rain September–November on the Caribbean coast', note: 'Costa Rica has moderate seismic and volcanic activity, and the Caribbean coast can see heavy rain and flooding influenced by the Atlantic hurricane season.' },

  'united-kingdom': { name: 'United Kingdom', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'winter storms (November–March)', note: 'The UK has very low natural disaster risk — the main hazard is occasional winter storm flooding and high winds.' },
  ireland: { name: 'Ireland', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'winter storms (November–March)', note: 'Ireland has very low natural disaster risk — the main hazard is occasional Atlantic winter storms bringing flooding and high winds.' },
  france: { name: 'France', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'summer wildfire season (June–September) in the south', note: 'Mainland France has low overall risk — the main seasonal hazard is wildfires in the southern Mediterranean regions during summer.' },
  germany: { name: 'Germany', primaryHazard: 'flooding', riskLevel: 'low', riskySeason: 'summer months, after heavy rain events', note: 'Germany has low overall natural disaster risk, though river flooding after intense summer rainfall has caused serious damage in recent years.' },
  italy: { name: 'Italy', primaryHazard: 'earthquakes and volcanic activity', riskLevel: 'moderate', riskySeason: 'no fixed season', note: 'Italy has moderate seismic risk, particularly in the central Apennines, plus active volcanoes (Etna, Vesuvius, Stromboli).' },
  spain: { name: 'Spain', primaryHazard: 'wildfires and flooding', riskLevel: 'low', riskySeason: 'summer wildfire season (June–September); autumn flash flooding (September–November)', note: 'Overall risk is low, though summer wildfires and intense autumn flash flooding (like the 2024 Valencia floods) occur regularly.' },
  netherlands: { name: 'Netherlands', primaryHazard: 'coastal flooding', riskLevel: 'low', riskySeason: 'winter storm season (November–March)', note: 'Extensive flood defenses keep risk low despite much of the country sitting below sea level — winter storms are the main seasonal concern.' },
  portugal: { name: 'Portugal', primaryHazard: 'wildfires', riskLevel: 'moderate', riskySeason: 'summer wildfire season (June–September)', note: 'Portugal has experienced severe wildfire seasons in recent years, particularly in central and northern forested regions during summer.' },
  greece: { name: 'Greece', primaryHazard: 'wildfires and earthquakes', riskLevel: 'moderate', riskySeason: 'summer wildfire season (June–September)', note: 'Greece faces both seismic activity and, increasingly, severe summer wildfires that have affected popular tourist islands.' },
  austria: { name: 'Austria', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Austria has very low natural disaster risk — occasional alpine flooding or landslides after heavy rain are the main concern.' },
  switzerland: { name: 'Switzerland', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Switzerland has very low natural disaster risk — occasional alpine flooding, landslides, or avalanches in winter are the main concern.' },
  poland: { name: 'Poland', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Poland has very low natural disaster risk — occasional river flooding after heavy rain is the main concern.' },
  'czech-republic': { name: 'Czech Republic', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'The Czech Republic has very low natural disaster risk — occasional river flooding after heavy rain is the main concern.' },
  norway: { name: 'Norway', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Norway has very low natural disaster risk — occasional landslides or avalanches in mountainous regions are the main concern.' },
  sweden: { name: 'Sweden', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Sweden has very low natural disaster risk overall.' },
  denmark: { name: 'Denmark', primaryHazard: 'minimal natural disaster risk', riskLevel: 'low', riskySeason: 'no significant hazard season', note: 'Denmark has very low natural disaster risk overall.' },
  iceland: { name: 'Iceland', primaryHazard: 'volcanic activity and earthquakes', riskLevel: 'moderate', riskySeason: 'no fixed season', note: 'Iceland sits directly on the Mid-Atlantic Ridge with frequent volcanic eruptions and earthquakes — recent eruptions near Grindavík have periodically disrupted travel.' },

  japan: { name: 'Japan', primaryHazard: 'earthquakes, typhoons, and tsunamis', riskLevel: 'high', riskySeason: 'typhoon season June–October; earthquakes can strike year-round', note: 'Japan faces year-round earthquake and tsunami risk plus a defined typhoon season from June through October — the country has world-class early-warning systems and building codes.' },
  'south-korea': { name: 'South Korea', primaryHazard: 'typhoons', riskLevel: 'moderate', riskySeason: 'July–September (typhoon season)', note: 'South Korea sees occasional typhoon-driven flooding, mainly July through September; earthquake risk is low but not zero.' },
  malaysia: { name: 'Malaysia', primaryHazard: 'monsoon flooding', riskLevel: 'moderate', riskySeason: 'November–February (northeast monsoon) on the east coast of Peninsular Malaysia', note: 'Seasonal monsoon flooding affects the east coast of Peninsular Malaysia and parts of Borneo from November through February.' },
  philippines: { name: 'Philippines', primaryHazard: 'typhoons', riskLevel: 'high', riskySeason: 'June–November (peak typhoon season)', note: 'The Philippines is one of the most typhoon-exposed countries in the world, averaging around 20 storms per year, with the heaviest activity June through November.' },

  israel: { name: 'Israel', primaryHazard: 'earthquakes', riskLevel: 'moderate', riskySeason: 'no fixed season', note: 'Israel sits along the Dead Sea Transform fault system, giving it moderate ongoing seismic risk.' },
  jordan: { name: 'Jordan', primaryHazard: 'flash flooding', riskLevel: 'low', riskySeason: 'winter months (November–March)', note: 'Overall risk is low; flash flooding in desert wadis (including near Petra) during winter rain has caused fatalities in the past — check conditions before hiking canyon routes.' },
  kenya: { name: 'Kenya', primaryHazard: 'flooding and drought', riskLevel: 'moderate', riskySeason: 'long rains (March–May) and short rains (October–December)', note: 'Seasonal rains can bring flooding to low-lying areas, while drought is a recurring concern in northern regions.' },
  'south-africa': { name: 'South Africa', primaryHazard: 'wildfires and drought', riskLevel: 'low', riskySeason: 'summer wildfire season (December–February) in the Western Cape', note: 'Overall risk is low; the Western Cape faces a wildfire season in the dry summer months, and periodic drought has affected water supplies in Cape Town.' },

  australia: { name: 'Australia', primaryHazard: 'wildfires and cyclones', riskLevel: 'high', riskySeason: 'bushfire season December–February in the south; cyclone season November–April in the north', note: "Australia's \"Black Summer\" bushfires showed the scale of fire risk in the south each summer, while the tropical north faces a distinct cyclone season." },
  'new-zealand': { name: 'New Zealand', primaryHazard: 'earthquakes', riskLevel: 'moderate', riskySeason: 'no fixed season', note: 'New Zealand sits on the Pacific Ring of Fire — the 2011 Christchurch earthquake was a stark reminder of ongoing seismic risk, though building codes and warning systems are strong.' },
};

const RISK_LABELS = {
  high: 'high — a well-documented, serious risk worth actively planning around',
  moderate: 'moderate — worth being aware of, though not usually a reason to avoid travel',
  low: 'low — a minor consideration for most travelers',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s primary natural disaster risk is ${data.primaryHazard} (${RISK_LABELS[data.riskLevel]}), most active during ${data.riskySeason}.`;

  return {
    country, countryName: data.name, primaryHazard: data.primaryHazard, riskLevel: data.riskLevel,
    riskLevelLabel: RISK_LABELS[data.riskLevel], riskySeason: data.riskySeason, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/natural-disaster-checker/calculate
// @access Public
exports.calculateNaturalDisaster = (req, res) => {
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
// @route POST /api/tools/natural-disaster-checker/pdf
// @access Public
exports.generateNaturalDisasterPdf = async (req, res) => {
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
      [email, firstName || null, 'natural-disaster-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Natural Disaster Risk Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="natural-disaster-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Risk level: ${result.riskLevelLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.riskLevel === 'high'
        ? 'Buy travel insurance that explicitly covers natural disaster evacuation and trip interruption — standard policies sometimes exclude "foreseeable" seasonal events once a storm is already named.'
        : 'A standard travel insurance policy is usually enough here, but check it covers weather-related trip interruption just in case.',
      'Download your destination\'s official emergency alert app before you arrive — most disaster-prone countries run a free one, and cell service can be the first thing to fail.',
      'Know your embassy\'s location and register your trip with them if you\'re visiting during a high-risk season — it\'s the fastest way to get help or evacuation information.',
      'This guide reflects general seasonal patterns, not a forecast — always check current conditions and local advisories close to your travel dates.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `⛈️ Your ${result.countryName} natural disaster risk guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your natural disaster risk check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond risk awareness? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send natural-disaster-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateNaturalDisasterPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
