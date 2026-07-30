const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Practical difficulty of resolving a lost/stolen passport per country.
// complexity: 'straightforward' (embassies well established, used to
// helping tourists with exactly this) | 'moderate' (workable, but
// consulate locations are limited outside the capital) | 'complex'
// (fewer consulate locations and more bureaucratic steps).
const COUNTRIES = {
  'united-states': { name: 'United States', complexity: 'straightforward', note: 'Most countries maintain consulates in several major US cities, not just Washington DC, so help is rarely far away.' },
  canada: { name: 'Canada', complexity: 'straightforward', note: 'Most consulates are concentrated in Ottawa, Toronto, and Vancouver — outside those, expect to coordinate remotely.' },
  'united-kingdom': { name: 'United Kingdom', complexity: 'straightforward', note: 'London has one of the highest concentrations of embassies in the world, making this one of the easiest places to resolve a lost passport.' },
  ireland: { name: 'Ireland', complexity: 'straightforward', note: 'Most consulates are in Dublin — well-practiced with tourists losing documents.' },
  france: { name: 'France', complexity: 'straightforward', note: 'Paris hosts nearly every country\'s embassy, and the process is well-established given high tourist volume.' },
  germany: { name: 'Germany', complexity: 'straightforward', note: 'Berlin hosts most embassies, with additional consulates in Frankfurt and Munich for many countries.' },
  italy: { name: 'Italy', complexity: 'straightforward', note: 'Rome hosts most embassies, with Milan as a common secondary consulate location — very well-practiced given tourist volume.' },
  spain: { name: 'Spain', complexity: 'straightforward', note: 'Madrid hosts most embassies, with Barcelona as a common secondary consulate — very well-practiced given tourist volume.' },
  netherlands: { name: 'Netherlands', complexity: 'straightforward', note: 'Consulates are concentrated in Amsterdam and The Hague.' },
  portugal: { name: 'Portugal', complexity: 'straightforward', note: 'Consulates are concentrated in Lisbon, with some secondary presence in Porto.' },
  greece: { name: 'Greece', complexity: 'moderate', note: 'Consulates are concentrated in Athens — if you lose your passport on an island, budget travel time to the mainland.' },
  austria: { name: 'Austria', complexity: 'straightforward', note: 'Vienna hosts a dense concentration of embassies.' },
  switzerland: { name: 'Switzerland', complexity: 'straightforward', note: 'Bern hosts most embassies, though Geneva also has significant international representation.' },
  poland: { name: 'Poland', complexity: 'straightforward', note: 'Consulates are concentrated in Warsaw.' },
  'czech-republic': { name: 'Czech Republic', complexity: 'straightforward', note: 'Prague hosts most embassies and is well-practiced given tourist volume.' },
  norway: { name: 'Norway', complexity: 'moderate', note: 'Consulates are concentrated in Oslo — outside the capital, expect to coordinate remotely.' },
  sweden: { name: 'Sweden', complexity: 'moderate', note: 'Consulates are concentrated in Stockholm — outside the capital, expect to coordinate remotely.' },
  denmark: { name: 'Denmark', complexity: 'moderate', note: 'Consulates are concentrated in Copenhagen.' },
  iceland: { name: 'Iceland', complexity: 'moderate', note: 'Very few countries maintain embassies in Reykjavik — many nationalities are served by the nearest Nordic embassy instead, which can add delay.' },

  thailand: { name: 'Thailand', complexity: 'straightforward', note: 'Bangkok hosts a dense concentration of embassies, and losing a passport is common enough among tourists that the process is well-practiced.' },
  vietnam: { name: 'Vietnam', complexity: 'moderate', note: 'Embassies are concentrated in Hanoi, with some consulates in Ho Chi Minh City — outside those two cities, expect to travel.' },
  indonesia: { name: 'Indonesia', complexity: 'moderate', note: "Jakarta hosts most embassies; some countries also have a consulate in Bali given tourist volume, but check before assuming one exists." },
  philippines: { name: 'Philippines', complexity: 'moderate', note: 'Embassies are concentrated in Manila — outside the capital, expect to coordinate remotely and travel.' },
  malaysia: { name: 'Malaysia', complexity: 'straightforward', note: 'Kuala Lumpur hosts a wide range of embassies.' },
  singapore: { name: 'Singapore', complexity: 'straightforward', note: "Singapore's small size means the process is unusually fast and centralized." },
  china: { name: 'China', complexity: 'complex', note: 'Exit formalities can be more bureaucratic than elsewhere, and you may need police clearance in addition to embassy paperwork before departing — budget extra time.' },
  india: { name: 'India', complexity: 'moderate', note: 'Embassies are concentrated in New Delhi, with consulates in Mumbai and a few other major cities — bureaucratic steps can take longer than in some countries.' },
  japan: { name: 'Japan', complexity: 'straightforward', note: 'Tokyo hosts most embassies, and the process is efficient and well-organized.' },
  'south-korea': { name: 'South Korea', complexity: 'straightforward', note: 'Seoul hosts most embassies, and the process is efficient and well-organized.' },
  cambodia: { name: 'Cambodia', complexity: 'complex', note: 'Fewer countries maintain embassies in Phnom Penh — some nationalities need to coordinate with the nearest embassy in Bangkok or Hanoi instead.' },
  myanmar: { name: 'Myanmar', complexity: 'complex', note: 'Fewer countries maintain embassies in Yangon — some nationalities need to coordinate with a regional embassy instead, adding delay.' },

  mexico: { name: 'Mexico', complexity: 'straightforward', note: 'Mexico City hosts most embassies, with consulates in several other major cities and tourist areas given high visitor volume.' },
  brazil: { name: 'Brazil', complexity: 'moderate', note: 'Embassies are concentrated in Brasília, with consulates in Rio de Janeiro and São Paulo for many countries.' },
  argentina: { name: 'Argentina', complexity: 'moderate', note: 'Consulates are concentrated in Buenos Aires — outside the capital, expect to coordinate remotely.' },
  chile: { name: 'Chile', complexity: 'moderate', note: 'Consulates are concentrated in Santiago.' },
  colombia: { name: 'Colombia', complexity: 'moderate', note: 'Consulates are concentrated in Bogotá.' },
  peru: { name: 'Peru', complexity: 'moderate', note: 'Consulates are concentrated in Lima — if you lose your passport near Cusco or Machu Picchu, budget travel time to the capital.' },
  'costa-rica': { name: 'Costa Rica', complexity: 'moderate', note: 'Consulates are concentrated in San José.' },

  turkey: { name: 'Turkey', complexity: 'moderate', note: 'Embassies are concentrated in Ankara, with consulates in Istanbul for many countries — the process is generally efficient given tourist volume.' },
  israel: { name: 'Israel', complexity: 'straightforward', note: 'Consulates are concentrated in Tel Aviv and Jerusalem.' },
  'united-arab-emirates': { name: 'United Arab Emirates', complexity: 'straightforward', note: 'Both Dubai and Abu Dhabi host significant consular presence given high tourist and business travel volume.' },
  'saudi-arabia': { name: 'Saudi Arabia', complexity: 'complex', note: 'Consular services can involve more formal procedures than in many countries — start the process as early as possible.' },
  egypt: { name: 'Egypt', complexity: 'moderate', note: 'Embassies are concentrated in Cairo — if you lose your passport elsewhere (Luxor, Sharm El Sheikh), budget travel time or plan to coordinate remotely.' },
  morocco: { name: 'Morocco', complexity: 'moderate', note: 'Embassies are concentrated in Rabat, with some consulates in Casablanca — the process is generally manageable.' },
  kenya: { name: 'Kenya', complexity: 'moderate', note: 'Consulates are concentrated in Nairobi — if you lose your passport on safari or at the coast, budget travel time.' },
  'south-africa': { name: 'South Africa', complexity: 'straightforward', note: 'Pretoria hosts most embassies, with consulates in Cape Town and Johannesburg for many countries.' },
  nigeria: { name: 'Nigeria', complexity: 'complex', note: 'Consulates are concentrated in Abuja and Lagos, and bureaucratic steps can take longer than in many countries.' },

  australia: { name: 'Australia', complexity: 'straightforward', note: 'Canberra hosts most embassies, with consulates in Sydney and Melbourne for many countries given tourist volume.' },
  'new-zealand': { name: 'New Zealand', complexity: 'moderate', note: 'Consulates are concentrated in Wellington and Auckland — fewer countries maintain a full embassy given the smaller population.' },
};

const COMPLEXITY_LABELS = {
  straightforward: 'straightforward to resolve — embassies and consulates here are well established and used to helping tourists with exactly this situation',
  moderate: 'workable but takes some patience — consulate locations are more limited outside the capital, so budget extra time',
  complex: 'more complex than usual — fewer consulate locations and more bureaucratic steps mean this can take longer than in most countries',
};

// Universal best-practice steps — the same regardless of country, since
// this is the core process every embassy follows for a lost/stolen passport.
const UNIVERSAL_STEPS = [
  'Report the loss or theft to the local police and get a written police report — most embassies require this before issuing a replacement or emergency travel document.',
  "Contact your country's nearest embassy or consulate as soon as possible — most have a 24-hour emergency line for exactly this situation, even outside office hours.",
  'Ask about an Emergency Travel Document (sometimes called an emergency passport) if you need to travel before a full replacement can be issued — these are typically valid for a single trip home.',
  "Keep a digital copy of your passport's photo page (email it to yourself, or store it in cloud storage) before you travel — it significantly speeds up the replacement process.",
];

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `Losing your passport in ${data.name} is generally ${COMPLEXITY_LABELS[data.complexity]}.`;

  return {
    country, countryName: data.name, complexity: data.complexity, complexityLabel: COMPLEXITY_LABELS[data.complexity],
    note: data.note, steps: UNIVERSAL_STEPS, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/lost-passport-checker/calculate
// @access Public
exports.calculateLostPassport = (req, res) => {
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
// @route POST /api/tools/lost-passport-checker/pdf
// @access Public
exports.generateLostPassportPdf = async (req, res) => {
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
      [email, firstName || null, 'lost-passport-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Lost Passport Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="lost-passport-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, result.complexityLabel);

    pdfService.heading(doc, 'What to do, step by step');
    pdfService.bulletList(doc, result.steps);

    pdfService.heading(doc, 'Before you travel');
    pdfService.bulletList(doc, [
      "Save your embassy's emergency contact number in your phone before you travel, not after you need it.",
      'Consider carrying a physical photocopy of your passport\'s photo page separately from the passport itself, in a different bag.',
      'Check whether your destination requires an exit visa or police clearance for a lost/stolen document specifically — this varies and can add processing time if you don\'t know in advance.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛂 Your ${result.countryName} lost passport guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your lost passport guide for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond emergency prep? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send lost-passport-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateLostPassportPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
