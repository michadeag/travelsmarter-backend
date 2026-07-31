const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Local pharmacy access and over-the-counter medication norms per
// destination — distinct from medicationLegalityController.js (which
// covers importing medication you bring WITH you, not buying medication
// locally once you're there). pharmacyLevel: 'easy-otc' (pharmacies are
// widespread and notably lenient — many medications that require a
// prescription elsewhere, including some antibiotics, are commonly sold
// over-the-counter) | 'standard' (pharmacies are widespread and reliable,
// with prescription rules broadly similar to most Western countries) |
// 'limited-access' (pharmacies are reliable mainly in cities, with real
// gaps in stock, regulation, or English-language help elsewhere) |
// 'bring-your-own' (pharmacy access is genuinely unreliable — don't count
// on finding what you need locally).
const COUNTRIES = {
  france: { name: 'France', pharmacyLevel: 'standard', note: 'Pharmacies (marked with a green cross) are everywhere and well-regulated — common pain relievers and allergy medication are OTC, but antibiotics and stronger drugs require a prescription, enforced consistently.' },
  austria: { name: 'Austria', pharmacyLevel: 'standard', note: 'Pharmacies (Apotheke) are widespread and well-regulated, with rules broadly similar to Germany — common OTC medication is easy to find, prescriptions are enforced for antibiotics and stronger drugs.' },
  'czech-republic': { name: 'Czech Republic', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and reliable in cities, with rules broadly similar to Western Europe — common OTC medication is easy to find.' },
  denmark: { name: 'Denmark', pharmacyLevel: 'standard', note: 'Pharmacies (Apotek) are widespread and well-regulated — common OTC medication is easy to find, with consistently enforced prescription rules for stronger drugs.' },
  germany: { name: 'Germany', pharmacyLevel: 'standard', note: 'The Apotheke system is extremely well-organized and widespread — common OTC medication is easy to find, with strict, consistently enforced prescription rules for antibiotics and stronger drugs.' },
  greece: { name: 'Greece', pharmacyLevel: 'easy-otc', note: 'Greek pharmacies are notably lenient in practice — many medications that require a prescription elsewhere, including some antibiotics, are commonly available over-the-counter.' },
  hungary: { name: 'Hungary', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and reliable in cities, with rules broadly similar to Western Europe.' },
  iceland: { name: 'Iceland', pharmacyLevel: 'standard', note: 'Pharmacies are reliable in Reykjavik and other towns, with rules broadly similar to the rest of Scandinavia — stock in very remote areas can be more limited.' },
  italy: { name: 'Italy', pharmacyLevel: 'easy-otc', note: 'Italian pharmacies (farmacia) are notably lenient in practice — many medications that require a prescription elsewhere, including some antibiotics, are commonly available over-the-counter, and pharmacists often provide informal medical advice.' },
  netherlands: { name: 'Netherlands', pharmacyLevel: 'standard', note: 'Pharmacies (apotheek) are widespread and well-regulated — common OTC medication is easy to find, with consistently enforced prescription rules for stronger drugs.' },
  portugal: { name: 'Portugal', pharmacyLevel: 'standard', note: 'Pharmacies (farmácia, marked with a green cross) are widespread and reliable, with rules broadly similar to the rest of Western Europe.' },
  spain: { name: 'Spain', pharmacyLevel: 'easy-otc', note: 'Spanish pharmacies (farmacia) are notably lenient in practice — many medications that require a prescription elsewhere, including some antibiotics, are commonly available over-the-counter.' },
  sweden: { name: 'Sweden', pharmacyLevel: 'standard', note: 'Pharmacies (Apotek) are widespread and well-regulated — common OTC medication is easy to find, with consistently enforced prescription rules for stronger drugs.' },
  switzerland: { name: 'Switzerland', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated — common OTC medication is easy to find, with strict, consistently enforced prescription rules for stronger drugs.' },
  ireland: { name: 'Ireland', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and reliable — common OTC medication is easy to find, with prescription rules broadly similar to the UK.' },
  'united-kingdom': { name: 'United Kingdom', pharmacyLevel: 'standard', note: 'Pharmacies (chemists) are widespread and reliable — common OTC medication is easy to find, though prescription enforcement for antibiotics and stronger drugs is strict.' },
  turkey: { name: 'Turkey', pharmacyLevel: 'easy-otc', note: 'Turkish pharmacies (eczane) are notably lenient in practice — many medications that require a prescription elsewhere, including some antibiotics, are commonly available over-the-counter.' },
  japan: { name: 'Japan', pharmacyLevel: 'standard', note: 'Pharmacies are excellent and well-organized, but stricter than many countries about what qualifies as OTC — some familiar Western OTC drugs (certain decongestants and allergy medications) aren\'t sold at all, and English-language help is less reliable outside major cities.' },
  thailand: { name: 'Thailand', pharmacyLevel: 'easy-otc', note: 'Thai pharmacies are notably lenient in practice — many medications that require a prescription elsewhere, including antibiotics, are commonly sold over-the-counter, and pharmacists are used to informally advising foreign visitors.' },
  indonesia: { name: 'Indonesia', pharmacyLevel: 'easy-otc', note: 'Indonesian pharmacies (apotek) are notably lenient in practice — many medications that require a prescription elsewhere are commonly available over-the-counter, especially in tourist areas.' },
  singapore: { name: 'Singapore', pharmacyLevel: 'standard', note: 'Pharmacies are widespread, modern, and well-regulated — prescription rules are actually stricter than in much of Southeast Asia, with consistent enforcement.' },
  'south-korea': { name: 'South Korea', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated, with modern infrastructure — common OTC medication is easy to find, especially in major cities.' },
  'hong-kong': { name: 'Hong Kong', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated — common OTC medication is easy to find, with English-language help generally reliable.' },
  vietnam: { name: 'Vietnam', pharmacyLevel: 'easy-otc', note: 'Vietnamese pharmacies are notably lenient in practice — many medications that require a prescription elsewhere, including antibiotics, are commonly sold over-the-counter.' },
  philippines: { name: 'Philippines', pharmacyLevel: 'easy-otc', note: 'Filipino pharmacies are widespread (major chains found everywhere) and notably lenient — many medications that require a prescription elsewhere are commonly available over-the-counter.' },
  malaysia: { name: 'Malaysia', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and reasonably well-regulated — more consistent prescription enforcement than in much of the rest of Southeast Asia.' },
  china: { name: 'China', pharmacyLevel: 'limited-access', note: 'Pharmacies are present, but prescription rules can be confusingly inconsistent, and finding specific Western-brand medications or English-speaking staff outside major cities can be genuinely difficult.' },
  india: { name: 'India', pharmacyLevel: 'easy-otc', note: 'Indian pharmacies are widespread, cheap, and notably lenient in practice — many medications that require a prescription elsewhere, including many antibiotics, are commonly available over-the-counter.' },
  maldives: { name: 'Maldives', pharmacyLevel: 'limited-access', note: 'Pharmacy access is genuinely limited outside Malé — most resort islands rely on a small in-house medical clinic rather than a full pharmacy.' },
  taiwan: { name: 'Taiwan', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated, with modern infrastructure — common OTC medication is easy to find.' },
  'sri-lanka': { name: 'Sri Lanka', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Colombo and other major towns, with real gaps in stock and consistency in more rural or remote areas.' },
  cambodia: { name: 'Cambodia', pharmacyLevel: 'limited-access', note: 'Pharmacy stock and regulation are inconsistent — stick to well-known pharmacy chains in Phnom Penh or Siem Reap, since counterfeit medication is a documented concern.' },
  australia: { name: 'Australia', pharmacyLevel: 'standard', note: 'Pharmacies (chemists) are widespread and well-regulated — common OTC medication is easy to find, with consistently enforced prescription rules.' },
  'new-zealand': { name: 'New Zealand', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated — common OTC medication is easy to find, with consistently enforced prescription rules.' },
  fiji: { name: 'Fiji', pharmacyLevel: 'bring-your-own', note: 'Pharmacy access is genuinely limited outside Nadi and Suva — resort areas typically rely on a small first-aid stock rather than a full pharmacy.' },
  'french-polynesia': { name: 'French Polynesia', pharmacyLevel: 'bring-your-own', note: "Pharmacy access is genuinely limited outside Papeete — outer islands and resorts often have little beyond basic first aid." },
  mexico: { name: 'Mexico', pharmacyLevel: 'easy-otc', note: 'Mexican pharmacies (farmacia) are widespread and notably lenient — many medications that require a prescription elsewhere, including some antibiotics, are commonly available over-the-counter.' },
  'dominican-republic': { name: 'Dominican Republic', pharmacyLevel: 'limited-access', note: 'Pharmacy stock and regulation are inconsistent outside resort areas and major cities — stick to well-known chains where possible.' },
  'puerto-rico': { name: 'Puerto Rico', pharmacyLevel: 'standard', note: 'As a US territory, pharmacies follow US-style regulation — common OTC medication is easy to find, with strict prescription enforcement.' },
  bahamas: { name: 'Bahamas', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Nassau, with more limited access on the smaller Out Islands.' },
  jamaica: { name: 'Jamaica', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Kingston, Montego Bay, and other main tourist areas, with more limited access elsewhere.' },
  aruba: { name: 'Aruba', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Oranjestad and near resort areas, with more limited selection than you might expect from a small island.' },
  'turks-and-caicos': { name: 'Turks and Caicos', pharmacyLevel: 'bring-your-own', note: 'Pharmacy access is genuinely limited given the small size of the islands — bring what you reasonably expect to need.' },
  'st-lucia': { name: 'St. Lucia', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Castries and near resort areas, with more limited access elsewhere on the island.' },
  'costa-rica': { name: 'Costa Rica', pharmacyLevel: 'easy-otc', note: 'Costa Rican pharmacies (farmacia) are widespread and notably lenient — many medications that require a prescription elsewhere are commonly available over-the-counter.' },
  panama: { name: 'Panama', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Panama City, with more limited access outside it.' },
  belize: { name: 'Belize', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Belize City and larger towns, with genuinely limited access on smaller cayes.' },
  'cayman-islands': { name: 'Cayman Islands', pharmacyLevel: 'standard', note: 'As a well-developed financial hub, pharmacies are reliable and reasonably well-stocked, with rules broadly similar to the US/UK.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in St. John\'s and near resort areas, with more limited access elsewhere.' },
  curacao: { name: 'Curaçao', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Willemstad, with more limited access elsewhere on the island.' },
  canada: { name: 'Canada', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated — common OTC medication is easy to find, with consistently enforced prescription rules.' },
  'united-arab-emirates': { name: 'United Arab Emirates', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and modern — note that some common medications elsewhere (certain codeine and pseudoephedrine-based products) are classified as controlled substances here, so check before assuming something is OTC.' },
  morocco: { name: 'Morocco', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Marrakech, Casablanca, and other major cities, with more limited stock and English-language help elsewhere.' },
  'south-africa': { name: 'South Africa', pharmacyLevel: 'standard', note: 'Pharmacy chains are well-developed in major cities like Cape Town and Johannesburg — common OTC medication is easy to find, with reasonably consistent regulation.' },
  qatar: { name: 'Qatar', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and modern, especially in Doha — note that some common medications elsewhere are classified as controlled substances here, so check before assuming something is OTC.' },
  israel: { name: 'Israel', pharmacyLevel: 'standard', note: 'Pharmacies (beit mirkachat) are widespread and well-regulated, with modern infrastructure — common OTC medication is easy to find.' },
  tanzania: { name: 'Tanzania', pharmacyLevel: 'bring-your-own', note: "Pharmacy access and reliability are genuinely inconsistent outside Dar es Salaam and major towns — safari lodges typically have only basic first-aid supplies." },
  kenya: { name: 'Kenya', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Nairobi, with more limited and inconsistent access outside major cities and safari lodges.' },
  argentina: { name: 'Argentina', pharmacyLevel: 'standard', note: 'Pharmacies (farmacia) are widespread and reliable, especially in Buenos Aires — common OTC medication is easy to find.' },
  peru: { name: 'Peru', pharmacyLevel: 'limited-access', note: 'Pharmacies are reliable in Lima, with more limited and inconsistent access in smaller towns and rural areas, including much of the Andean region.' },
  chile: { name: 'Chile', pharmacyLevel: 'standard', note: 'Major pharmacy chains are well-developed and reliable, especially in Santiago — common OTC medication is easy to find.' },
  colombia: { name: 'Colombia', pharmacyLevel: 'standard', note: 'Major pharmacy chains are well-developed and reliable in Bogotá, Medellín, and other large cities.' },
  brazil: { name: 'Brazil', pharmacyLevel: 'standard', note: 'Major pharmacy chains are well-developed and reliable in Brazilian cities — common OTC medication is easy to find.' },
  'united-states': { name: 'United States', pharmacyLevel: 'standard', note: 'Pharmacies are widespread and well-regulated — common OTC medication is easy to find, though prescription enforcement, especially for antibiotics, is notably strict compared to many other countries.' },
};

const PHARMACY_LABELS = {
  'easy-otc': 'Easy OTC Access — Many Prescriptions Not Required',
  standard: 'Standard — Similar Rules to Most Western Countries',
  'limited-access': 'Limited Access — Reliable Mainly in Cities',
  'bring-your-own': "Bring Your Own — Don't Count on Local Stock",
};

const DISCLAIMER = "This is general travel orientation, not medical advice — rules and enforcement can vary by pharmacy and change over time. Always travel with enough of any critical prescription medication for your full trip plus a buffer, along with a doctor's letter, rather than planning to restock locally.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const pharmacyLabel = PHARMACY_LABELS[data.pharmacyLevel];
  const headline = `${data.name}: ${pharmacyLabel}.`;

  return {
    country, countryName: data.name, pharmacyLevel: data.pharmacyLevel, pharmacyLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/pharmacy-checker/calculate
// @access Public
exports.calculatePharmacy = (req, res) => {
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
// @route POST /api/tools/pharmacy-checker/pdf
// @access Public
exports.generatePharmacyPdf = async (req, res) => {
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
      [email, firstName || null, 'pharmacy-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Pharmacy & Medication Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pharmacy-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.pharmacyLabel);

    pdfService.heading(doc, 'General pharmacy tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Pack a translated (or generic/chemical) name for any regular medication — brand names vary a lot by country, and pharmacists can help far more easily with the generic name.',
      'A photo of your prescription label or a doctor\'s letter on your phone is a fast way to explain what you need if there\'s a language barrier.',
      'For anything you can\'t risk running out of, bring the full amount for your trip plus several extra days — don\'t plan around restocking locally, even in "easy OTC access" destinations.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💊 Your ${result.countryName} pharmacy guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the pharmacy check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond medication access? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send pharmacy-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePharmacyPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
