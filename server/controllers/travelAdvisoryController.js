const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// General safety orientation per country, using the same 1-4 "Level" style
// as government travel-advisory frameworks (widely recognized terminology,
// not reproduced text) — level: 1 'Exercise Normal Precautions' | 2
// 'Exercise Increased Caution' | 3 'Reconsider Travel' | 4 'Do Not Travel'.
// This is deliberately a STRUCTURAL/general snapshot (crime patterns,
// standing risk factors), not real-time — every result, PDF, and email
// carries an explicit disclaimer pointing to the traveler's own
// government's official current advisory, since real conditions
// (conflict, unrest, natural disasters) can change quickly and this data
// is not live. Country list matches the shared 64-country roster used
// across the other tools (see SAFE_DESTINATIONS in tripBriefRegistry.js).
const COUNTRIES = {
  france: { name: 'France', level: 1, reason: 'A stable, well-policed destination — standard advice is petty theft awareness in tourist areas and on public transit.' },
  austria: { name: 'Austria', level: 1, reason: 'Among the safest destinations in Europe, with very low violent crime.' },
  'czech-republic': { name: 'Czech Republic', level: 1, reason: 'Generally very safe — the main risk is pickpocketing in busy tourist areas of Prague.' },
  denmark: { name: 'Denmark', level: 1, reason: 'Consistently ranks among the safest countries in the world.' },
  germany: { name: 'Germany', level: 1, reason: 'A stable, low-crime destination — standard advice is awareness of pickpocketing at major train stations and events.' },
  greece: { name: 'Greece', level: 1, reason: 'Generally safe for tourists — occasional protests/strikes in Athens are the main thing to plan around.' },
  hungary: { name: 'Hungary', level: 1, reason: 'A safe destination with low violent crime — standard pickpocket awareness in Budapest tourist areas applies.' },
  iceland: { name: 'Iceland', level: 1, reason: 'One of the safest countries in the world — natural hazards (weather, terrain) are a bigger consideration than crime.' },
  italy: { name: 'Italy', level: 1, reason: 'Generally safe — organized pickpocketing and bag-snatching in tourist hotspots (Rome, Florence, train stations) is the main risk.' },
  netherlands: { name: 'Netherlands', level: 1, reason: 'A stable, low-crime destination — standard bike-theft and pickpocket awareness applies in Amsterdam.' },
  portugal: { name: 'Portugal', level: 1, reason: 'One of the safer destinations in Europe, with low violent crime.' },
  spain: { name: 'Spain', level: 1, reason: 'Generally safe — pickpocketing in Barcelona and Madrid tourist areas is the most common issue reported.' },
  sweden: { name: 'Sweden', level: 1, reason: 'A stable, low-crime destination overall, with isolated exceptions in specific city neighborhoods.' },
  switzerland: { name: 'Switzerland', level: 1, reason: 'Consistently ranks among the safest countries in the world.' },
  ireland: { name: 'Ireland', level: 1, reason: 'A safe destination with low violent crime — standard pickpocket awareness in Dublin applies.' },
  'united-kingdom': { name: 'United Kingdom', level: 1, reason: 'Generally safe — standard pickpocket and bag-snatching awareness in central London applies.' },
  turkey: { name: 'Turkey', level: 2, reason: 'Tourist areas (Istanbul, the coast) are generally safe, but border regions near Syria carry a real terrorism risk — avoid them.' },
  japan: { name: 'Japan', level: 1, reason: 'One of the safest countries in the world for travelers, with very low crime.' },
  thailand: { name: 'Thailand', level: 1, reason: 'Generally safe for tourists — the deep south near Malaysia has a standing insurgency risk best avoided.' },
  indonesia: { name: 'Indonesia', level: 2, reason: 'Bali and main tourist areas are generally safe; some regions carry terrorism or natural-disaster risk — check conditions by island.' },
  singapore: { name: 'Singapore', level: 1, reason: 'One of the safest and most orderly cities in the world.' },
  'south-korea': { name: 'South Korea', level: 1, reason: 'A very safe destination with low crime, even late at night in major cities.' },
  'hong-kong': { name: 'Hong Kong', level: 1, reason: 'Generally very safe with low crime — occasional large-scale protests have occurred, worth checking current conditions.' },
  vietnam: { name: 'Vietnam', level: 2, reason: 'Generally safe for tourists — petty theft (bag-snatching from motorbikes) and traffic are the main practical risks.' },
  philippines: { name: 'Philippines', level: 2, reason: 'Main tourist areas are generally fine; parts of Mindanao carry a standing terrorism/kidnapping risk best avoided.' },
  malaysia: { name: 'Malaysia', level: 1, reason: 'Generally safe for tourists — standard petty-crime awareness applies in Kuala Lumpur.' },
  china: { name: 'China', level: 3, reason: 'Arbitrary enforcement of local laws, including exit bans that can prevent foreign travelers from leaving the country, has been a documented, standing concern — check current guidance closely before you go.' },
  india: { name: 'India', level: 2, reason: 'Millions of tourists visit safely every year — standard precautions include crime awareness (especially for women traveling alone) and border-area risk near Pakistan/Kashmir.' },
  maldives: { name: 'Maldives', level: 1, reason: 'Resort-island tourism is very safe — isolated extremist incidents have occurred but are rare.' },
  taiwan: { name: 'Taiwan', level: 1, reason: 'A very safe destination with low crime.' },
  'sri-lanka': { name: 'Sri Lanka', level: 2, reason: 'Generally safe for tourists since the civil war ended, though the 2019 Easter bombings are a reminder to stay alert to official guidance.' },
  cambodia: { name: 'Cambodia', level: 2, reason: 'Generally safe for tourists — petty crime and scams targeting visitors are the most common issue, plus unexploded landmines in some rural areas away from tourist paths.' },
  australia: { name: 'Australia', level: 1, reason: 'A very safe destination — wildlife and natural hazards are a bigger practical concern than crime.' },
  'new-zealand': { name: 'New Zealand', level: 1, reason: 'Consistently ranks among the safest countries in the world.' },
  fiji: { name: 'Fiji', level: 1, reason: 'A safe destination for tourists, with low crime in resort and tourist areas.' },
  'french-polynesia': { name: 'French Polynesia', level: 1, reason: 'A very safe destination with low crime.' },
  mexico: { name: 'Mexico', level: 2, reason: "Safety varies enormously by state — well-touristed areas (Cancún, Mexico City's main districts, Los Cabos) see millions of safe visits yearly, while some northern/border states carry serious organized-crime risk. Check the specific region, not just the country." },
  'dominican-republic': { name: 'Dominican Republic', level: 2, reason: 'Resort areas are generally safe; standard petty-crime awareness applies outside tourist zones.' },
  'puerto-rico': { name: 'Puerto Rico', level: 2, reason: 'Generally safe for tourists in main areas — standard US-territory petty-crime awareness applies outside tourist zones.' },
  bahamas: { name: 'Bahamas', level: 2, reason: 'Resort and tourist areas are generally safe; petty and occasionally violent crime has been reported outside those areas.' },
  jamaica: { name: 'Jamaica', level: 2, reason: 'Resort areas (Montego Bay, Negril) are generally well-secured; crime rates outside tourist zones are notably higher, so stick to recommended areas.' },
  aruba: { name: 'Aruba', level: 1, reason: 'One of the safer Caribbean destinations, with low crime.' },
  'turks-and-caicos': { name: 'Turks and Caicos', level: 1, reason: 'A safe, low-crime destination popular for resort tourism.' },
  'st-lucia': { name: 'St. Lucia', level: 2, reason: 'Resort areas are generally safe; standard petty-crime awareness applies elsewhere.' },
  'costa-rica': { name: 'Costa Rica', level: 1, reason: 'One of the safer destinations in Central America — standard petty-crime (rental car break-ins) awareness applies.' },
  panama: { name: 'Panama', level: 1, reason: 'Generally safe for tourists in Panama City and main tourist areas; the Darién region near Colombia should be avoided.' },
  belize: { name: 'Belize', level: 2, reason: 'Tourist zones and cayes are generally safe; Belize City has higher crime rates outside the main tourist areas.' },
  'cayman-islands': { name: 'Cayman Islands', level: 1, reason: 'One of the safest destinations in the Caribbean, with very low crime.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', level: 1, reason: 'A safe, low-crime destination popular for resort tourism.' },
  curacao: { name: 'Curaçao', level: 1, reason: 'A safe, low-crime destination outside the Caribbean hurricane belt.' },
  canada: { name: 'Canada', level: 1, reason: 'One of the safest countries in the world for travelers.' },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 1, reason: 'Extremely low crime and strict law enforcement make this one of the safer destinations globally — note that local laws (including around alcohol, PDA, and drugs) are strictly enforced.' },
  morocco: { name: 'Morocco', level: 2, reason: 'Generally safe for tourists — standard scam and pickpocket awareness applies in medinas; occasional terrorism risk exists as in much of the region.' },
  'south-africa': { name: 'South Africa', level: 2, reason: 'Major tourist areas and safaris are visited safely by millions each year, but South Africa has a notably high crime rate outside those areas — stick to recommended zones, especially after dark.' },
  qatar: { name: 'Qatar', level: 1, reason: 'Extremely low crime and strict law enforcement make this one of the safer destinations globally.' },
  israel: { name: 'Israel', level: 3, reason: "The security situation, including in border and conflict-adjacent areas, remains fluid and can change with very little notice — check your government's official advisory immediately before booking or traveling, not just before you fly." },
  tanzania: { name: 'Tanzania', level: 2, reason: 'Safari and main tourist areas are generally safe; standard petty-crime awareness applies in cities, and some border areas carry elevated risk.' },
  kenya: { name: 'Kenya', level: 2, reason: 'Major safari and coastal tourist areas are visited safely by millions, though some border regions near Somalia carry a standing terrorism risk best avoided.' },
  argentina: { name: 'Argentina', level: 1, reason: 'Generally safe for tourists — standard petty-crime awareness applies in Buenos Aires, plus occasional large protests worth planning around.' },
  peru: { name: 'Peru', level: 2, reason: 'Main tourist routes (Lima, Cusco, Machu Picchu) are visited safely by millions yearly; standard petty-crime and occasional protest-related road-closure awareness applies.' },
  chile: { name: 'Chile', level: 1, reason: 'One of the safer destinations in South America, with low violent crime.' },
  colombia: { name: 'Colombia', level: 2, reason: "Tourist areas (Cartagena, Medellín, Bogotá's main districts) have improved dramatically and are visited safely by millions yearly — some rural and border regions still carry a real risk and are best avoided." },
  brazil: { name: 'Brazil', level: 2, reason: 'Major tourist areas are visited safely by millions each year, but petty and occasionally violent crime is a real, well-documented risk in specific city neighborhoods — stick to recommended areas, especially at night.' },
  'united-states': { name: 'United States', level: 1, reason: 'A safe destination overall for international standards, with wide regional variation — as with any large country, big-city crime patterns vary considerably by neighborhood.' },
};

const LEVEL_LABELS = {
  1: 'Exercise Normal Precautions',
  2: 'Exercise Increased Caution',
  3: 'Reconsider Travel',
  4: 'Do Not Travel',
};

const DISCLAIMER = "This is general orientation based on standing/structural risk factors, not real-time data — conditions (conflict, unrest, natural disasters) can change quickly. Always check your own government's official current travel advisory (e.g. travel.state.gov for US citizens) before you book and again shortly before you fly.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const levelLabel = LEVEL_LABELS[data.level];
  const headline = `${data.name}: Level ${data.level} — ${levelLabel}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel,
    reason: data.reason, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/travel-advisory-checker/calculate
// @access Public
exports.calculateTravelAdvisory = (req, res) => {
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
// @route POST /api/tools/travel-advisory-checker/pdf
// @access Public
exports.generateTravelAdvisoryPdf = async (req, res) => {
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
      [email, firstName || null, 'travel-advisory-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Travel Advisory`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="travel-advisory-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.reason);
    pdfService.highlightBox(doc, `Level ${result.level} of 4 — ${result.levelLabel}`);

    pdfService.heading(doc, 'Before you book or fly');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Enroll in your government\'s traveler registration program if one exists (e.g. the US State Department\'s STEP) so they can reach you in a crisis.',
      'Save your embassy or consulate\'s emergency contact number before you travel, not after you need it.',
      'Advisory levels are national averages — safety can vary a lot by specific city or region within a country, so check local guidance for your exact itinerary too.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛡️ Your ${result.countryName} travel advisory`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the safety orientation for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond safety prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send travel-advisory-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateTravelAdvisoryPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
