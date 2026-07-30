const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// General wheelchair/mobility-accessibility orientation per country.
// level: 'excellent' (strong accessibility legislation + consistent modern
// infrastructure investment) | 'good' (solid in modern areas, real gaps in
// historic centers) | 'moderate' (accessible pockets — resorts, newer
// developments — alongside significant general infrastructure gaps) |
// 'limited' (accessible infrastructure is the exception, not the norm).
// This is general, structural orientation based on national infrastructure
// investment patterns — not a guarantee for any specific hotel, venue, or
// transit route, and accessibility needs vary a lot by disability type.
// Country list matches the shared 64-country roster used across the other
// tools.
const COUNTRIES = {
  france: { name: 'France', level: 'good', note: "Strong accessibility law (since 2005) and modern infrastructure, but Paris's historic metro system remains largely inaccessible — buses and the newer tram lines are a more reliable bet in the capital." },
  austria: { name: 'Austria', level: 'excellent', note: 'Consistently strong accessibility standards across public transit, hotels, and major attractions.' },
  'czech-republic': { name: 'Czech Republic', level: 'good', note: "Modern facilities are generally accessible, but Prague's historic cobblestone streets and older buildings present real challenges." },
  denmark: { name: 'Denmark', level: 'excellent', note: 'One of the most consistently accessible countries in the world, with strong infrastructure investment nationwide.' },
  germany: { name: 'Germany', level: 'excellent', note: 'Strong accessibility legislation and consistent infrastructure investment, including widely accessible public transit.' },
  greece: { name: 'Greece', level: 'moderate', note: 'Major museums and modern hotels are generally accessible, but ancient sites, island terrain, and older city centers present real, often unavoidable challenges.' },
  hungary: { name: 'Hungary', level: 'good', note: "Budapest's newer infrastructure and major attractions are generally accessible, with real gaps in older buildings and some public transit." },
  iceland: { name: 'Iceland', level: 'excellent', note: 'Strong accessibility standards, though remote natural attractions can present terrain challenges regardless of infrastructure.' },
  italy: { name: 'Italy', level: 'good', note: 'Modern hotels and major museums are generally accessible, but historic centers (Rome, Florence, Venice) have real cobblestone, stair, and narrow-doorway challenges that infrastructure investment can only partly solve.' },
  netherlands: { name: 'Netherlands', level: 'excellent', note: 'Consistently strong accessibility standards, including widely accessible public transit and modern infrastructure.' },
  portugal: { name: 'Portugal', level: 'good', note: 'Major cities and modern hotels are generally accessible, with real gaps in historic centers and older public transit.' },
  spain: { name: 'Spain', level: 'good', note: 'Strong accessibility legislation and generally accessible major cities, with real gaps in historic old towns.' },
  sweden: { name: 'Sweden', level: 'excellent', note: 'One of the most consistently accessible countries in the world, with strong infrastructure investment nationwide.' },
  switzerland: { name: 'Switzerland', level: 'excellent', note: 'Strong accessibility standards, including widely accessible trains — one of the more reliable countries for accessible rail travel.' },
  ireland: { name: 'Ireland', level: 'good', note: 'Major cities and modern facilities are generally accessible, with more limited infrastructure in rural areas.' },
  'united-kingdom': { name: 'United Kingdom', level: 'excellent', note: 'Strong accessibility legislation and generally accessible major cities, though some older Underground stations in London still lack step-free access — check specific stations in advance.' },
  turkey: { name: 'Turkey', level: 'moderate', note: 'Modern hotels and Istanbul\'s newer transit lines are generally accessible, alongside real gaps in older infrastructure and historic sites.' },
  japan: { name: 'Japan', level: 'excellent', note: 'Major infrastructure investment (accelerated by the 2020 Olympics) has made most train stations, hotels, and attractions in large cities genuinely accessible.' },
  thailand: { name: 'Thailand', level: 'moderate', note: "Bangkok's newer BTS/MRT transit and international hotels are generally accessible, with significant gaps elsewhere, including uneven sidewalks common even in tourist areas." },
  indonesia: { name: 'Indonesia', level: 'limited', note: 'Accessible infrastructure is the exception rather than the norm — international resort hotels in Bali are a more reliable bet than general city infrastructure.' },
  singapore: { name: 'Singapore', level: 'excellent', note: 'Consistently strong, well-maintained accessible infrastructure across public transit, attractions, and buildings.' },
  'south-korea': { name: 'South Korea', level: 'excellent', note: 'Strong, consistent infrastructure investment, including widely accessible subway systems in Seoul.' },
  'hong-kong': { name: 'Hong Kong', level: 'good', note: 'Generally accessible public transit and modern buildings, with real challenges from steep terrain and older buildings in some districts.' },
  vietnam: { name: 'Vietnam', level: 'limited', note: 'Accessible infrastructure is limited outside international hotels — uneven sidewalks and a lack of curb cuts are common even in major cities.' },
  philippines: { name: 'Philippines', level: 'moderate', note: 'International resorts and newer malls are generally accessible, alongside significant general infrastructure gaps.' },
  malaysia: { name: 'Malaysia', level: 'moderate', note: "Kuala Lumpur's newer transit and malls are generally accessible, with real gaps elsewhere." },
  china: { name: 'China', level: 'moderate', note: 'Major cities have made real infrastructure investments (especially newer subway systems), alongside significant gaps in older areas and rural regions.' },
  india: { name: 'India', level: 'moderate', note: 'Modern facilities and some newer metro systems are genuinely accessible, alongside a large gap versus general infrastructure and crowding that can be a real barrier regardless of physical accessibility.' },
  maldives: { name: 'Maldives', level: 'moderate', note: 'Individual resort islands are often purpose-built and genuinely accessible, but inter-island transfers by boat or seaplane can present real, sometimes unavoidable challenges.' },
  taiwan: { name: 'Taiwan', level: 'good', note: "Taipei's metro system and modern facilities are generally accessible, with more variation elsewhere on the island." },
  'sri-lanka': { name: 'Sri Lanka', level: 'limited', note: 'Accessible infrastructure is limited outside international hotels — uneven terrain and a lack of curb cuts are common.' },
  cambodia: { name: 'Cambodia', level: 'limited', note: "Accessible infrastructure is limited, and popular sites like Angkor Wat involve significant uneven terrain that's difficult to fully mitigate." },
  australia: { name: 'Australia', level: 'excellent', note: 'Strong accessibility legislation and consistent infrastructure investment across major cities.' },
  'new-zealand': { name: 'New Zealand', level: 'excellent', note: 'Strong accessibility standards in cities, though remote natural attractions can present terrain challenges regardless of infrastructure.' },
  fiji: { name: 'Fiji', level: 'limited', note: 'International resorts are often better equipped than general infrastructure, which remains limited outside tourist areas.' },
  'french-polynesia': { name: 'French Polynesia', level: 'limited', note: 'International resorts are often better equipped than general infrastructure, which is limited across the islands.' },
  mexico: { name: 'Mexico', level: 'moderate', note: 'Major resort areas (Cancún, Los Cabos) and modern hotels are generally accessible, with real gaps in general city infrastructure.' },
  'dominican-republic': { name: 'Dominican Republic', level: 'moderate', note: 'Resort areas are generally accessible, with real gaps outside them.' },
  'puerto-rico': { name: 'Puerto Rico', level: 'excellent', note: 'As US territory, ADA standards apply — generally strong accessibility in hotels and modern infrastructure, with some gaps in Old San Juan\'s historic, cobblestoned streets.' },
  bahamas: { name: 'Bahamas', level: 'moderate', note: 'Resort areas are generally accessible, with real gaps outside them.' },
  jamaica: { name: 'Jamaica', level: 'moderate', note: 'Resort areas are generally accessible, with real gaps in general infrastructure elsewhere.' },
  aruba: { name: 'Aruba', level: 'good', note: 'Generally strong accessibility in the tourist zone, with several beaches offering accessible mats and equipment.' },
  'turks-and-caicos': { name: 'Turks and Caicos', level: 'limited', note: 'Resort-dependent — some properties are well-equipped, but general infrastructure outside them is limited.' },
  'st-lucia': { name: 'St. Lucia', level: 'limited', note: 'Hilly, volcanic terrain presents real physical challenges beyond what infrastructure investment alone can solve — check specific resort accessibility carefully.' },
  'costa-rica': { name: 'Costa Rica', level: 'good', note: 'A regional leader in accessible tourism, with several national parks now offering accessible trails and increasing hotel accessibility.' },
  panama: { name: 'Panama', level: 'moderate', note: 'Panama City\'s modern areas are generally accessible, with real gaps elsewhere.' },
  belize: { name: 'Belize', level: 'limited', note: 'Accessible infrastructure is limited outside a small number of purpose-built resorts.' },
  'cayman-islands': { name: 'Cayman Islands', level: 'good', note: 'Generally strong accessibility for a Caribbean destination, including several accessible beach access points.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', level: 'limited', note: 'Resort-dependent — some properties are well-equipped, but general infrastructure outside them is limited.' },
  curacao: { name: 'Curaçao', level: 'good', note: 'Generally strong accessibility for a Caribbean destination, with several accessible beaches and modern hotels.' },
  canada: { name: 'Canada', level: 'excellent', note: 'Strong accessibility legislation and consistent infrastructure investment across major cities.' },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 'good', note: 'Dubai in particular has invested heavily in accessible modern infrastructure, malls, and metro — one of the more accessible destinations in the region.' },
  morocco: { name: 'Morocco', level: 'moderate', note: 'Modern hotels are generally accessible, but medina old towns have narrow, uneven, stepped streets that are a real, largely unavoidable barrier.' },
  'south-africa': { name: 'South Africa', level: 'moderate', note: 'Modern hotels, malls, and several safari lodges are genuinely accessible, alongside real infrastructure gaps in general city environments.' },
  qatar: { name: 'Qatar', level: 'good', note: 'Doha has invested heavily in modern accessible infrastructure, especially since hosting the 2022 World Cup.' },
  israel: { name: 'Israel', level: 'good', note: 'Generally strong accessibility legislation and infrastructure in modern areas, with real gaps in some historic sites (Old City Jerusalem\'s ancient stone streets, for instance).' },
  tanzania: { name: 'Tanzania', level: 'moderate', note: 'Several safari lodges are genuinely well-equipped for accessibility, alongside significant general infrastructure gaps elsewhere.' },
  kenya: { name: 'Kenya', level: 'moderate', note: 'Several safari lodges are genuinely well-equipped for accessibility, alongside significant general infrastructure gaps elsewhere.' },
  argentina: { name: 'Argentina', level: 'moderate', note: "Buenos Aires's modern areas are generally accessible, with real gaps in older infrastructure and uneven sidewalks common even downtown." },
  peru: { name: 'Peru', level: 'moderate', note: 'Modern Lima hotels are generally accessible, but Machu Picchu and much of the Andean terrain involve real physical challenges that infrastructure investment alone can\'t solve.' },
  chile: { name: 'Chile', level: 'good', note: "Santiago's modern infrastructure and public transit are generally accessible, among the stronger options in South America." },
  colombia: { name: 'Colombia', level: 'moderate', note: "Modern areas of Bogotá and Medellín are generally accessible, with real gaps in older infrastructure and hilly terrain in parts of Medellín." },
  brazil: { name: 'Brazil', level: 'moderate', note: 'Modern hotels and some newer transit are generally accessible, alongside real infrastructure gaps, particularly outside major tourist areas.' },
  'united-states': { name: 'United States', level: 'excellent', note: 'The Americans with Disabilities Act (ADA) mandates accessibility standards nationwide — generally strong, though enforcement and building age still create real variation by specific location.' },
};

const LEVEL_LABELS = {
  excellent: 'Excellent Accessibility',
  good: 'Good Accessibility',
  moderate: 'Moderate Accessibility',
  limited: 'Limited Accessibility',
};

const DISCLAIMER = "This is general, national-level orientation based on infrastructure investment patterns — not a guarantee for any specific hotel, venue, or transit route, and accessibility needs vary a lot by disability type. Always verify accessibility directly with specific hotels, attractions, and transit providers for your exact itinerary before you book.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const levelLabel = LEVEL_LABELS[data.level];
  const headline = `${data.name}: ${levelLabel}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/accessible-travel-checker/calculate
// @access Public
exports.calculateAccessibleTravel = (req, res) => {
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
// @route POST /api/tools/accessible-travel-checker/pdf
// @access Public
exports.generateAccessibleTravelPdf = async (req, res) => {
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
      [email, firstName || null, 'accessible-travel-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Accessible Travel Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="accessible-travel-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.levelLabel);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Call or email specific hotels and attractions directly to confirm accessibility for your exact needs — "accessible" can mean very different things depending on the property.',
      'Airlines and airports generally offer wheelchair assistance if requested in advance — book this when you book your flight, not at the airport.',
      'Look into accessible-travel specialist tour operators for your destination — they often know workarounds and specific venues that general guides miss.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `♿ Your ${result.countryName} accessible travel guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the accessibility orientation for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond accessibility prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send accessible-travel-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateAccessibleTravelPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
