const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// US/Canada standard for comparison: plug types A/B, 120V, 60Hz.
const US_PLUG_TYPES = ['A', 'B'];
const US_VOLTAGE = 120;

const PLUG_TYPE_DESCRIPTIONS = {
  A: 'flat parallel pins, ungrounded (US/Canada/Japan style)',
  B: 'flat parallel pins plus a round ground pin (US/Canada style)',
  C: 'two round pins, ungrounded ("Europlug")',
  D: 'three round pins in a large triangle (older Indian style)',
  E: 'two round pins plus a female ground hole (French style)',
  F: 'two round pins plus two ground clips ("Schuko", German style)',
  G: 'three rectangular pins (UK/Ireland/Singapore/Hong Kong style)',
  H: 'three flat pins in a triangle (Israeli style)',
  I: 'two flat angled pins (Australia/NZ/China style)',
  J: 'three round pins (Swiss style)',
  K: 'two round pins plus a round ground pin (Danish style)',
  L: 'three round pins in a line (Italian/Chilean style)',
  M: 'three large round pins (South African style)',
  N: 'three round pins, Brazilian/newer South African style',
};

// Reused country list from Tool #3 (Visa Requirement Checker).
const COUNTRIES = {
  france: { name: 'France', plugTypes: ['C', 'E'], voltage: 230, frequency: 50 },
  austria: { name: 'Austria', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  'czech-republic': { name: 'Czech Republic', plugTypes: ['C', 'E'], voltage: 230, frequency: 50 },
  denmark: { name: 'Denmark', plugTypes: ['C', 'K'], voltage: 230, frequency: 50 },
  germany: { name: 'Germany', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  greece: { name: 'Greece', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  hungary: { name: 'Hungary', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  iceland: { name: 'Iceland', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  italy: { name: 'Italy', plugTypes: ['C', 'F', 'L'], voltage: 230, frequency: 50 },
  netherlands: { name: 'Netherlands', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  portugal: { name: 'Portugal', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  spain: { name: 'Spain', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  sweden: { name: 'Sweden', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  switzerland: { name: 'Switzerland', plugTypes: ['C', 'J'], voltage: 230, frequency: 50 },
  ireland: { name: 'Ireland', plugTypes: ['G'], voltage: 230, frequency: 50 },
  'united-kingdom': { name: 'United Kingdom', plugTypes: ['G'], voltage: 230, frequency: 50 },
  turkey: { name: 'Turkey', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  japan: { name: 'Japan', plugTypes: ['A', 'B'], voltage: 100, frequency: 50 },
  thailand: { name: 'Thailand', plugTypes: ['A', 'C', 'O'], voltage: 220, frequency: 50 },
  indonesia: { name: 'Indonesia', plugTypes: ['C', 'F'], voltage: 230, frequency: 50 },
  singapore: { name: 'Singapore', plugTypes: ['G'], voltage: 230, frequency: 50 },
  'south-korea': { name: 'South Korea', plugTypes: ['C', 'F'], voltage: 220, frequency: 60 },
  'hong-kong': { name: 'Hong Kong', plugTypes: ['G'], voltage: 220, frequency: 50 },
  vietnam: { name: 'Vietnam', plugTypes: ['A', 'C'], voltage: 220, frequency: 50 },
  philippines: { name: 'Philippines', plugTypes: ['A', 'B', 'C'], voltage: 220, frequency: 60 },
  malaysia: { name: 'Malaysia', plugTypes: ['G'], voltage: 240, frequency: 50 },
  china: { name: 'China', plugTypes: ['A', 'C', 'I'], voltage: 220, frequency: 50 },
  india: { name: 'India', plugTypes: ['C', 'D', 'M'], voltage: 230, frequency: 50 },
  maldives: { name: 'Maldives', plugTypes: ['G', 'D'], voltage: 230, frequency: 50 },
  taiwan: { name: 'Taiwan', plugTypes: ['A', 'B'], voltage: 110, frequency: 60 },
  'sri-lanka': { name: 'Sri Lanka', plugTypes: ['D', 'G', 'M'], voltage: 230, frequency: 50 },
  cambodia: { name: 'Cambodia', plugTypes: ['A', 'C', 'G'], voltage: 230, frequency: 50 },
  australia: { name: 'Australia', plugTypes: ['I'], voltage: 230, frequency: 50 },
  'new-zealand': { name: 'New Zealand', plugTypes: ['I'], voltage: 230, frequency: 50 },
  fiji: { name: 'Fiji', plugTypes: ['I'], voltage: 240, frequency: 50 },
  'french-polynesia': { name: 'French Polynesia', plugTypes: ['E'], voltage: 220, frequency: 60 },
  mexico: { name: 'Mexico', plugTypes: ['A', 'B'], voltage: 127, frequency: 60 },
  'dominican-republic': { name: 'Dominican Republic', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  'puerto-rico': { name: 'Puerto Rico', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  bahamas: { name: 'Bahamas', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  jamaica: { name: 'Jamaica', plugTypes: ['A', 'B'], voltage: 110, frequency: 50 },
  aruba: { name: 'Aruba', plugTypes: ['A', 'B', 'F'], voltage: 127, frequency: 60 },
  'turks-and-caicos': { name: 'Turks and Caicos', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  'st-lucia': { name: 'St. Lucia', plugTypes: ['G'], voltage: 240, frequency: 50 },
  'costa-rica': { name: 'Costa Rica', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  panama: { name: 'Panama', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  belize: { name: 'Belize', plugTypes: ['A', 'B', 'G'], voltage: 110, frequency: 60 },
  'cayman-islands': { name: 'Cayman Islands', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', plugTypes: ['A', 'B'], voltage: 230, frequency: 60 },
  curacao: { name: 'Curaçao', plugTypes: ['A', 'B', 'F'], voltage: 127, frequency: 50 },
  canada: { name: 'Canada', plugTypes: ['A', 'B'], voltage: 120, frequency: 60 },
  'united-arab-emirates': { name: 'United Arab Emirates', plugTypes: ['C', 'G'], voltage: 230, frequency: 50 },
  morocco: { name: 'Morocco', plugTypes: ['C', 'E'], voltage: 220, frequency: 50 },
  'south-africa': { name: 'South Africa', plugTypes: ['M', 'N'], voltage: 230, frequency: 50 },
  qatar: { name: 'Qatar', plugTypes: ['D', 'G'], voltage: 240, frequency: 50 },
  israel: { name: 'Israel', plugTypes: ['C', 'H'], voltage: 230, frequency: 50 },
  tanzania: { name: 'Tanzania', plugTypes: ['D', 'G'], voltage: 230, frequency: 50 },
  kenya: { name: 'Kenya', plugTypes: ['G'], voltage: 240, frequency: 50 },
  argentina: { name: 'Argentina', plugTypes: ['C', 'I'], voltage: 220, frequency: 50 },
  peru: { name: 'Peru', plugTypes: ['A', 'B', 'C'], voltage: 220, frequency: 60 },
  chile: { name: 'Chile', plugTypes: ['C', 'L'], voltage: 220, frequency: 50 },
  colombia: { name: 'Colombia', plugTypes: ['A', 'B'], voltage: 110, frequency: 60 },
  brazil: { name: 'Brazil', plugTypes: ['C', 'N'], voltage: 127, frequency: 60, voltageNote: 'Voltage varies by region in Brazil — some areas run 127V, others 220V. Check the specific city on your itinerary.' },
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const needsAdapter = !data.plugTypes.some(t => US_PLUG_TYPES.includes(t));
  const voltageDiffersSubstantially = Math.abs(data.voltage - US_VOLTAGE) > 20;

  let headline;
  if (!needsAdapter && !voltageDiffersSubstantially) {
    headline = `${data.name} uses the same plug type and a similar voltage to the US — no adapter needed.`;
  } else if (!needsAdapter && voltageDiffersSubstantially) {
    headline = `${data.name} uses the same plug shape as the US, but runs on ${data.voltage}V — check your device's voltage rating.`;
  } else if (needsAdapter && !voltageDiffersSubstantially) {
    headline = `${data.name} uses a different plug shape than the US (Type ${data.plugTypes.join('/')}) — you'll need a plug adapter, but voltage is close enough that a converter usually isn't needed.`;
  } else {
    headline = `${data.name} uses a different plug shape (Type ${data.plugTypes.join('/')}) and runs on ${data.voltage}V — you'll need a plug adapter, and possibly a voltage converter for single-voltage devices.`;
  }

  return {
    country, countryName: data.name,
    plugTypes: data.plugTypes,
    plugDescriptions: data.plugTypes.map(t => `Type ${t}: ${PLUG_TYPE_DESCRIPTIONS[t] || ''}`),
    voltage: data.voltage, frequency: data.frequency,
    needsAdapter, voltageDiffersSubstantially,
    voltageNote: data.voltageNote || null,
    headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/plug-checker/calculate
// @access Public
exports.calculatePlugRequirement = (req, res) => {
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
// @route POST /api/tools/plug-checker/pdf
// @access Public
exports.generatePlugPdf = async (req, res) => {
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
      [email, firstName || null, 'power-plug-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Power Plug & Voltage Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="power-plug-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `${result.countryName} runs on ${result.voltage}V at ${result.frequency}Hz, using plug type${result.plugTypes.length > 1 ? 's' : ''}: ${result.plugTypes.join(', ')}.`);
    if (result.voltageNote) pdfService.paragraph(doc, result.voltageNote);

    pdfService.highlightBox(doc, result.needsAdapter ? 'You need a plug adapter for this destination.' : 'No plug adapter needed — same plug shape as the US.');

    pdfService.heading(doc, 'Plug types used');
    pdfService.bulletList(doc, result.plugDescriptions);

    pdfService.heading(doc, 'Adapter vs. converter — what you actually need');
    pdfService.paragraph(doc, 'A plug adapter only changes the shape of the plug so it fits the outlet — it does not change the voltage. Most modern electronics (phone chargers, laptop chargers, camera chargers) are dual-voltage (100-240V) and only need an adapter. Single-voltage, high-wattage devices like hair dryers, straighteners, and some electric razors may need an actual voltage converter, not just an adapter — check the fine print on the device or its charger, usually printed near the plug prongs.');

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🔌 Your ${result.countryName} power plug & voltage guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your power plug check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond packing logistics? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send plug-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generatePlugPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
