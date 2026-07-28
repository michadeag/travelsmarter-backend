const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Most common tourist scam per destination — riskLevel: 'low' (no
// widespread, well-known scam pattern beyond generic pickpocketing) |
// 'moderate' (a real, somewhat common pattern worth knowing) | 'high'
// (a well-documented, actively-run scam that catches tourists regularly).
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'moderate', topScam: 'Petition & pickpocket teams', note: "Groups posing as deaf/mute petition signers work in teams near the Eiffel Tower, Louvre, and Metro — one distracts you with a clipboard while another lifts your bag or phone. Don't sign anything from a stranger and keep bags zipped in crowds." },
  austria: { name: 'Austria', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern beyond generic pickpocketing in crowded tourist areas — a genuinely low-risk destination.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'moderate', topScam: 'Currency exchange & bar overcharging', note: "Street currency exchange booths in Prague advertise great rates but bury huge commissions in the fine print, and some bars/restaurants near Old Town add unordered items to the bill. Exchange at a bank or ATM instead, and check your bill line by line." },
  denmark: { name: 'Denmark', riskLevel: 'low', topScam: 'Pickpocketing in crowds', note: 'No well-documented targeted scam beyond generic pickpocketing on busy pedestrian streets and public transit — a genuinely low-risk destination.' },
  germany: { name: 'Germany', riskLevel: 'low', topScam: 'Fake ticket inspectors', note: "Occasional reports of people posing as transit inspectors demanding on-the-spot cash fines — real inspectors carry an official badge and never insist on cash. Otherwise a low-risk destination." },
  greece: { name: 'Greece', riskLevel: 'moderate', topScam: 'Taxi overcharging & bar hustles', note: "Athens taxis sometimes take deliberately long routes or claim a broken meter with tourists; some bar touts lead you to venues that pile on hidden charges once you're seated. Agree on a fare or insist on the meter, and be wary of anyone overly friendly steering you to \"their\" bar." },
  hungary: { name: 'Hungary', riskLevel: 'high', topScam: 'Bar/hostess consumption scam', note: "Budapest's best-known scam: a friendly stranger (often attractive) invites you to \"their favorite bar,\" and you're hit with a bill of hundreds of dollars for a few drinks, sometimes with intimidating enforcers nearby. Never follow a stranger you just met to an unfamiliar bar, and always check prices before ordering." },
  iceland: { name: 'Iceland', riskLevel: 'low', topScam: 'Overpriced tourist-trap restaurants', note: 'No targeted scam pattern beyond generically overpriced restaurants near major attractions — a genuinely low-risk destination, just budget accordingly.' },
  italy: { name: 'Italy', riskLevel: 'high', topScam: 'Pickpocketing & restaurant overcharging', note: "Rome, Florence, and Milan see organized pickpocket rings on crowded transit and near landmarks, plus tourist restaurants with no printed prices that pad the final bill with cover charges and inflated seafood \"market price\" items. Keep valuables in a front pocket or zipped bag, and always ask for a menu with prices before sitting down." },
  netherlands: { name: 'Netherlands', riskLevel: 'moderate', topScam: 'Street drug scams & pickpocketing', note: "Near Amsterdam's Red Light District, unlicensed street dealers sometimes sell fake or dangerous substances to tourists — buying drugs on the street is both illegal and a common scam vector. Pickpocketing on crowded trams is the other main risk." },
  portugal: { name: 'Portugal', riskLevel: 'low', topScam: 'Pickpocketing on Lisbon trams', note: "The historic Tram 28 in Lisbon is a well-known pickpocket hotspot due to how crowded and slow it runs — otherwise a genuinely low-risk destination. Keep bags in front of you on crowded trams." },
  spain: { name: 'Spain', riskLevel: 'high', topScam: 'Pickpocketing & distraction theft', note: "Barcelona and Madrid see frequent, organized distraction theft — someone spills something on you, asks for directions, or stages a minor commotion while an accomplice takes your bag or phone. Stay alert on Las Ramblas, the Metro, and around major landmarks." },
  sweden: { name: 'Sweden', riskLevel: 'low', topScam: 'Pickpocketing in Stockholm Old Town', note: "Gamla Stan's narrow, crowded streets see occasional pickpocketing, but there's no organized scam pattern beyond that — a genuinely low-risk destination." },
  switzerland: { name: 'Switzerland', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk destination, though standard vigilance in crowded train stations is still worthwhile.' },
  ireland: { name: 'Ireland', riskLevel: 'low', topScam: 'Overpriced airport taxis', note: "Occasional reports of unlicensed taxis overcharging tourists straight off flights at Dublin Airport — use the official taxi rank or a rideshare app. Otherwise a low-risk destination." },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'moderate', topScam: 'Fake charity collectors & pickpocketing', note: "London sees aggressive, sometimes fake, street charity collectors pressuring tourists for card payments, plus routine pickpocketing on the Underground and around major attractions. Politely decline street solicitations and keep bags zipped on the Tube." },
  turkey: { name: 'Turkey', riskLevel: 'high', topScam: 'Shoe shine & carpet shop scams', note: "Istanbul's classic scam: a shoe shiner drops his brush ahead of you, you return it, and he insists on shining your shoes for an inflated fee. Unsolicited \"friendly local\" invitations to tea almost always end at a high-pressure carpet shop. Politely but firmly decline both." },
  japan: { name: 'Japan', riskLevel: 'low', topScam: 'Overpriced nightlife touts', note: "Tokyo's Kabukicho district has touts luring tourists into bars with absurd hidden cover charges and drink minimums — avoid anyone approaching you on the street offering a bar recommendation. Otherwise an exceptionally low-risk destination." },
  thailand: { name: 'Thailand', riskLevel: 'high', topScam: 'Tuk-tuk gem scam & vehicle damage claims', note: "The classic Bangkok scam: a friendly tuk-tuk driver claims the temple you want is \"closed today\" and redirects you to a gem or tailor shop paying him commission. Separately, rented scooters and jet skis are frequently claimed \"damaged\" at return with inflated repair charges — photograph the vehicle thoroughly before renting." },
  indonesia: { name: 'Indonesia', riskLevel: 'moderate', topScam: 'Scooter rental damage scam (Bali)', note: "Bali's most reported scam: rental scooters are claimed to have pre-existing damage at return, with the shop demanding a large cash payment on the spot. Photograph and video the scooter from every angle before you ride off, and rent from a reputable shop with reviews." },
  singapore: { name: 'Singapore', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — strict local enforcement makes this one of the lowest-risk destinations for tourist scams anywhere.' },
  'south-korea': { name: 'South Korea', riskLevel: 'low', topScam: 'Overpriced unmetered taxis', note: "Occasional reports of unmetered taxis overcharging tourists near airports and nightlife districts — insist on the meter or use a rideshare app. Otherwise a low-risk destination." },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'moderate', topScam: 'Tailor shop & electronics overcharging', note: "Some tailor shops and electronics stores in tourist areas quote one price then substitute lower-quality materials or add unadvertised fees at pickup/checkout. Get itemized quotes in writing and buy electronics only from stores with clearly marked prices." },
  vietnam: { name: 'Vietnam', riskLevel: 'high', topScam: 'Taxi meter tampering & overcharging', note: "Unmarked or fake-branded taxis in Hanoi and Ho Chi Minh City sometimes run rigged meters that tick up far faster than normal. Stick to reputable companies (Mai Linh, Vinasun) or use Grab, and confirm the fare or app estimate before you get in." },
  philippines: { name: 'Philippines', riskLevel: 'moderate', topScam: 'Taxi overcharging & fake tour guides', note: "Manila taxis sometimes refuse the meter and quote inflated flat fares to tourists, and unlicensed \"guides\" at popular sites charge for information that's actually free. Use Grab where possible and agree on any guide fee upfront." },
  malaysia: { name: 'Malaysia', riskLevel: 'low', topScam: 'Airport taxi overcharging', note: "Occasional reports of unmetered taxis overcharging tourists at Kuala Lumpur airport — use the official prepaid taxi counter or a rideshare app. Otherwise a low-risk destination." },
  china: { name: 'China', riskLevel: 'high', topScam: 'Tea house & fake art student scam', note: "Friendly \"students\" near major attractions in Beijing and Shanghai invite tourists to a traditional tea ceremony or art exhibition, then present a bill for hundreds of dollars once you're seated. Politely decline unsolicited invitations from overly friendly strangers, however good their English." },
  india: { name: 'India', riskLevel: 'high', topScam: 'Fake tourism offices & gem investment scams', note: "Unofficial \"government tourism offices\" near train stations redirect travelers to commission-paying travel agents, and gem shops sometimes push \"investment opportunity\" purchases that are worthless outside the shop. Book only through verified official channels, and agree on rickshaw/taxi fares before you get in." },
  maldives: { name: 'Maldives', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — resort-based tourism here means minimal street-level interaction and a genuinely low-risk profile.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'moderate', topScam: 'Gem scams & tuk-tuk commission detours', note: "Gem \"deals\" from street touts are almost always worthless stones sold as valuable; tuk-tuk drivers sometimes insist your hotel is \"closed\" or \"full\" to redirect you to a commission-paying alternative. Book accommodation directly and buy gems only from licensed dealers." },
  cambodia: { name: 'Cambodia', riskLevel: 'moderate', topScam: 'Angkor Wat overcharging & fake orphanage donations', note: "Unofficial guides and vendors around Angkor Wat sometimes charge well above posted rates, and some \"orphanages\" soliciting donations or visits are for-profit operations that don't benefit the children shown. Book official tickets and guides only, and donate to established, vetted charities instead." },
  australia: { name: 'Australia', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  fiji: { name: 'Fiji', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk destination, with most tourism resort-based.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk destination, with most tourism resort-based.' },
  mexico: { name: 'Mexico', riskLevel: 'high', topScam: 'Taxi overcharging & fake police extortion', note: "Unmarked taxis frequently overcharge tourists or take deliberately long routes, and there are periodic reports of people posing as police demanding on-the-spot cash \"fines.\" Use hotel-called taxis or a rideshare app, and ask to see ID and go to a police station for any real fine." },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'moderate', topScam: 'Resort excursion overcharging', note: "Independent tour operators outside resort grounds sometimes quote low prices then add mandatory \"fees\" once you're mid-excursion. Book excursions through your resort or a well-reviewed operator with clear, all-in pricing upfront." },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — as US territory with standard consumer protections, a genuinely low-risk destination.' },
  bahamas: { name: 'Bahamas', riskLevel: 'low', topScam: 'Overpriced unlicensed taxis', note: "Unlicensed taxis near cruise ports sometimes quote inflated flat fares to tourists — use officially marked, licensed taxis and confirm the fare before you get in. Otherwise a low-risk destination." },
  jamaica: { name: 'Jamaica', riskLevel: 'moderate', topScam: 'Persistent vendor & tour hustlers', note: "Beaches and tourist areas see persistent, sometimes aggressive vendors and unofficial \"tour guides\" who won't take a polite no for an answer and later demand payment for unsolicited help. A firm, calm decline usually works — avoid engaging at length." },
  aruba: { name: 'Aruba', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'moderate', topScam: 'Rental car damage scam', note: "Some rental agencies claim pre-existing damage wasn't noted at pickup and charge large fees at return. Photograph and video the entire car from every angle before driving off, and consider buying full insurance coverage through the agency." },
  panama: { name: 'Panama', riskLevel: 'low', topScam: 'Overcharging unmetered taxis', note: "Unmetered taxis sometimes quote inflated fares to tourists, especially from the airport — agree on the price before you get in, or use a rideshare app. Otherwise a low-risk destination." },
  belize: { name: 'Belize', riskLevel: 'low', topScam: 'Overcharging unlicensed tour guides', note: "Unlicensed guides at popular sites sometimes charge inflated fees for information or access that's actually free or cheaper through official channels. Book tours through your hotel or a licensed operator. Otherwise a low-risk destination." },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  canada: { name: 'Canada', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — a genuinely low-risk, tourist-friendly destination.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'low', topScam: 'Overcharging unmetered taxis', note: "Unmetered taxis outside official ranks occasionally overcharge tourists in Dubai — use metered taxis or a rideshare app. Otherwise a low-risk destination given strict local law enforcement." },
  morocco: { name: 'Morocco', riskLevel: 'high', topScam: 'Fake guides & aggressive medina hustlers', note: "In Marrakech and Fes's medinas, unofficial \"helpful locals\" offer directions or guidance then aggressively demand payment, often steering you toward a shop that pays them commission. Politely but firmly decline unsolicited help, and use official guides booked through your riad or a licensed agency." },
  'south-africa': { name: 'South Africa', riskLevel: 'moderate', topScam: 'ATM distraction theft & fake checkpoints', note: "Distraction theft at ATMs (someone offers to \"help\" after your card appears stuck) and occasional fake police checkpoints targeting tourists' cash are the main reported risks. Use ATMs inside banks or malls, and ask any \"officer\" for ID and to go to a station for any real matter." },
  qatar: { name: 'Qatar', riskLevel: 'low', topScam: 'None widespread', note: 'No well-documented scam pattern — strict local law enforcement makes this a genuinely low-risk destination for tourist scams.' },
  israel: { name: 'Israel', riskLevel: 'low', topScam: 'Overcharging unmetered taxis', note: "Unmetered taxis occasionally overcharge tourists, especially from Ben Gurion Airport — insist on the meter or agree on a fare beforehand. Otherwise a low-risk destination." },
  tanzania: { name: 'Tanzania', riskLevel: 'moderate', topScam: 'Unlicensed safari operator deposit scams', note: "Unlicensed \"safari operators\" advertise attractive prices online and disappear after collecting a deposit. Book only through registered tour operators with verifiable reviews and a physical office, and avoid wiring large deposits to unverified contacts." },
  kenya: { name: 'Kenya', riskLevel: 'moderate', topScam: 'Unlicensed safari operator deposit scams', note: "Unlicensed \"safari operators\" advertise attractive prices online and disappear after collecting a deposit. Book only through registered tour operators with verifiable reviews and a physical office, and avoid wiring large deposits to unverified contacts." },
  argentina: { name: 'Argentina', riskLevel: 'moderate', topScam: 'Counterfeit currency & street exchange scams', note: "Street money changers offering rates better than banks sometimes hand back counterfeit bills or short-change tourists in the confusion of counting cash. Exchange only at reputable exchange houses or banks, and check any large bills you receive." },
  peru: { name: 'Peru', riskLevel: 'moderate', topScam: 'Fake tour agencies & taxi overcharging', note: "Unofficial \"agencies\" in Lima and Cusco sell tickets or tours that turn out to be invalid or nonexistent, and unmetered taxis frequently overcharge tourists. Book tours through verified operators and agree on taxi fares before you get in, or use an app." },
  chile: { name: 'Chile', riskLevel: 'low', topScam: 'Pickpocketing on Santiago metro', note: "Santiago's metro and crowded pedestrian areas see occasional pickpocketing, but there's no organized scam pattern beyond that — a genuinely low-risk destination." },
  colombia: { name: 'Colombia', riskLevel: 'moderate', topScam: 'Drink-spiking ("scopolamine") & fake taxis', note: "Reports of drinks or food spiked with scopolamine ('devil's breath') by people posing as friendly strangers, used to rob or coerce tourists — never accept food or drinks from someone you just met. Use official, marked taxis or a rideshare app rather than hailing from the street." },
  brazil: { name: 'Brazil', riskLevel: 'high', topScam: 'Distraction theft & fake police extortion', note: "Rio de Janeiro sees frequent distraction theft in crowded tourist areas and on beaches, plus occasional reports of people posing as plainclothes police demanding to see (and keep) your wallet. Carry minimal valuables on the street, and ask any officer for ID and to accompany you to a station for anything official." },
  'united-states': { name: 'United States', riskLevel: 'low', topScam: 'Rideshare/taxi overcharging at airports', note: "Unofficial drivers soliciting tourists directly at airport arrivals sometimes overcharge or aren't properly licensed — use the official taxi queue or order a rideshare through the app. Otherwise a low-risk destination." },
};

const RISK_LABELS = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const riskLabel = RISK_LABELS[data.riskLevel];
  const headline = `${data.name}: ${riskLabel} — watch out for ${data.topScam.toLowerCase()}.`;

  return {
    country, countryName: data.name, riskLevel: data.riskLevel, riskLabel,
    topScam: data.topScam, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/tourist-scams-checker/calculate
// @access Public
exports.calculateTouristScams = (req, res) => {
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
// @route POST /api/tools/tourist-scams-checker/pdf
// @access Public
exports.generateTouristScamsPdf = async (req, res) => {
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
      [email, firstName || null, 'tourist-scams-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Tourist Scams Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tourist-scams-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.riskLabel} — ${result.topScam}`);

    pdfService.heading(doc, 'General scam-avoidance habits');
    pdfService.bulletList(doc, [
      "Agree on a price (or insist on the meter/app) before getting into any taxi or tuk-tuk.",
      "Be skeptical of anyone unusually friendly who wants to guide you somewhere unplanned — especially to a specific shop, bar, or restaurant.",
      "Never accept food or drinks from someone you just met, and don't sign anything from street petitioners.",
      "This covers the single most common risk for this destination, not every possible scam — general street-smarts still apply everywhere.",
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🎭 Your ${result.countryName} tourist scams guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the tourist scam check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond scam-dodging? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send tourist-scams-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateTouristScamsPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
