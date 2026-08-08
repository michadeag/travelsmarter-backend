const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Estimated mid-range daily budget per person in USD (accommodation, food,
// local transport, and some activities — excludes international flights).
// Reused destination list from Tool #1.
const DESTINATIONS = {
  paris: { name: 'Paris', dailyMidRange: 180 }, london: { name: 'London', dailyMidRange: 200 },
  rome: { name: 'Rome', dailyMidRange: 130 }, barcelona: { name: 'Barcelona', dailyMidRange: 120 },
  amsterdam: { name: 'Amsterdam', dailyMidRange: 170 }, lisbon: { name: 'Lisbon', dailyMidRange: 100 },
  dublin: { name: 'Dublin', dailyMidRange: 160 }, athens: { name: 'Athens', dailyMidRange: 100 },
  reykjavik: { name: 'Reykjavik', dailyMidRange: 220 }, madrid: { name: 'Madrid', dailyMidRange: 110 },
  venice: { name: 'Venice', dailyMidRange: 150 }, prague: { name: 'Prague', dailyMidRange: 80 },
  vienna: { name: 'Vienna', dailyMidRange: 140 }, berlin: { name: 'Berlin', dailyMidRange: 120 },
  santorini: { name: 'Santorini', dailyMidRange: 160 }, zurich: { name: 'Zurich', dailyMidRange: 220 },
  munich: { name: 'Munich', dailyMidRange: 150 }, milan: { name: 'Milan', dailyMidRange: 140 },
  copenhagen: { name: 'Copenhagen', dailyMidRange: 190 }, stockholm: { name: 'Stockholm', dailyMidRange: 180 },
  budapest: { name: 'Budapest', dailyMidRange: 75 }, istanbul: { name: 'Istanbul', dailyMidRange: 70 },
  edinburgh: { name: 'Edinburgh', dailyMidRange: 150 }, nice: { name: 'Nice', dailyMidRange: 160 },
  tokyo: { name: 'Tokyo', dailyMidRange: 150 }, bangkok: { name: 'Bangkok', dailyMidRange: 60 },
  bali: { name: 'Bali', dailyMidRange: 65 }, singapore: { name: 'Singapore', dailyMidRange: 160 },
  seoul: { name: 'Seoul', dailyMidRange: 120 }, 'hong-kong': { name: 'Hong Kong', dailyMidRange: 140 },
  sydney: { name: 'Sydney', dailyMidRange: 170 }, auckland: { name: 'Auckland', dailyMidRange: 160 },
  'ho-chi-minh-city': { name: 'Ho Chi Minh City', dailyMidRange: 45 }, manila: { name: 'Manila', dailyMidRange: 55 },
  phuket: { name: 'Phuket', dailyMidRange: 65 }, 'kuala-lumpur': { name: 'Kuala Lumpur', dailyMidRange: 55 },
  beijing: { name: 'Beijing', dailyMidRange: 90 }, delhi: { name: 'Delhi', dailyMidRange: 45 },
  maldives: { name: 'Maldives', dailyMidRange: 350 }, taipei: { name: 'Taipei', dailyMidRange: 80 },
  colombo: { name: 'Colombo', dailyMidRange: 50 }, 'siem-reap': { name: 'Siem Reap', dailyMidRange: 45 },
  fiji: { name: 'Fiji', dailyMidRange: 180 }, 'bora-bora': { name: 'Bora Bora', dailyMidRange: 400 },
  cancun: { name: 'Cancún', dailyMidRange: 130 }, 'punta-cana': { name: 'Punta Cana', dailyMidRange: 140 },
  'san-juan': { name: 'San Juan', dailyMidRange: 150 }, nassau: { name: 'Nassau', dailyMidRange: 170 },
  'montego-bay': { name: 'Montego Bay', dailyMidRange: 130 }, 'cabo-san-lucas': { name: 'Cabo San Lucas', dailyMidRange: 150 },
  aruba: { name: 'Aruba', dailyMidRange: 160 }, 'turks-and-caicos': { name: 'Turks and Caicos', dailyMidRange: 220 },
  'st-lucia': { name: 'St. Lucia', dailyMidRange: 180 }, 'san-jose-costa-rica': { name: 'San José', dailyMidRange: 90 },
  'panama-city': { name: 'Panama City', dailyMidRange: 90 }, 'belize-city': { name: 'Belize City', dailyMidRange: 80 },
  'grand-cayman': { name: 'Grand Cayman', dailyMidRange: 220 }, antigua: { name: 'Antigua', dailyMidRange: 180 },
  curacao: { name: 'Curaçao', dailyMidRange: 150 },
  vancouver: { name: 'Vancouver', dailyMidRange: 160 }, toronto: { name: 'Toronto', dailyMidRange: 170 },
  montreal: { name: 'Montreal', dailyMidRange: 150 }, 'quebec-city': { name: 'Quebec City', dailyMidRange: 140 },
  calgary: { name: 'Calgary', dailyMidRange: 150 },
  dubai: { name: 'Dubai', dailyMidRange: 200 }, marrakech: { name: 'Marrakech', dailyMidRange: 60 },
  'cape-town': { name: 'Cape Town', dailyMidRange: 90 }, doha: { name: 'Doha', dailyMidRange: 190 },
  'tel-aviv': { name: 'Tel Aviv', dailyMidRange: 170 }, 'abu-dhabi': { name: 'Abu Dhabi', dailyMidRange: 190 },
  zanzibar: { name: 'Zanzibar', dailyMidRange: 90 }, nairobi: { name: 'Nairobi', dailyMidRange: 70 },
  casablanca: { name: 'Casablanca', dailyMidRange: 65 },
  'rio-de-janeiro': { name: 'Rio de Janeiro', dailyMidRange: 90 }, 'buenos-aires': { name: 'Buenos Aires', dailyMidRange: 70 },
  bogota: { name: 'Bogotá', dailyMidRange: 55 }, lima: { name: 'Lima', dailyMidRange: 60 },
  cusco: { name: 'Cusco', dailyMidRange: 55 }, santiago: { name: 'Santiago', dailyMidRange: 90 },
  cartagena: { name: 'Cartagena', dailyMidRange: 65 },
};

const STYLE_MULTIPLIERS = { budget: 0.5, 'mid-range': 1.0, luxury: 2.75 };
const STYLE_LABELS = { budget: 'Budget', 'mid-range': 'Mid-range', luxury: 'Luxury' };

// Typical share of daily spend by category.
const BREAKDOWN_SHARE = { accommodation: 0.40, food: 0.25, transport: 0.15, activities: 0.20 };

function computeResult({ destination, days, style }) {
  const dest = DESTINATIONS[destination];
  if (!dest) throw new Error('Unknown destination');
  const d = Number(days);
  if (!Number.isFinite(d) || d < 1) throw new Error('days must be a positive number');
  const s = STYLE_MULTIPLIERS[style] ? style : 'mid-range';

  const dailyCost = Math.round(dest.dailyMidRange * STYLE_MULTIPLIERS[s]);
  const totalCost = dailyCost * d;

  const breakdown = Object.fromEntries(
    Object.entries(BREAKDOWN_SHARE).map(([cat, share]) => [
      cat,
      { daily: Math.round(dailyCost * share), total: Math.round(dailyCost * share * d) },
    ])
  );

  const headline = `A ${d}-day ${STYLE_LABELS[s].toLowerCase()} trip to ${dest.name} costs roughly $${totalCost.toLocaleString('en-US')} per person ($${dailyCost}/day).`;

  return {
    destination, destinationName: dest.name, days: d, style: s, styleLabel: STYLE_LABELS[s],
    dailyCost, totalCost, breakdown, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/budget-calculator/calculate
// @access Public
exports.calculateBudget = (req, res) => {
  try {
    const { destination, days, style } = req.body;
    if (!destination || !days) return res.status(400).json({ success: false, error: 'destination and days are required' });
    const result = computeResult({ destination, days, style });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF budget breakdown, send confirmation email
// @route POST /api/tools/budget-calculator/pdf
// @access Public
exports.generateBudgetPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, destination, days, style } = req.body;
    if (!email || !destination || !days) {
      return res.status(400).json({ success: false, error: 'email, destination, and days are required' });
    }

    const result = computeResult({ destination, days, style });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'travel-budget-calculator',
        JSON.stringify({ destination, days, style }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.destinationName} Travel Budget — ${result.days} Days`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="travel-budget-calculator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `This estimate covers accommodation, food, local transport, and activities for one person on a ${result.styleLabel.toLowerCase()} travel style — it does not include international flights.`);

    pdfService.highlightBox(doc, `Total estimate: $${result.totalCost.toLocaleString('en-US')} ($${result.dailyCost}/day x ${result.days} days)`);

    pdfService.heading(doc, 'Daily budget breakdown');
    pdfService.bulletList(doc, Object.entries(result.breakdown).map(([cat, v]) =>
      `${cat.charAt(0).toUpperCase() + cat.slice(1)}: $${v.daily}/day ($${v.total} total)`
    ));

    pdfService.heading(doc, 'How to spend less than this estimate');
    pdfService.bulletList(doc, [
      'Book accommodation and flights within the optimal booking window instead of last-minute — timing alone often saves 15-30%.',
      'Eat where locals eat, away from major tourist landmarks, for meals that cost a fraction of restaurant-row prices.',
      'Use local public transport instead of taxis/rideshares for most trips.',
      'Mix free activities (walking tours, parks, viewpoints) with a few paid highlights rather than paying for everything.',
    ]);

    pdfService.addFooterCTA(doc, destination);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💰 Your ${result.destinationName} travel budget estimate`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your travel budget estimate:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and money-saving hacks that go beyond budgeting? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${destination}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send budget-calculator confirmation email:', err.message));

  } catch (error) {
    console.error('generateBudgetPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.DESTINATIONS = DESTINATIONS;
