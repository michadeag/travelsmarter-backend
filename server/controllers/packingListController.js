const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Dominant climate per destination, reused from the Tool #1 city list.
// One of: tropical, desert, mediterranean, temperate, cold.
const DESTINATIONS = {
  paris: { name: 'Paris', climate: 'temperate' }, london: { name: 'London', climate: 'temperate' },
  rome: { name: 'Rome', climate: 'mediterranean' }, barcelona: { name: 'Barcelona', climate: 'mediterranean' },
  amsterdam: { name: 'Amsterdam', climate: 'temperate' }, lisbon: { name: 'Lisbon', climate: 'mediterranean' },
  dublin: { name: 'Dublin', climate: 'temperate' }, athens: { name: 'Athens', climate: 'mediterranean' },
  reykjavik: { name: 'Reykjavik', climate: 'cold' }, madrid: { name: 'Madrid', climate: 'mediterranean' },
  venice: { name: 'Venice', climate: 'mediterranean' }, prague: { name: 'Prague', climate: 'temperate' },
  vienna: { name: 'Vienna', climate: 'temperate' }, berlin: { name: 'Berlin', climate: 'temperate' },
  santorini: { name: 'Santorini', climate: 'mediterranean' }, zurich: { name: 'Zurich', climate: 'temperate' },
  munich: { name: 'Munich', climate: 'temperate' }, milan: { name: 'Milan', climate: 'mediterranean' },
  copenhagen: { name: 'Copenhagen', climate: 'temperate' }, stockholm: { name: 'Stockholm', climate: 'temperate' },
  budapest: { name: 'Budapest', climate: 'temperate' }, istanbul: { name: 'Istanbul', climate: 'temperate' },
  edinburgh: { name: 'Edinburgh', climate: 'temperate' }, nice: { name: 'Nice', climate: 'mediterranean' },
  tokyo: { name: 'Tokyo', climate: 'temperate' }, bangkok: { name: 'Bangkok', climate: 'tropical' },
  bali: { name: 'Bali', climate: 'tropical' }, singapore: { name: 'Singapore', climate: 'tropical' },
  seoul: { name: 'Seoul', climate: 'temperate' }, 'hong-kong': { name: 'Hong Kong', climate: 'temperate' },
  sydney: { name: 'Sydney', climate: 'mediterranean' }, auckland: { name: 'Auckland', climate: 'temperate' },
  'ho-chi-minh-city': { name: 'Ho Chi Minh City', climate: 'tropical' }, manila: { name: 'Manila', climate: 'tropical' },
  phuket: { name: 'Phuket', climate: 'tropical' }, 'kuala-lumpur': { name: 'Kuala Lumpur', climate: 'tropical' },
  beijing: { name: 'Beijing', climate: 'temperate' }, delhi: { name: 'Delhi', climate: 'temperate' },
  maldives: { name: 'Maldives', climate: 'tropical' }, taipei: { name: 'Taipei', climate: 'temperate' },
  colombo: { name: 'Colombo', climate: 'tropical' }, 'siem-reap': { name: 'Siem Reap', climate: 'tropical' },
  fiji: { name: 'Fiji', climate: 'tropical' }, 'bora-bora': { name: 'Bora Bora', climate: 'tropical' },
  cancun: { name: 'Cancún', climate: 'tropical' }, 'punta-cana': { name: 'Punta Cana', climate: 'tropical' },
  'san-juan': { name: 'San Juan', climate: 'tropical' }, nassau: { name: 'Nassau', climate: 'tropical' },
  'montego-bay': { name: 'Montego Bay', climate: 'tropical' }, 'cabo-san-lucas': { name: 'Cabo San Lucas', climate: 'desert' },
  aruba: { name: 'Aruba', climate: 'tropical' }, 'turks-and-caicos': { name: 'Turks and Caicos', climate: 'tropical' },
  'st-lucia': { name: 'St. Lucia', climate: 'tropical' }, 'san-jose-costa-rica': { name: 'San José', climate: 'tropical' },
  vancouver: { name: 'Vancouver', climate: 'temperate' }, toronto: { name: 'Toronto', climate: 'temperate' },
  montreal: { name: 'Montreal', climate: 'temperate' }, 'quebec-city': { name: 'Quebec City', climate: 'temperate' },
  calgary: { name: 'Calgary', climate: 'temperate' },
  dubai: { name: 'Dubai', climate: 'desert' }, marrakech: { name: 'Marrakech', climate: 'desert' },
  'cape-town': { name: 'Cape Town', climate: 'mediterranean' }, 'rio-de-janeiro': { name: 'Rio de Janeiro', climate: 'tropical' },
  'buenos-aires': { name: 'Buenos Aires', climate: 'temperate' }, bogota: { name: 'Bogotá', climate: 'temperate' },
  lima: { name: 'Lima', climate: 'desert' }, cusco: { name: 'Cusco', climate: 'cold' },
  santiago: { name: 'Santiago', climate: 'mediterranean' }, cartagena: { name: 'Cartagena', climate: 'tropical' },
  'panama-city': { name: 'Panama City', climate: 'tropical' }, 'belize-city': { name: 'Belize City', climate: 'tropical' },
  'grand-cayman': { name: 'Grand Cayman', climate: 'tropical' }, antigua: { name: 'Antigua', climate: 'tropical' },
  curacao: { name: 'Curaçao', climate: 'tropical' },
  doha: { name: 'Doha', climate: 'desert' }, 'tel-aviv': { name: 'Tel Aviv', climate: 'mediterranean' },
  'abu-dhabi': { name: 'Abu Dhabi', climate: 'desert' }, zanzibar: { name: 'Zanzibar', climate: 'tropical' },
  nairobi: { name: 'Nairobi', climate: 'temperate' }, casablanca: { name: 'Casablanca', climate: 'mediterranean' },
};

const CLIMATE_ITEMS = {
  tropical: ['Lightweight, breathable clothing', 'Swimwear', 'Packable rain jacket or poncho', 'Sandals or water shoes', 'Insect repellent', 'Reef-safe sunscreen (SPF 30+)', 'Wide-brim sun hat'],
  desert: ['Lightweight long sleeves for sun protection', 'Scarf or head covering', 'Sturdy closed-toe sandals or breathable shoes', 'Sunglasses (UV protection)', 'High-SPF sunscreen and lip balm', 'Light jacket for cool desert evenings'],
  mediterranean: ['Light layers for warm days', 'Light jacket or cardigan for evenings', 'Comfortable walking shoes', 'Swimwear if visiting the coast', 'Sunglasses and sunscreen'],
  temperate: ['Layerable clothing (weather can shift quickly)', 'Light-to-medium jacket', 'Compact umbrella', 'Comfortable walking shoes', 'One warmer layer even in summer'],
  cold: ['Insulated jacket', 'Thermal base layers', 'Warm hat, gloves, and scarf', 'Waterproof, insulated boots', 'Wool or thermal socks'],
};

const CLIMATE_LABELS = {
  tropical: 'Tropical', desert: 'Desert/arid', mediterranean: 'Mediterranean', temperate: 'Temperate (variable)', cold: 'Cold',
};

function scaledQty(days, perDay, cap) {
  return Math.min(Math.max(Math.ceil(days * perDay), 1), cap);
}

function computeResult({ destination, days, tripType }) {
  const dest = DESTINATIONS[destination];
  if (!dest) throw new Error('Unknown destination');
  const d = Number(days);
  if (!Number.isFinite(d) || d < 1) throw new Error('days must be a positive number');
  const type = tripType === 'business' ? 'business' : 'leisure';

  const categories = [
    {
      name: 'Documents & money',
      items: ['Passport (plus a photocopy or photo of it)', 'Boarding passes / travel confirmations', 'Travel insurance details', 'Backup payment card', 'A little local currency for arrival'],
    },
    {
      name: 'Clothing',
      items: [
        `${scaledQty(d, 1, 10)}x underwear`,
        `${scaledQty(d, 1, 10)}x socks`,
        `${scaledQty(d, 0.5, 7)}x tops/shirts`,
        `${scaledQty(d, 0.33, 5)}x bottoms (pants/shorts/skirts)`,
        `${scaledQty(d, 0.15, 3)}x sleepwear`,
        '1x comfortable walking shoes',
      ],
    },
    {
      name: `${CLIMATE_LABELS[dest.climate]} climate essentials`,
      items: CLIMATE_ITEMS[dest.climate],
    },
    {
      name: type === 'business' ? 'Business trip additions' : 'Leisure trip additions',
      items: type === 'business'
        ? ['Laptop and charger', 'Business attire (blazer, dress shirt/blouse)', 'Notebook and pen', 'Business cards', 'Backup phone charger/battery pack']
        : ['Camera or extra phone storage', 'Book, e-reader, or downloaded entertainment', 'A versatile "nice" outfit for one dinner out', 'Daypack for excursions'],
    },
    {
      name: 'Toiletries & health',
      items: ['Toothbrush, toothpaste, deodorant', 'Any prescription medications (in carry-on)', 'Basic first-aid items (pain reliever, bandages)', 'Travel-size toiletries (under 3.4oz/100ml for carry-on)'],
    },
    {
      name: 'Electronics',
      items: ['Phone charger', 'Universal power adapter if needed', 'Portable battery pack', 'Headphones'],
    },
  ];

  const headline = `Your ${d}-day ${type} trip to ${dest.name} (${CLIMATE_LABELS[dest.climate].toLowerCase()} climate) packing list is ready.`;

  return { destination, destinationName: dest.name, climate: dest.climate, climateLabel: CLIMATE_LABELS[dest.climate], days: d, tripType: type, categories, headline };
}

// @desc Instant generation, no email required
// @route POST /api/tools/packing-list/calculate
// @access Public
exports.calculatePackingList = (req, res) => {
  try {
    const { destination, days, tripType } = req.body;
    if (!destination || !days) return res.status(400).json({ success: false, error: 'destination and days are required' });
    const result = computeResult({ destination, days, tripType });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF checklist, send confirmation email
// @route POST /api/tools/packing-list/pdf
// @access Public
exports.generatePackingListPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, destination, days, tripType } = req.body;
    if (!email || !destination || !days) {
      return res.status(400).json({ success: false, error: 'email, destination, and days are required' });
    }

    const result = computeResult({ destination, days, tripType });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'packing-list-generator',
        JSON.stringify({ destination, days, tripType }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.destinationName} Packing List — ${result.days} Days`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="packing-list.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `Checklist for a ${result.days}-day ${result.tripType} trip to ${result.destinationName}, adjusted for its ${result.climateLabel.toLowerCase()} climate.`);

    result.categories.forEach(cat => {
      pdfService.heading(doc, cat.name);
      pdfService.bulletList(doc, cat.items);
    });

    pdfService.addFooterCTA(doc, destination);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your ${result.destinationName} packing list`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your packing list for ${result.destinationName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond packing? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19. <a href="https://travelsmarterapp.com/trip-brief.html?destination=${destination}" style="color:#ff6b4a;font-weight:bold;">See your Trip Brief →</a></p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send packing-list confirmation email:', err.message));

  } catch (error) {
    console.error('generatePackingListPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.DESTINATIONS = DESTINATIONS;
