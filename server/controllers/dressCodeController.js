const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Local dress code + etiquette norms per country.
// dressCode: 'strict' (modest dress expected broadly in public, not just
// religious sites) | 'moderate' (modest dress expected at religious/
// conservative sites, relaxed elsewhere) | 'relaxed' (few specific dress
// expectations beyond common sense/beachwear-at-the-beach).
const COUNTRIES = {
  'saudi-arabia': { name: 'Saudi Arabia', dressCode: 'strict', dressNote: 'Modest dress is expected broadly in public, not just at religious sites — loose, non-revealing clothing covering shoulders and knees is the norm for everyone.', etiquetteNote: 'Public displays of affection are frowned upon. Use your right hand for eating and greeting. Friday is the main day of rest.' },
  'united-arab-emirates': { name: 'United Arab Emirates', dressCode: 'strict', dressNote: 'Modest dress is expected in public spaces, malls, and government buildings, though beach/pool areas and international hotels are more relaxed.', etiquetteNote: 'Public displays of affection are discouraged. Use your right hand for eating and greeting. Ramadan brings daytime eating/drinking restrictions in public.' },
  egypt: { name: 'Egypt', dressCode: 'strict', dressNote: 'Modest dress is expected outside resort areas — shoulders and knees covered, especially for women, reduces unwanted attention and is respectful at religious/historic sites.', etiquetteNote: 'Use your right hand for eating and greeting. Bargaining is expected in markets. Avoid public displays of affection.' },
  morocco: { name: 'Morocco', dressCode: 'strict', dressNote: 'Modest dress is expected outside beach resorts and tourist hotels — covering shoulders and knees is respectful, especially away from major cities.', etiquetteNote: 'Use your right hand for eating and greeting. Bargaining is expected in markets (souks). Avoid public displays of affection.' },
  india: { name: 'India', dressCode: 'strict', dressNote: 'Modest dress is expected broadly, especially outside major cities and tourist areas — shoulders and knees covered is the safe default, with stricter expectations at temples.', etiquetteNote: 'Use your right hand for eating and greeting. Remove shoes before entering temples and many homes. A head nod/namaste greeting is common.' },

  thailand: { name: 'Thailand', dressCode: 'moderate', dressNote: 'Cover shoulders and knees at temples (long pants/skirts required, no sleeveless tops) — beachwear is fine at the beach but not appropriate elsewhere.', etiquetteNote: "Don't touch people's heads or point your feet at people or Buddha images — the head is considered sacred, the feet the lowest, dirtiest part of the body. Remove shoes when entering temples and many homes." },
  indonesia: { name: 'Indonesia', dressCode: 'moderate', dressNote: "Bali's temples require a sarong and sash (often provided or rentable on-site) covering the legs — beachwear is fine at the beach, but cover up elsewhere, especially in more conservative regions." },
  vietnam: { name: 'Vietnam', dressCode: 'moderate', dressNote: 'Cover shoulders and knees at pagodas and temples — otherwise dress is generally relaxed.', etiquetteNote: 'Remove shoes before entering homes and some temples. Use both hands when giving or receiving items, especially with elders.' },
  cambodia: { name: 'Cambodia', dressCode: 'moderate', dressNote: 'Cover shoulders and knees at Angkor Wat and other temples — enforcement is fairly strict at major sites, so pack accordingly.', etiquetteNote: "Don't touch people's heads. Remove shoes before entering temples and homes." },
  'sri-lanka': { name: 'Sri Lanka', dressCode: 'moderate', dressNote: 'Cover shoulders and knees at Buddhist and Hindu temples, and remove shoes and hats before entering — beachwear is fine at the beach.', etiquetteNote: "Don't turn your back on Buddha statues for photos — it's considered disrespectful and has led to fines/deportation for some tourists." },
  myanmar: { name: 'Myanmar', dressCode: 'moderate', dressNote: 'Cover shoulders and knees at pagodas and temples, and remove shoes and socks before entering — this is enforced at most major sites.', etiquetteNote: "Don't touch people's heads or point your feet at Buddha images." },
  nepal: { name: 'Nepal', dressCode: 'moderate', dressNote: 'Cover shoulders and knees at temples — otherwise dress is generally relaxed, especially in trekking areas.', etiquetteNote: 'Walk clockwise around Buddhist stupas and mani walls. Remove shoes before entering temples and homes.' },
  turkey: { name: 'Turkey', dressCode: 'moderate', dressNote: "Cover shoulders, arms, and legs at mosques, and women should bring a headscarf (often provided at entrances) — everyday dress in cities like Istanbul is otherwise fairly relaxed.", etiquetteNote: 'Remove shoes before entering mosques and many homes. Tea is a central part of hospitality and social interaction.' },
  jordan: { name: 'Jordan', dressCode: 'moderate', dressNote: 'Modest dress is appreciated broadly, and required at mosques (headscarf for women) — resort areas like Aqaba are more relaxed.', etiquetteNote: 'Use your right hand for eating and greeting. Hospitality is a strong cultural value — accepting offered tea/coffee is polite.' },
  israel: { name: 'Israel', dressCode: 'moderate', dressNote: 'Modest dress is required at religious sites like the Western Wall (separate sections by gender, head covering expected) — otherwise dress is generally relaxed.', etiquetteNote: 'Public transport and many businesses close for Shabbat (Friday evening to Saturday evening) in observant areas.' },
  italy: { name: 'Italy', dressCode: 'moderate', dressNote: 'Cover shoulders and knees when visiting churches, especially the Vatican and major basilicas — enforcement is common at popular sites. Otherwise dress is relaxed.', etiquetteNote: 'A confident greeting with direct eye contact is the norm. Meals are unhurried social occasions.' },
  spain: { name: 'Spain', dressCode: 'moderate', dressNote: 'Cover shoulders and knees when visiting cathedrals and churches — otherwise dress is relaxed, though beachwear should stay at the beach.', etiquetteNote: 'Meals and social plans often run later than in other countries — dinner before 8-9pm is uncommon outside tourist zones.' },
  greece: { name: 'Greece', dressCode: 'moderate', dressNote: 'Cover shoulders and knees when visiting monasteries (especially Meteora) and some churches — beach islands are otherwise relaxed.', etiquetteNote: 'Hospitality is a strong cultural value. A head nod upward can mean "no" — different from a headshake.' },
  'south-korea': { name: 'South Korea', dressCode: 'moderate', dressNote: 'Modest dress is appreciated at temples and traditional sites — everyday city dress is otherwise fashion-forward and relaxed.', etiquetteNote: 'Bow slightly as a greeting, use two hands when giving/receiving items or business cards, and remove shoes when entering homes.' },
  japan: { name: 'Japan', dressCode: 'moderate', dressNote: 'Modest, neat dress is generally appreciated, especially at temples and shrines — swimwear should stay at the beach or pool.', etiquetteNote: 'Remove shoes indoors and at many restaurants/temples. Tipping is not customary and can cause confusion. Keep phone calls quiet on trains.' },

  'united-states': { name: 'United States', dressCode: 'relaxed', etiquetteNote: 'Tipping (typically 15-20% at restaurants) is expected and considered part of service workers\' income. Casual dress is broadly acceptable almost everywhere.' },
  canada: { name: 'Canada', dressCode: 'relaxed', etiquetteNote: 'Tipping (typically 15-20% at restaurants) is expected, similar to the US. Politeness and queuing norms are taken seriously.' },
  'united-kingdom': { name: 'United Kingdom', dressCode: 'relaxed', etiquetteNote: 'Queuing (waiting in line) is taken seriously — cutting in line is a significant faux pas. Tipping is more modest than in the US (often 10-12.5%).' },
  ireland: { name: 'Ireland', dressCode: 'relaxed', etiquetteNote: 'Casual, friendly conversation with strangers (especially in pubs) is common and welcomed.' },
  france: { name: 'France', dressCode: 'relaxed', dressNote: 'Cover shoulders and knees when visiting churches — otherwise dress tends to be neat but relaxed.', etiquetteNote: 'Greeting shopkeepers with "bonjour" before starting a conversation is expected and appreciated.' },
  germany: { name: 'Germany', dressCode: 'relaxed', etiquetteNote: 'Punctuality is taken seriously for both social and business occasions. Recycling/sorting waste correctly is a strong social norm.' },
  netherlands: { name: 'Netherlands', dressCode: 'relaxed', etiquetteNote: 'Directness in conversation is normal and not considered rude. Cyclists have the right of way in many situations — watch bike lanes.' },
  austria: { name: 'Austria', dressCode: 'relaxed', etiquetteNote: 'Formality with titles (Herr/Frau + surname) is more common than in many neighboring countries, at least initially.' },
  switzerland: { name: 'Switzerland', dressCode: 'relaxed', etiquetteNote: 'Punctuality is taken very seriously. Quiet hours (often Sunday and late evenings) are respected, including noise from housework.' },
  portugal: { name: 'Portugal', dressCode: 'relaxed', dressNote: 'Cover shoulders and knees when visiting churches — otherwise dress is relaxed.' },
  poland: { name: 'Poland', dressCode: 'relaxed', etiquetteNote: 'Removing shoes when entering a home is common and expected as a guest.' },
  'czech-republic': { name: 'Czech Republic', dressCode: 'relaxed', etiquetteNote: 'Tipping around 10% is appreciated but not as strictly expected as in the US.' },
  norway: { name: 'Norway', dressCode: 'relaxed', etiquetteNote: 'Personal space and quiet, understated conversation are valued — small talk with strangers is less common than in some cultures.' },
  sweden: { name: 'Sweden', dressCode: 'relaxed', etiquetteNote: 'Personal space and quiet, understated conversation are valued — small talk with strangers is less common than in some cultures.' },
  denmark: { name: 'Denmark', dressCode: 'relaxed', etiquetteNote: 'Punctuality and a low-key, egalitarian social style are valued — avoid overt displays of status or wealth.' },
  iceland: { name: 'Iceland', dressCode: 'relaxed', etiquetteNote: 'Showering thoroughly before entering public pools/hot springs is a strict, non-negotiable local norm — signage enforces it.' },

  mexico: { name: 'Mexico', dressCode: 'relaxed', dressNote: 'Beachwear should stay at the beach — city and town dress is casual but not swimwear.', etiquetteNote: 'A warm, personal greeting (handshake or light hug) is common. Meals are social occasions, rarely rushed.' },
  brazil: { name: 'Brazil', dressCode: 'relaxed', dressNote: 'Beachwear is normal at the beach (and only there) — city dress is otherwise casual.', etiquetteNote: 'Physical greetings (hugs, cheek kisses) are common among friends. Personal space tends to be smaller than in many other cultures.' },
  argentina: { name: 'Argentina', dressCode: 'relaxed', etiquetteNote: 'A cheek kiss is a common greeting, even between new acquaintances. Dinner and social plans often start later in the evening.' },
  chile: { name: 'Chile', dressCode: 'relaxed', etiquetteNote: 'A cheek kiss is a common greeting between women and between men and women.' },
  colombia: { name: 'Colombia', dressCode: 'relaxed', etiquetteNote: 'Punctuality is more flexible in social settings than in business settings — plan accordingly.' },
  peru: { name: 'Peru', dressCode: 'relaxed', dressNote: 'Modest dress is appreciated at religious sites and in more traditional Andean towns.' },
  'costa-rica': { name: 'Costa Rica', dressCode: 'relaxed', etiquetteNote: '"Pura vida" (pure life) reflects a genuinely relaxed, unhurried social culture — punctuality expectations are looser than in many countries.' },

  australia: { name: 'Australia', dressCode: 'relaxed', etiquetteNote: 'Casual, friendly directness is the norm — first names are used quickly, even in semi-formal settings.' },
  'new-zealand': { name: 'New Zealand', dressCode: 'relaxed', etiquetteNote: 'A Māori greeting (hongi, pressing noses/foreheads) may be offered on formal occasions — reciprocate respectfully if invited.' },

  kenya: { name: 'Kenya', dressCode: 'moderate', dressNote: 'Modest dress is appreciated outside resort/safari lodge areas, especially in cities and rural communities.', etiquetteNote: 'Greetings are warm and unhurried — rushing a greeting can come across as rude. Use your right hand for eating and greeting.' },
  tanzania: { name: 'Tanzania', dressCode: 'moderate', dressNote: 'Modest dress is expected in Zanzibar\'s Stone Town and other Muslim-majority coastal areas — mainland safari areas are more relaxed.', etiquetteNote: 'Greetings are warm and unhurried. Use your right hand for eating and greeting.' },
  'south-africa': { name: 'South Africa', dressCode: 'relaxed', etiquetteNote: 'A firm handshake is the standard greeting. Casual dress is broadly acceptable outside upscale restaurants.' },
  nigeria: { name: 'Nigeria', dressCode: 'moderate', dressNote: 'Modest, neat dress is appreciated broadly, especially outside major cities.', etiquetteNote: 'Greetings are important and often unhurried — skipping a proper greeting before business is considered rude. Respect for elders is a strong cultural value.' },
};

const DRESS_LABELS = {
  strict: 'strict — modest dress is expected broadly in public, not just at religious sites',
  moderate: 'moderate — modest dress is expected at religious/conservative sites, relaxed elsewhere',
  relaxed: 'relaxed — few specific dress expectations beyond common sense (and keeping beachwear at the beach)',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s dress code is ${DRESS_LABELS[data.dressCode]}.`;

  return {
    country, countryName: data.name, dressCode: data.dressCode, dressCodeLabel: DRESS_LABELS[data.dressCode],
    dressNote: data.dressNote || null, etiquetteNote: data.etiquetteNote || null, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/dress-code-checker/calculate
// @access Public
exports.calculateDressCode = (req, res) => {
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
// @route POST /api/tools/dress-code-checker/pdf
// @access Public
exports.generateDressCodePdf = async (req, res) => {
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
      [email, firstName || null, 'dress-code-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Dress Code & Etiquette Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="dress-code-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    if (result.dressNote) {
      pdfService.heading(doc, 'Dress code');
      pdfService.paragraph(doc, result.dressNote);
    }
    if (result.etiquetteNote) {
      pdfService.heading(doc, 'Etiquette tips');
      pdfService.paragraph(doc, result.etiquetteNote);
    }

    pdfService.heading(doc, 'Before you pack');
    pdfService.bulletList(doc, [
      'Pack at least one modest outfit (covering shoulders and knees) even for destinations with generally relaxed dress — most religious and historic sites worldwide expect it, regardless of the country\'s everyday norms.',
      'A lightweight scarf or sarong is a versatile, packable way to cover up on the spot for temples, mosques, or churches without dedicating extra luggage space.',
      'When in doubt, dress slightly more conservatively than you think is necessary — you can always dress down, but you can\'t always dress up on short notice.',
      'Local norms and enforcement can vary between cities and rural areas, and change over time — this guide reflects general, widely-known patterns rather than official regulations.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `👗 Your ${result.countryName} dress code & etiquette guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your dress code check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond packing advice? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send dress-code-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateDressCodePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
