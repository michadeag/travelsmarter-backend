const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Ocean/beach safety orientation per destination — rip current risk,
// jellyfish/stinger season, shark risk, and swimming water quality.
// Distinct from wildlifeSafetyController.js (general land wildlife
// hazards like snakes) and waterController.js (tap water potability, a
// completely different topic). riskLevel: 'low' (calm, well-monitored
// or minimal hazards) | 'moderate' (real seasonal or local hazards
// worth knowing about) | 'high' (well-documented, serious hazards —
// strong rip currents, dangerous jellyfish, or notable shark presence).
// This is general orientation, not real-time data — conditions vary by
// specific beach, season, and day; always follow local flag warnings.
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'moderate', note: "The Atlantic coast (Biarritz, Landes) has genuinely strong rip currents and swells — famous surf beaches for a reason — while the Mediterranean coast is calmer. Always swim at flagged, lifeguarded beaches on the Atlantic side." },
  austria: { name: 'Austria', riskLevel: 'low', note: 'Landlocked — no ocean beaches, though Austria has many lakes with generally calm, well-monitored swimming areas.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'low', note: 'Landlocked — no ocean beaches, though the Czech Republic has many lakes and rivers with generally calm swimming areas.' },
  denmark: { name: 'Denmark', riskLevel: 'low', note: 'Generally calm, well-monitored beaches with a strong lifeguard/flag-warning culture — cold water temperature is the main practical consideration rather than currents or marine life.' },
  germany: { name: 'Germany', riskLevel: 'low', note: "Germany's North Sea and Baltic coasts have generally calm, well-monitored beaches — cold water and occasional strong tides on the North Sea coast are the main practical considerations." },
  greece: { name: 'Greece', riskLevel: 'moderate', note: 'Generally calm Mediterranean waters, but jellyfish blooms (usually not dangerous, but can sting) occur seasonally, especially in late summer — check with locals or lifeguards for current conditions.' },
  hungary: { name: 'Hungary', riskLevel: 'low', note: "Landlocked — no ocean beaches, though Lake Balaton offers generally calm, well-monitored freshwater swimming." },
  iceland: { name: 'Iceland', riskLevel: 'low', note: "Iceland's ocean water is too cold for casual swimming almost everywhere — the main risk is sneaker waves at black-sand beaches like Reynisfjara, which have caused real fatalities. Stay well back from the waterline at those specific spots." },
  italy: { name: 'Italy', riskLevel: 'moderate', note: 'Generally calm Mediterranean waters, but jellyfish blooms (usually not dangerous, but can sting) occur seasonally — check with locals or lifeguards for current conditions.' },
  netherlands: { name: 'Netherlands', riskLevel: 'low', note: "The North Sea coast has generally calm, well-monitored beaches — strong currents and cold water are the main practical considerations, especially around inlets." },
  portugal: { name: 'Portugal', riskLevel: 'moderate', note: "Portugal's Atlantic coast has genuinely strong rip currents and swells — a world-famous surf destination for a reason. Always swim at flagged, lifeguarded beaches, and respect red-flag closures." },
  spain: { name: 'Spain', riskLevel: 'moderate', note: 'Generally calm Mediterranean waters, but jellyfish blooms (usually not dangerous, but can sting) occur seasonally in late summer — the Atlantic coast (Basque Country, Galicia) has notably stronger currents than the Mediterranean side.' },
  sweden: { name: 'Sweden', riskLevel: 'low', note: 'Generally calm, well-monitored beaches and lakes — cold water temperature is the main practical consideration rather than currents or marine life.' },
  switzerland: { name: 'Switzerland', riskLevel: 'low', note: 'Landlocked — no ocean beaches, though Switzerland has many lakes with generally calm, well-monitored swimming areas.' },
  ireland: { name: 'Ireland', riskLevel: 'low', note: "Ireland's coast has real rip currents at some Atlantic beaches, but cold water keeps casual swimming limited — always check for lifeguard flags where present." },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'low', note: 'Generally calm, well-monitored beaches with an established lifeguard/flag culture — cold water and occasional strong currents at specific spots are the main practical considerations.' },
  turkey: { name: 'Turkey', riskLevel: 'moderate', note: 'Generally calm Mediterranean and Aegean waters, but jellyfish blooms occur seasonally, and some southern beaches have notable rip currents — check local flag warnings.' },
  japan: { name: 'Japan', riskLevel: 'moderate', note: 'Jellyfish (including some venomous species) are a genuine seasonal concern in summer at many beaches, and typhoon season can bring dangerous rip currents and rough surf — check local warnings and jellyfish nets where provided.' },
  thailand: { name: 'Thailand', riskLevel: 'high', note: "Rip currents are a well-documented, serious hazard at popular beaches (Phuket, Koh Samui, Koh Phi Phi), especially during monsoon season, and box jellyfish sightings have increased in recent years — always swim at flagged beaches and heed warning signs, since drownings do occur here regularly." },
  indonesia: { name: 'Indonesia', riskLevel: 'high', note: 'Strong currents and notable drowning statistics at popular beaches (Kuta and other south Bali beaches especially), plus box jellyfish risk in some areas — always swim between the flags at patrolled beaches and take local warnings seriously.' },
  singapore: { name: 'Singapore', riskLevel: 'low', note: 'Generally calm, well-managed beaches with minimal serious hazards.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', note: 'Generally calm, well-monitored beaches with an established lifeguard season and flag system.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', note: 'Generally calm, well-monitored gazetted beaches with lifeguard coverage during the official swimming season.' },
  vietnam: { name: 'Vietnam', riskLevel: 'moderate', note: 'Rip currents and rough surf occur seasonally, especially during typhoon season, and lifeguard coverage varies a lot by beach — stick to well-known resort beaches with visible flag warnings.' },
  philippines: { name: 'Philippines', riskLevel: 'high', note: 'Strong currents and rough surf are common during typhoon season, and lifeguard/flag infrastructure is inconsistent outside major resort beaches — check conditions locally before swimming, especially away from resort areas.' },
  malaysia: { name: 'Malaysia', riskLevel: 'moderate', note: 'Monsoon season (roughly November-March on the east coast) brings genuinely rough seas and strong currents — jellyfish are also a seasonal concern at some beaches.' },
  china: { name: 'China', riskLevel: 'moderate', note: 'Jellyfish blooms occur seasonally at some beaches (notably around Qingdao and other northern coastal cities), and lifeguard coverage varies significantly by location — stick to designated, monitored swimming areas.' },
  india: { name: 'India', riskLevel: 'moderate', note: 'Monsoon season brings genuinely rough seas and strong rip currents at many beaches, and lifeguard coverage is inconsistent outside major resort areas — Goa and Kerala\'s beaches see real drowning incidents most years, so heed local warnings.' },
  maldives: { name: 'Maldives', riskLevel: 'moderate', note: 'Resort lagoons are generally calm and well-managed, but currents at channel entries (where the reef opens to open ocean) can be genuinely strong — stick to designated swimming areas and ask your resort about current conditions.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', note: 'Generally calm, well-monitored beaches, though typhoon season (roughly July-October) can bring rough surf — check local warnings during that period.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', note: "Monsoon season (varies by coast — roughly May-September on the west/south, October-January on the east) brings rougher seas and stronger currents — lifeguard coverage is limited outside major resort beaches." },
  cambodia: { name: 'Cambodia', riskLevel: 'moderate', note: 'Generally calm Gulf of Thailand waters at Sihanoukville and nearby islands, though monsoon season brings rougher conditions — lifeguard coverage is limited outside resort beaches.' },
  australia: { name: 'Australia', riskLevel: 'high', note: "Australia has some of the most hazard-aware beach culture in the world for real reasons — strong rip currents cause more deaths annually than sharks, crocodiles, and jellyfish combined, and northern waters (roughly November-May \"stinger season\") carry genuine box jellyfish risk. Always swim between the red-and-yellow flags at patrolled beaches, no exceptions." },
  'new-zealand': { name: 'New Zealand', riskLevel: 'moderate', note: 'Rip currents are a genuine, well-documented hazard at many beaches, particularly on the west coast — always swim at patrolled beaches between the flags where available.' },
  fiji: { name: 'Fiji', riskLevel: 'high', note: 'Resort lagoons are generally calm, but currents at reef passages and channel entries can be genuinely strong, and lifeguard coverage is limited outside major resorts — ask your resort about local conditions before swimming beyond the shallows.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'high', note: 'Resort lagoons are generally calm, but currents at reef passages and channel entries can be genuinely strong, and lifeguard coverage is limited outside major resorts — ask your resort about local conditions before swimming beyond the shallows.' },
  mexico: { name: 'Mexico', riskLevel: 'high', note: "Pacific coast beaches (Puerto Vallarta, Zihuatanejo, and others) have genuinely strong rip currents and are a well-documented cause of tourist drownings most years — the Caribbean/Riviera Maya side is generally calmer. Always heed flag warnings and ask locally about conditions." },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'moderate', note: 'Resort beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions and stronger currents.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'moderate', note: 'Generally calm on the Caribbean side; the Atlantic/north coast has notably stronger surf and currents, especially in winter — check conditions by specific beach.' },
  bahamas: { name: 'Bahamas', riskLevel: 'moderate', note: 'Resort beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions.' },
  jamaica: { name: 'Jamaica', riskLevel: 'moderate', note: 'Resort beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions and stronger currents.' },
  aruba: { name: 'Aruba', riskLevel: 'moderate', note: "Generally calmer than much of the Caribbean thanks to being outside the main hurricane belt, though the windward (east) coast has genuinely strong currents and isn't recommended for casual swimming." },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'moderate', note: 'Resort beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'moderate', note: 'Resort beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'high', note: "Costa Rica's Pacific coast has genuinely powerful rip currents and is one of the more dangerous destinations in the region for drowning — lifeguard coverage is limited outside a few main beaches. Ask locally about conditions and never swim alone at an unfamiliar beach." },
  panama: { name: 'Panama', riskLevel: 'moderate', note: 'The Pacific coast has stronger currents than the calmer Caribbean side — lifeguard coverage is limited outside major resort beaches.' },
  belize: { name: 'Belize', riskLevel: 'moderate', note: "Belize's barrier reef creates generally calm lagoon waters close to shore, though currents at reef cuts can be genuinely strong — hurricane season (June-November) also brings rougher conditions." },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'moderate', note: "Seven Mile Beach and other main beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions." },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'moderate', note: 'Resort beaches are generally calm and well-monitored, though hurricane season (June-November) can bring rougher conditions.' },
  curacao: { name: 'Curaçao', riskLevel: 'moderate', note: "Generally calmer than much of the Caribbean thanks to being outside the main hurricane belt, though currents can pick up at specific dive/snorkel sites — ask locally about conditions." },
  canada: { name: 'Canada', riskLevel: 'moderate', note: "Canada's Pacific and Atlantic coasts have real rip currents at some beaches, and cold water is a serious factor even in summer — swim at patrolled beaches where available." },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'moderate', note: 'Generally calm Gulf waters at Dubai and Abu Dhabi\'s well-managed public beaches, though rip currents and jellyfish occur occasionally — stick to patrolled beaches with lifeguard coverage.' },
  morocco: { name: 'Morocco', riskLevel: 'moderate', note: "Morocco's Atlantic coast (Agadir, Essaouira, Casablanca) has genuinely strong rip currents and swells — a well-known surf destination for a reason. Always heed flag warnings at patrolled beaches." },
  'south-africa': { name: 'South Africa', riskLevel: 'high', note: "South Africa has real rip currents at many beaches, and Cape Town's False Bay area is known for great white shark presence — though the well-established Shark Spotters program actively monitors and warns swimmers at key beaches. Always swim at flagged, lifeguarded beaches." },
  qatar: { name: 'Qatar', riskLevel: 'moderate', note: 'Generally calm Gulf waters at Doha\'s well-managed public beaches, though jellyfish occur occasionally — stick to patrolled beaches with lifeguard coverage.' },
  israel: { name: 'Israel', riskLevel: 'moderate', note: 'Generally calm Mediterranean waters at Tel Aviv and other well-monitored beaches, though jellyfish blooms occur seasonally in summer — check local flag warnings.' },
  tanzania: { name: 'Tanzania', riskLevel: 'moderate', note: "Zanzibar and the Swahili coast have generally calm lagoon waters inside the reef, though currents at channel entries can be genuinely strong — ask locally about conditions before swimming beyond the shallows." },
  kenya: { name: 'Kenya', riskLevel: 'moderate', note: "Mombasa and the coast have generally calm lagoon waters inside the reef, though currents at channel entries can be genuinely strong — ask locally about conditions before swimming beyond the shallows." },
  argentina: { name: 'Argentina', riskLevel: 'moderate', note: "Argentina's Atlantic beaches (Mar del Plata and others) have real rip currents — swim at patrolled beaches with lifeguard coverage during the official summer season." },
  peru: { name: 'Peru', riskLevel: 'moderate', note: "Peru's Pacific coast has real rip currents and cold water (thanks to the Humboldt Current) — popular with surfers for the same swells that make casual swimming riskier at unpatrolled beaches." },
  chile: { name: 'Chile', riskLevel: 'moderate', note: "Chile's Pacific coast has real rip currents and notably cold water year-round (thanks to the Humboldt Current) — swim at patrolled beaches where available." },
  colombia: { name: 'Colombia', riskLevel: 'moderate', note: "Colombia's Pacific and Caribbean coasts both see genuine rip currents, and lifeguard coverage varies significantly by beach — Cartagena's main beaches are generally calmer and better monitored than more remote spots." },
  brazil: { name: 'Brazil', riskLevel: 'high', note: "Rio de Janeiro's famous beaches have real rip currents (locally called \"buracos\" or holes) that cause drownings most years, and Recife specifically has a well-documented, unusually high shark-incident rate due to local geography — always swim at flagged, lifeguarded beaches (Rio's lifeguards, or \"salva-vidas,\" are excellent) and check for any shark-related beach closures." },
  'united-states': { name: 'United States', riskLevel: 'moderate', note: "Rip currents are the leading cause of beach rescues and drownings nationwide, and specific regions (Florida, parts of the Carolinas) have higher shark-encounter rates — always swim near a lifeguard and heed flag warnings, which are used consistently at most major public beaches." },
};

const RISK_LABELS = {
  low: 'Low Risk — Generally Calm',
  moderate: 'Moderate — Real Seasonal Hazards',
  high: 'High — Serious, Well-Documented Hazards',
};

const DISCLAIMER = "This is general orientation, not real-time data — conditions vary enormously by specific beach, season, tide, and even time of day. Always check local flag warnings and lifeguard advice on the day, and never swim beyond your ability or alone at an unfamiliar beach.";

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
// @route POST /api/tools/beach-safety-checker/calculate
// @access Public
exports.calculateBeachSafety = (req, res) => {
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
// @route POST /api/tools/beach-safety-checker/pdf
// @access Public
exports.generateBeachSafetyPdf = async (req, res) => {
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
      [email, firstName || null, 'beach-safety-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Beach & Ocean Safety Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="beach-safety-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.riskLabel);

    pdfService.heading(doc, 'Universal beach safety habits');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If caught in a rip current, don\'t swim against it — swim parallel to shore until you\'re free of it, then swim back in at an angle.',
      'Flag systems (usually red for closed/dangerous, yellow for caution, green for calm) are used in most beach destinations — learn the local system on arrival.',
      'Swim near a lifeguard where one is present, and never swim alone at an unfamiliar beach, especially at dawn, dusk, or after storms.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🌊 Your ${result.countryName} beach & ocean safety guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the beach & ocean safety check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond beach safety? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send beach-safety-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateBeachSafetyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
