const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Zika virus risk and other pregnancy-relevant travel considerations per
// destination — distinct from healthController.js, which covers general
// vaccine/malaria advisory for all travelers, not the specific elevated-
// risk lens pregnant travelers need. Zika infection during pregnancy is
// linked to serious birth defects, and CDC/WHO guidance has historically
// recommended pregnant travelers avoid or take extra precautions in
// affected areas. riskLevel: 'minimal' (no established local Zika
// transmission risk) | 'low' (limited or historical local transmission,
// standard mosquito-bite precautions apply) | 'elevated' (an area with
// a documented history of local Zika transmission — CDC has recommended
// pregnant travelers reconsider travel or take strict precautions).
// This is deliberately general orientation, not real-time data — risk
// maps change, and every result, PDF, and email carries a disclaimer
// pointing to the CDC and your own OB/GYN for current guidance.
const COUNTRIES = {
  france: { name: 'France', riskLevel: 'minimal', note: 'No established local Zika transmission risk. Standard prenatal travel precautions apply as they would for any trip.' },
  austria: { name: 'Austria', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  'czech-republic': { name: 'Czech Republic', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  denmark: { name: 'Denmark', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  germany: { name: 'Germany', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  greece: { name: 'Greece', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  hungary: { name: 'Hungary', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  iceland: { name: 'Iceland', riskLevel: 'minimal', note: 'No established local Zika transmission risk — and no mosquitoes at all, a genuine rarity.' },
  italy: { name: 'Italy', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  netherlands: { name: 'Netherlands', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  portugal: { name: 'Portugal', riskLevel: 'minimal', note: 'No established local Zika transmission risk, though Madeira has documented dengue transmission (a related mosquito-borne concern) — check current guidance if visiting there specifically.' },
  spain: { name: 'Spain', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  sweden: { name: 'Sweden', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  switzerland: { name: 'Switzerland', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  ireland: { name: 'Ireland', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  'united-kingdom': { name: 'United Kingdom', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  turkey: { name: 'Turkey', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  japan: { name: 'Japan', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  thailand: { name: 'Thailand', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  indonesia: { name: 'Indonesia', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  singapore: { name: 'Singapore', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically, though well-controlled — standard strict mosquito-bite precautions are still recommended for pregnant travelers.' },
  'south-korea': { name: 'South Korea', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  'hong-kong': { name: 'Hong Kong', riskLevel: 'low', note: 'No established local Zika transmission, but the region borders areas with documented risk — standard mosquito-bite precautions are still worth taking.' },
  vietnam: { name: 'Vietnam', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  philippines: { name: 'Philippines', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  malaysia: { name: 'Malaysia', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  china: { name: 'China', riskLevel: 'low', note: 'Established local transmission risk is generally low, though southern provinces share mosquito species present in higher-risk regions — standard precautions apply.' },
  india: { name: 'India', riskLevel: 'elevated', note: 'A documented history of local Zika transmission in parts of the country — CDC has recommended pregnant travelers discuss any trip here with their doctor and use strict mosquito-bite precautions throughout.' },
  maldives: { name: 'Maldives', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers, even at resort islands.' },
  taiwan: { name: 'Taiwan', riskLevel: 'low', note: 'No established local Zika transmission, though the region shares mosquito species present in higher-risk areas — standard precautions apply.' },
  'sri-lanka': { name: 'Sri Lanka', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  cambodia: { name: 'Cambodia', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  australia: { name: 'Australia', riskLevel: 'minimal', note: 'No established local Zika transmission risk in tourist areas — isolated travel-related cases have occurred but there is no ongoing local spread.' },
  'new-zealand': { name: 'New Zealand', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  fiji: { name: 'Fiji', riskLevel: 'elevated', note: 'Fiji had a documented Zika outbreak in 2015-2016 — CDC has recommended pregnant travelers discuss any trip here with their doctor and use strict mosquito-bite precautions throughout.' },
  'french-polynesia': { name: 'French Polynesia', riskLevel: 'elevated', note: "French Polynesia was the site of a major, well-documented Zika outbreak in 2013-2014, one of the events that helped identify the virus's link to birth defects — CDC has recommended pregnant travelers discuss any trip here with their doctor and use strict mosquito-bite precautions throughout." },
  mexico: { name: 'Mexico', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel, especially to coastal and southern regions.' },
  'dominican-republic': { name: 'Dominican Republic', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  'puerto-rico': { name: 'Puerto Rico', riskLevel: 'elevated', note: "Puerto Rico was the site of one of the most significant documented Zika outbreaks during 2016, prompting strong CDC travel guidance for pregnant travelers at the time — confirm current risk status before you go, since this can change." },
  bahamas: { name: 'Bahamas', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  jamaica: { name: 'Jamaica', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  aruba: { name: 'Aruba', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  'turks-and-caicos': { name: 'Turks and Caicos', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  'st-lucia': { name: 'St. Lucia', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  'costa-rica': { name: 'Costa Rica', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  panama: { name: 'Panama', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  belize: { name: 'Belize', riskLevel: 'elevated', note: 'A documented history of local Zika transmission — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel.' },
  'cayman-islands': { name: 'Cayman Islands', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  curacao: { name: 'Curaçao', riskLevel: 'low', note: 'Limited local Zika transmission has been reported historically — standard strict mosquito-bite precautions are recommended for pregnant travelers.' },
  canada: { name: 'Canada', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  'united-arab-emirates': { name: 'United Arab Emirates', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  morocco: { name: 'Morocco', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  'south-africa': { name: 'South Africa', riskLevel: 'low', note: 'No established local Zika transmission in most tourist areas, though standard mosquito-bite precautions are worth taking, especially near the Kruger/Mpumalanga malaria-risk region, which carries its own separate pregnancy-specific concern (malaria in pregnancy can be severe) — discuss with your doctor if your itinerary includes it.' },
  qatar: { name: 'Qatar', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  israel: { name: 'Israel', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  tanzania: { name: 'Tanzania', riskLevel: 'elevated', note: "A documented history of local Zika transmission, and note this is also a malaria-risk destination — malaria in pregnancy can be severe for both mother and baby, so this combination deserves a dedicated conversation with your doctor well before you travel." },
  kenya: { name: 'Kenya', riskLevel: 'elevated', note: "A documented history of local Zika transmission, and note this is also a malaria-risk destination — malaria in pregnancy can be severe for both mother and baby, so this combination deserves a dedicated conversation with your doctor well before you travel." },
  argentina: { name: 'Argentina', riskLevel: 'elevated', note: 'A documented history of local Zika transmission in northern provinces — CDC has recommended pregnant travelers discuss any trip here with their doctor if visiting those regions, and use strict mosquito-bite precautions.' },
  peru: { name: 'Peru', riskLevel: 'elevated', note: "A documented history of local Zika transmission in lower-altitude regions. Separately, if your itinerary includes Cusco or Machu Picchu, the high altitude (over 11,000 feet in Cusco) is its own distinct pregnancy consideration worth discussing with your doctor, independent of Zika risk." },
  chile: { name: 'Chile', riskLevel: 'minimal', note: 'No established local Zika transmission risk.' },
  colombia: { name: 'Colombia', riskLevel: 'elevated', note: "A documented history of local Zika transmission, particularly significant during the 2015-2016 outbreak — CDC has recommended pregnant travelers discuss any trip here with their doctor. Bogotá's high altitude (over 8,600 feet) is a separate consideration if that's part of your itinerary." },
  brazil: { name: 'Brazil', riskLevel: 'elevated', note: "Brazil was the origin point of the major 2015-2016 Zika outbreak and the country where the link to birth defects was first identified — CDC has recommended pregnant travelers discuss any trip here with their doctor, use strict mosquito-bite precautions throughout, and consider postponing non-essential travel." },
  'united-states': { name: 'United States', riskLevel: 'minimal', note: 'No established ongoing local Zika transmission — isolated local transmission occurred in parts of southern Florida and Texas in past years but has not recurred; confirm current status if traveling to those specific areas.' },
};

const RISK_LABELS = {
  minimal: 'Minimal Risk',
  low: 'Low Risk — Standard Precautions',
  elevated: 'Elevated Risk — Talk to Your Doctor',
};

const DISCLAIMER = "This is general orientation on Zika risk, not real-time data or medical advice — risk areas change, and every pregnancy is different. Always check the CDC's current Zika travel guidance and discuss any trip with your own OB/GYN before you book, especially for destinations marked elevated or low risk.";

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
// @route POST /api/tools/pregnancy-travel-checker/calculate
// @access Public
exports.calculatePregnancyTravel = (req, res) => {
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
// @route POST /api/tools/pregnancy-travel-checker/pdf
// @access Public
exports.generatePregnancyTravelPdf = async (req, res) => {
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
      [email, firstName || null, 'pregnancy-travel-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Pregnancy Travel Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pregnancy-travel-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.riskLabel);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Talk to your OB/GYN before booking any trip during pregnancy, not just to destinations flagged here — they know your specific situation.',
      'Most airlines restrict flying after a certain point in pregnancy (commonly around 36 weeks for domestic, earlier for international) — check your specific airline\'s policy and consider a doctor\'s letter for later-term travel.',
      'Travel insurance that explicitly covers pregnancy-related complications is worth the extra cost — standard policies often exclude them.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🤰 Your ${result.countryName} pregnancy travel check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the pregnancy travel check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond health prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send pregnancy-travel-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePregnancyTravelPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
