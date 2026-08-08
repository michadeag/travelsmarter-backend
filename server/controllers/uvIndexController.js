const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Typical UV index level per country. level: 'extreme' | 'very-high' |
// 'high' | 'moderate', roughly following WHO UV Index categories and
// well-known regional patterns (latitude, altitude, ozone thinning over
// the Southern Hemisphere). Actual daily UV varies by season and weather
// — this is a general baseline, not a real-time reading.
const COUNTRIES = {
  australia: { name: 'Australia', level: 'extreme', note: 'Among the highest UV levels in the world, due to a thinner ozone layer over the Southern Hemisphere — Australia has one of the highest skin cancer rates globally as a direct result.' },
  'new-zealand': { name: 'New Zealand', level: 'extreme', note: 'Shares the same Southern Hemisphere ozone thinning as Australia — UV can be 40% more intense than at equivalent latitudes in the Northern Hemisphere.' },
  peru: { name: 'Peru', level: 'extreme', note: 'High-altitude Andean areas (Cusco, Machu Picchu) get significantly more intense UV than sea-level destinations at the same latitude — altitude increases UV exposure roughly 10% per 1,000m.' },
  chile: { name: 'Chile', level: 'extreme', note: 'Northern desert regions (Atacama) combine high altitude, clear skies, and low latitude for some of the most intense UV readings on Earth.' },
  bolivia: { name: 'Bolivia', level: 'extreme', note: "La Paz's extreme altitude means UV exposure well above sea-level equivalents even at similar latitudes." },

  thailand: { name: 'Thailand', level: 'very-high', note: 'Consistently high UV year-round given its tropical latitude — sun protection matters every day, not just in "summer".' },
  vietnam: { name: 'Vietnam', level: 'very-high', note: 'Consistently high UV year-round given its tropical latitude.' },
  philippines: { name: 'Philippines', level: 'very-high', note: 'Consistently high UV year-round given its tropical latitude.' },
  indonesia: { name: 'Indonesia', level: 'very-high', note: 'Consistently high UV year-round given its equatorial location.' },
  malaysia: { name: 'Malaysia', level: 'very-high', note: 'Consistently high UV year-round given its equatorial location.' },
  singapore: { name: 'Singapore', level: 'very-high', note: 'Consistently high UV year-round given its equatorial location.' },
  india: { name: 'India', level: 'very-high', note: 'UV is intense across most of the country for much of the year, especially in central and southern regions.' },
  kenya: { name: 'Kenya', level: 'very-high', note: 'Equatorial location and often high-altitude terrain combine for intense UV exposure.' },
  tanzania: { name: 'Tanzania', level: 'very-high', note: 'Equatorial location, plus significant altitude on safari routes and Kilimanjaro, intensifies UV exposure.' },
  'south-africa': { name: 'South Africa', level: 'very-high', note: 'Southern Hemisphere ozone thinning affects South Africa too, though less extremely than Australia/New Zealand.' },
  morocco: { name: 'Morocco', level: 'very-high', note: 'Desert regions and high sun angle produce intense UV, especially outside the coastal north.' },
  egypt: { name: 'Egypt', level: 'very-high', note: 'Desert climate and consistently clear skies mean intense UV nearly year-round.' },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 'very-high', note: 'Desert climate and consistently clear skies mean intense UV nearly year-round.' },
  'saudi-arabia': { name: 'Saudi Arabia', level: 'very-high', note: 'Desert climate and consistently clear skies mean intense UV nearly year-round.' },
  mexico: { name: 'Mexico', level: 'very-high', note: 'Low latitude and often high altitude (Mexico City, colonial highlands) combine for intense UV.' },
  brazil: { name: 'Brazil', level: 'very-high', note: 'Tropical and equatorial regions see consistently intense UV year-round.' },
  colombia: { name: 'Colombia', level: 'very-high', note: 'Equatorial location and significant Andean altitude in cities like Bogotá both intensify UV exposure.' },
  'costa-rica': { name: 'Costa Rica', level: 'very-high', note: 'Consistently high UV year-round given its tropical latitude.' },
  argentina: { name: 'Argentina', level: 'very-high', note: "Northern regions see very high UV, and southern Patagonia is affected by the same ozone thinning that makes Australia/NZ so extreme." },
  turkey: { name: 'Turkey', level: 'very-high', note: 'Mediterranean summer sun is intense, especially along the coast.' },
  greece: { name: 'Greece', level: 'very-high', note: 'Mediterranean summer sun is intense, especially on the islands with reflective water and light-colored buildings.' },
  spain: { name: 'Spain', level: 'very-high', note: 'Mediterranean and southern regions see very intense summer UV.' },
  italy: { name: 'Italy', level: 'very-high', note: 'Mediterranean summer sun is intense, especially in the south and on the islands.' },
  israel: { name: 'Israel', level: 'very-high', note: 'Desert-adjacent climate and clear skies produce intense UV for much of the year.' },
  jordan: { name: 'Jordan', level: 'very-high', note: 'Desert climate and consistently clear skies mean intense UV nearly year-round.' },

  'united-states': { name: 'United States', level: 'high', note: 'UV varies significantly by region and season — the southern and southwestern states, plus high-altitude areas, see notably higher levels than the north.' },
  france: { name: 'France', level: 'high', note: 'Southern France sees notably higher UV than the north, especially in summer.' },
  portugal: { name: 'Portugal', level: 'high', note: 'Consistently sunny climate produces high UV for much of the year.' },
  croatia: { name: 'Croatia', level: 'high', note: 'Adriatic coast summer sun is intense, amplified by reflection off the water.' },
  china: { name: 'China', level: 'high', note: 'Varies significantly by region and altitude — Tibet and western high-altitude areas see notably higher UV than eastern coastal cities.' },
  japan: { name: 'Japan', level: 'high', note: 'Summer UV is high across most of the country, moderating in winter.' },
  'south-korea': { name: 'South Korea', level: 'high', note: 'Summer UV is high, moderating in winter.' },
  canada: { name: 'Canada', level: 'high', note: 'Southern regions in summer see high UV, though this drops significantly moving north and in winter.' },
  austria: { name: 'Austria', level: 'high', note: 'Alpine altitude significantly increases UV exposure for skiing and hiking, even when temperatures feel cold — snow reflection adds further exposure.' },
  switzerland: { name: 'Switzerland', level: 'high', note: 'Alpine altitude significantly increases UV exposure for skiing and hiking — snow reflection can add up to 80% more UV exposure on top of the altitude effect.' },
  germany: { name: 'Germany', level: 'high', note: 'Summer UV is high; sun protection matters more than the moderate climate might suggest.' },

  'united-kingdom': { name: 'United Kingdom', level: 'moderate', note: "Generally lower UV than continental Europe, but summer midday sun still warrants protection — it's easy to underestimate given the cooler climate." },
  ireland: { name: 'Ireland', level: 'moderate', note: 'Generally lower UV given its northern latitude, though summer sun still warrants protection.' },
  netherlands: { name: 'Netherlands', level: 'moderate', note: 'Generally moderate UV, higher in summer months.' },
  norway: { name: 'Norway', level: 'moderate', note: 'Lower UV overall given its northern latitude, though summer days with a high sun angle and long daylight hours still add up to meaningful exposure.' },
  sweden: { name: 'Sweden', level: 'moderate', note: 'Lower UV overall given its northern latitude, though summer days still warrant protection.' },
  denmark: { name: 'Denmark', level: 'moderate', note: 'Generally moderate UV, higher in summer months.' },
  iceland: { name: 'Iceland', level: 'moderate', note: 'Lower UV overall, but glacier and snow reflection can meaningfully increase exposure during outdoor activities even when air temperature is cold.' },
  poland: { name: 'Poland', level: 'moderate', note: 'Generally moderate UV, higher in summer months.' },
  'czech-republic': { name: 'Czech Republic', level: 'moderate', note: 'Generally moderate UV, higher in summer months.' },
};

const LEVEL_LABELS = {
  extreme: 'extreme — sunburn can happen in under 15 minutes at midday, SPF 50+ and shade are essential',
  'very-high': 'very high — sunburn can happen in under 30 minutes at midday, daily SPF 30-50 is strongly recommended',
  high: 'high — daily sun protection matters, especially midday and in summer',
  moderate: 'moderate — sun protection is still worthwhile, especially in summer or at altitude',
};

const SPF_RECOMMENDATIONS = {
  extreme: 'SPF 50+, reapplied every 2 hours, plus a hat, sunglasses, and shade during 10am-4pm.',
  'very-high': 'SPF 30-50, reapplied every 2 hours, plus a hat and sunglasses during peak midday hours.',
  high: 'SPF 30, reapplied every 2-3 hours during outdoor activity, especially midday.',
  moderate: 'SPF 15-30 on sunny days, especially for extended outdoor time.',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name} has ${LEVEL_LABELS[data.level]}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel: LEVEL_LABELS[data.level],
    spfRecommendation: SPF_RECOMMENDATIONS[data.level], note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/uv-index-checker/calculate
// @access Public
exports.calculateUvIndex = (req, res) => {
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
// @route POST /api/tools/uv-index-checker/pdf
// @access Public
exports.generateUvIndexPdf = async (req, res) => {
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
      [email, firstName || null, 'uv-index-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Sun Safety Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="uv-index-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Recommended: ${result.spfRecommendation}`);

    pdfService.heading(doc, 'Before you pack');
    pdfService.bulletList(doc, [
      'Sunburn can happen even on overcast days — up to 80% of UV rays pass through cloud cover, so "it doesn\'t feel that sunny" isn\'t a reliable guide.',
      'Reapply sunscreen after swimming or heavy sweating, regardless of "water-resistant" labeling — most formulas lose significant effectiveness within 40-80 minutes in water.',
      'Altitude and snow/water reflection both meaningfully increase UV exposure — factor this in for hiking, skiing, or beach days even in cooler climates.',
      'Check your destination\'s actual UV index forecast closer to your trip — this guide reflects general seasonal/regional patterns, not a real-time reading.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `☀️ Your ${result.countryName} sun safety guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your UV/sun safety check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond sun safety? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send uv-index-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateUvIndexPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
