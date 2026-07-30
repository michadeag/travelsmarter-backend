const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Local etiquette / taboo sensitivity per country. tabooLevel: 'high'
// (missteps are commonly noticed and can genuinely offend) | 'moderate'
// (locals are forgiving of foreigners, but a few specific customs matter)
// | 'low' (relaxed norms, foreigners get plenty of leeway). keyRule is
// the single most important thing to know; note adds further detail.
const COUNTRIES = {
  china: { name: 'China', tabooLevel: 'moderate', keyRule: 'Use both hands when giving or receiving business cards or gifts, and avoid dwelling on political topics like Taiwan, Tibet, or Hong Kong.', note: 'Gift-giving matters — avoid clocks (they symbolize death) and sets of four (the number sounds like "death" in Mandarin). It\'s polite to leave a little food on your plate to show your host you\'ve been served enough.' },
  'united-arab-emirates': { name: 'United Arab Emirates', tabooLevel: 'high', keyRule: 'Avoid public displays of affection, dress modestly outside resorts, and never eat, drink, or smoke in public during Ramadan daylight hours.', note: "Use your right hand for eating and greeting — the left is considered unclean. Public intoxication and drug possession (including some prescription medications) carry serious legal consequences, not just social disapproval." },
  'saudi-arabia': { name: 'Saudi Arabia', tabooLevel: 'high', keyRule: 'Dress conservatively, avoid public displays of affection, and never show the sole of your foot toward someone.', note: 'Modest dress is expected for both men and women in public. Friday is the holy day — many businesses close, and loud behavior during prayer times is frowned upon.' },
  turkey: { name: 'Turkey', tabooLevel: 'moderate', keyRule: 'Remove your shoes when entering a home or mosque, and avoid pointing the sole of your foot at anyone.', note: 'Turkish hospitality is strong — refusing offered tea or food can be seen as impolite. Dress modestly when visiting mosques (headscarf for women, no shorts).' },
  vietnam: { name: 'Vietnam', tabooLevel: 'moderate', keyRule: "Don't touch someone's head (even a child's) — it's considered the most sacred part of the body.", note: 'Use both hands to give or receive items, especially money or business cards. Avoid pointing with a single finger; use an open hand instead.' },
  egypt: { name: 'Egypt', tabooLevel: 'moderate', keyRule: 'Use your right hand for eating and handing over items — the left is considered unclean.', note: 'Bargaining is expected in markets and is part of the culture, not rude. Dress modestly, especially away from resort areas, and avoid public displays of affection.' },
  morocco: { name: 'Morocco', tabooLevel: 'moderate', keyRule: 'Use your right hand for eating and greetings, and dress modestly, especially outside tourist areas.', note: 'Bargaining in souks is expected and part of the experience. Avoid public displays of affection and be respectful during Ramadan if visiting then.' },
  india: { name: 'India', tabooLevel: 'high', keyRule: 'Use your right hand for eating and giving/receiving items — the left is considered unclean.', note: 'Remove shoes before entering homes and temples. Public displays of affection are frowned upon, and it\'s respectful to dress modestly, especially at religious sites.' },
  indonesia: { name: 'Indonesia', tabooLevel: 'moderate', keyRule: "Don't touch anyone's head, and use your right hand for eating and passing items.", note: 'Dress modestly, especially in Muslim-majority areas and when visiting temples in Bali (a sarong is often required). Public displays of affection are best kept minimal.' },
  thailand: { name: 'Thailand', tabooLevel: 'high', keyRule: "Never point the sole of your foot at a person or a Buddha image, and never touch someone's head.", note: 'The monarchy is deeply revered — criticizing it is both a serious social taboo and, notably, a crime. Remove shoes before entering temples and homes, and dress modestly at religious sites.' },
  singapore: { name: 'Singapore', tabooLevel: 'moderate', keyRule: "Don't chew gum in public — it's actually restricted by law — and dispose of litter properly, since fines are strictly enforced.", note: 'Singapore is multicultural, so etiquette varies by community, but cleanliness and public order are consistently valued and enforced.' },

  'united-states': { name: 'United States', tabooLevel: 'low', keyRule: 'Tipping (usually 15-20% at restaurants) is expected, not optional, despite not being a strict "taboo."', note: 'Norms vary widely by region, but Americans are generally forgiving of foreign visitors and direct communication is the cultural default.' },
  canada: { name: 'Canada', tabooLevel: 'low', keyRule: 'Tipping (15-20%) is expected at restaurants, similar to the US.', note: 'Canadians place a high value on politeness and queuing — cutting in line is a notable faux pas.' },
  mexico: { name: 'Mexico', tabooLevel: 'moderate', keyRule: 'Handshakes and a warm greeting are important — skipping small talk and getting straight to business can seem cold.', note: 'Personal space is smaller than in the US/Northern Europe, and family and personal relationships matter in business and social settings.' },
  brazil: { name: 'Brazil', tabooLevel: 'moderate', keyRule: 'Greetings often involve physical contact (cheek kisses, hugs) — a cold, distant demeanor can be seen as rude.', note: 'The "OK" hand gesture is considered vulgar in Brazil, unlike in most Western countries — use a thumbs-up instead.' },
  argentina: { name: 'Argentina', tabooLevel: 'low', keyRule: 'A single cheek kiss is a common greeting, even between men in some contexts.', note: 'Meal times run late (dinner often after 9pm), and mate (a shared herbal tea) has its own etiquette — accept when offered.' },
  chile: { name: 'Chile', tabooLevel: 'low', keyRule: 'A handshake or single cheek kiss is the standard greeting.', note: 'Chileans are generally reserved compared to other Latin American cultures — punctuality is appreciated more than in neighboring countries.' },
  colombia: { name: 'Colombia', tabooLevel: 'low', keyRule: 'A warm greeting with a handshake or cheek kiss is expected — skipping it can feel abrupt.', note: 'Colombians value politeness and formality in initial interactions, even though the culture is generally warm and friendly.' },
  peru: { name: 'Peru', tabooLevel: 'moderate', keyRule: 'A handshake is standard; ask permission before photographing people, especially in indigenous communities.', note: 'Bargaining in markets is common but should be done respectfully. Formal titles are appreciated in business settings.' },
  'costa-rica': { name: 'Costa Rica', tabooLevel: 'low', keyRule: '"Pura vida" (pure life) reflects a relaxed, unhurried culture — rushing or impatience can feel out of place.', note: 'Costa Ricans (Ticos) are generally easygoing with visitors, though politeness and a friendly greeting go a long way.' },

  'united-kingdom': { name: 'United Kingdom', tabooLevel: 'low', keyRule: 'Queuing (waiting your turn in line) is taken seriously — cutting in line is a real faux pas.', note: 'Politeness and understatement are cultural norms — overly loud or boastful behavior can stand out negatively.' },
  ireland: { name: 'Ireland', tabooLevel: 'low', keyRule: 'Self-deprecating humor and modesty are valued — boasting can come across poorly.', note: 'The pub is a central social space with its own etiquette (rounds of buying drinks are customary among groups).' },
  france: { name: 'France', tabooLevel: 'moderate', keyRule: 'Always greet shopkeepers with "Bonjour" before asking anything — skipping this is considered rude.', note: 'Formality matters in initial interactions — use "vous" rather than "tu" until invited to do otherwise, and dress reasonably well in public.' },
  germany: { name: 'Germany', tabooLevel: 'moderate', keyRule: 'Punctuality is taken very seriously — even a few minutes late is considered disrespectful.', note: 'Directness in communication is the cultural norm, not rudeness — Germans generally say what they mean.' },
  italy: { name: 'Italy', tabooLevel: 'moderate', keyRule: "Don't order a cappuccino after 11am — locals see it as a breakfast-only drink, a minor but real faux pas.", note: 'Dress well in public — Italians notice and value good presentation ("bella figura"). Dress modestly when visiting churches.' },
  spain: { name: 'Spain', tabooLevel: 'low', keyRule: 'Meal times run late (lunch around 2pm, dinner after 9pm) — showing up "on time" by other countries\' standards can mean an empty restaurant.', note: 'Two cheek kisses are a common greeting between women and between men and women. The siesta tradition means some shops close mid-afternoon.' },
  netherlands: { name: 'Netherlands', tabooLevel: 'low', keyRule: "Directness is the cultural norm — blunt feedback isn't meant as rude.", note: 'Splitting the bill ("going Dutch") is common and not considered awkward, unlike in some other cultures.' },
  portugal: { name: 'Portugal', tabooLevel: 'low', keyRule: "A relaxed pace and unhurried meals are the norm — don't expect fast table turnover at restaurants.", note: 'Politeness and a warm greeting are appreciated; punctuality is valued more loosely than in Germany or the Netherlands.' },
  greece: { name: 'Greece', tabooLevel: 'low', keyRule: "The open-palm hand gesture (like a stop sign, called 'moutza') is considered a serious insult — avoid it entirely, even accidentally when waving.", note: 'Hospitality is a strong cultural value — refusing offered food or drink can seem impolite.' },
  austria: { name: 'Austria', tabooLevel: 'moderate', keyRule: 'Use formal titles (Herr/Frau plus surname) until invited to use first names.', note: 'Punctuality and formality matter, especially in business and initial social interactions.' },
  switzerland: { name: 'Switzerland', tabooLevel: 'moderate', keyRule: 'Punctuality is essential — arriving even 5 minutes late without notice is a real faux pas.', note: 'Quiet, orderly public behavior is expected — loud conversations on public transport can draw disapproving looks.' },
  poland: { name: 'Poland', tabooLevel: 'low', keyRule: 'Bring an odd number of flowers if gifting them — even numbers are associated with funerals.', note: 'A firm handshake with eye contact is the standard greeting; toasts are common and meaningful when drinking with company.' },
  'czech-republic': { name: 'Czech Republic', tabooLevel: 'low', keyRule: 'A handshake with direct eye contact is the standard greeting.', note: "Punctuality is appreciated, and it's customary to bring a small gift (like flowers, odd-numbered) when invited to someone's home." },
  norway: { name: 'Norway', tabooLevel: 'low', keyRule: 'Personal space is valued — standing too close in conversation can make locals uncomfortable.', note: "Norwegians tend to be reserved with strangers but warm once you know them — small talk with strangers isn't the norm." },
  sweden: { name: 'Sweden', tabooLevel: 'low', keyRule: 'Boasting or drawing excessive attention to yourself goes against the cultural values of "lagom" (moderation) and modesty.', note: 'Personal space and quiet public behavior are valued — Swedes are generally reserved with strangers.' },
  denmark: { name: 'Denmark', tabooLevel: 'low', keyRule: 'Modesty and equality are strong cultural values — avoid overt displays of wealth or status.', note: 'Danes value informality once introduced, but initial interactions can seem reserved.' },
  iceland: { name: 'Iceland', tabooLevel: 'low', keyRule: 'Icelanders are generally informal and direct — small talk with strangers is uncommon but not unwelcome.', note: 'Punctuality is appreciated though somewhat relaxed compared to Germany or Switzerland.' },

  japan: { name: 'Japan', tabooLevel: 'high', keyRule: "Don't stick chopsticks upright in a bowl of rice — it resembles a funeral ritual — and bow rather than shake hands.", note: 'Remove shoes before entering homes and some restaurants. Business cards should be given and received with both hands and studied briefly, not pocketed immediately. Tipping is not customary and can even cause confusion or be declined.' },
  'south-korea': { name: 'South Korea', tabooLevel: 'high', keyRule: 'Use both hands when giving or receiving items from someone older, and bow slightly when greeting.', note: 'Age and hierarchy strongly shape social interactions — asking age early in a conversation is normal, since it determines how people address each other. Pouring your own drink is considered impolite; pour for others and let them pour for you.' },
  malaysia: { name: 'Malaysia', tabooLevel: 'moderate', keyRule: 'Use your right hand for eating and passing items — the left is considered unclean.', note: 'Dress modestly, especially when visiting mosques (headscarves often provided for women). Public displays of affection are frowned upon.' },
  philippines: { name: 'Philippines', tabooLevel: 'low', keyRule: "'Mano po' — touching an elder's hand to your forehead — is a traditional sign of respect, appreciated if attempted by visitors.", note: 'Filipino hospitality is strong — refusing offered food can be seen as impolite. Public criticism or causing someone to "lose face" is best avoided.' },

  israel: { name: 'Israel', tabooLevel: 'moderate', keyRule: 'Businesses and public transport largely shut down for Shabbat (Friday evening to Saturday evening) in many areas — plan around it.', note: 'Directness in conversation is culturally normal and not meant as rude. Dress modestly when visiting religious sites.' },
  jordan: { name: 'Jordan', tabooLevel: 'moderate', keyRule: 'Use your right hand for eating and greetings, and dress modestly, especially outside tourist-hotel areas.', note: 'Hospitality is a deep cultural value — accepting offered tea or coffee is polite. Public displays of affection are best avoided.' },
  kenya: { name: 'Kenya', tabooLevel: 'low', keyRule: 'A handshake is the standard greeting, often held a bit longer than in Western cultures.', note: 'Greetings and small talk before business matters — rushing straight to the point can seem abrupt. Use your right hand for eating and passing items.' },
  'south-africa': { name: 'South Africa', tabooLevel: 'low', keyRule: 'South Africa has 11 official languages and diverse customs — a friendly greeting and some patience with cultural variety go a long way.', note: 'Tipping is customary and appreciated in restaurants and for services like car guards.' },

  australia: { name: 'Australia', tabooLevel: 'low', keyRule: 'Australians value informality and self-deprecating humor — overly formal or boastful behavior can stand out.', note: 'Directness is the cultural norm, and mateship (camaraderie) is valued — a relaxed, friendly demeanor fits in well.' },
  'new-zealand': { name: 'New Zealand', tabooLevel: 'low', keyRule: 'Māori culture and customs (like the hongi greeting, pressing noses and foreheads) are respected — showing interest in Māori traditions is appreciated.', note: 'Kiwis are generally informal and friendly — modesty and understatement are valued over boastfulness.' },
};

const TABOO_LABELS = {
  high: "high — etiquette missteps are commonly noticed and can genuinely offend, so it's worth learning the basics before you go",
  moderate: 'moderate — locals are generally forgiving of foreigners, but a few specific customs are worth knowing',
  low: 'low — norms are relaxed and foreigners get plenty of leeway',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name}'s etiquette sensitivity is ${TABOO_LABELS[data.tabooLevel]}. Most important: ${data.keyRule}`;

  return {
    country, countryName: data.name, tabooLevel: data.tabooLevel, tabooLevelLabel: TABOO_LABELS[data.tabooLevel],
    keyRule: data.keyRule, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/etiquette-checker/calculate
// @access Public
exports.calculateEtiquette = (req, res) => {
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
// @route POST /api/tools/etiquette-checker/pdf
// @access Public
exports.generateEtiquettePdf = async (req, res) => {
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
      [email, firstName || null, 'etiquette-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Etiquette & Taboos Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="etiquette-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `Etiquette sensitivity: ${result.tabooLevelLabel}`);

    pdfService.heading(doc, 'Before you fly');
    pdfService.bulletList(doc, [
      result.tabooLevel === 'high'
        ? "Take a few minutes to actually memorize the key rule above — in high-sensitivity cultures, a single misstep is genuinely more likely to be noticed and remembered than in more relaxed destinations."
        : "Don't overthink it — locals are generally understanding of foreign visitors, but a little awareness of local norms goes a long way toward a warmer welcome.",
      'When in doubt, watch what locals around you are doing and mirror it — it\'s the fastest way to pick up on unwritten rules a guide can\'t fully cover.',
      'Culture varies within countries too, especially by region and urban vs. rural areas — treat this as a starting point, not an exhaustive rulebook.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🤝 Your ${result.countryName} etiquette & taboos guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your etiquette check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond cultural know-how? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send etiquette-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateEtiquettePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
