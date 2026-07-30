const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Destination -> approximate one-way distance in miles from a major US
// gateway, derived from the same tripType categories used in Tool #1.
// These are representative averages for each distance band, not precise
// per-city great-circle distances — good enough for an illustrative
// estimate, not for offsetting/compliance purposes.
const TRIP_TYPE_DISTANCE_MILES = {
  short_haul: 1500,
  long_haul_transatlantic: 4000,
  long_haul_asia_pacific: 7500,
};

const DESTINATIONS = {
  paris: { name: 'Paris', tripType: 'long_haul_transatlantic' }, london: { name: 'London', tripType: 'long_haul_transatlantic' },
  rome: { name: 'Rome', tripType: 'long_haul_transatlantic' }, barcelona: { name: 'Barcelona', tripType: 'long_haul_transatlantic' },
  amsterdam: { name: 'Amsterdam', tripType: 'long_haul_transatlantic' }, lisbon: { name: 'Lisbon', tripType: 'long_haul_transatlantic' },
  dublin: { name: 'Dublin', tripType: 'long_haul_transatlantic' }, athens: { name: 'Athens', tripType: 'long_haul_transatlantic' },
  reykjavik: { name: 'Reykjavik', tripType: 'long_haul_transatlantic' }, madrid: { name: 'Madrid', tripType: 'long_haul_transatlantic' },
  venice: { name: 'Venice', tripType: 'long_haul_transatlantic' }, prague: { name: 'Prague', tripType: 'long_haul_transatlantic' },
  vienna: { name: 'Vienna', tripType: 'long_haul_transatlantic' }, berlin: { name: 'Berlin', tripType: 'long_haul_transatlantic' },
  santorini: { name: 'Santorini', tripType: 'long_haul_transatlantic' }, zurich: { name: 'Zurich', tripType: 'long_haul_transatlantic' },
  munich: { name: 'Munich', tripType: 'long_haul_transatlantic' }, milan: { name: 'Milan', tripType: 'long_haul_transatlantic' },
  copenhagen: { name: 'Copenhagen', tripType: 'long_haul_transatlantic' }, stockholm: { name: 'Stockholm', tripType: 'long_haul_transatlantic' },
  budapest: { name: 'Budapest', tripType: 'long_haul_transatlantic' }, istanbul: { name: 'Istanbul', tripType: 'long_haul_transatlantic' },
  edinburgh: { name: 'Edinburgh', tripType: 'long_haul_transatlantic' }, nice: { name: 'Nice', tripType: 'long_haul_transatlantic' },
  tokyo: { name: 'Tokyo', tripType: 'long_haul_asia_pacific' }, bangkok: { name: 'Bangkok', tripType: 'long_haul_asia_pacific' },
  bali: { name: 'Bali', tripType: 'long_haul_asia_pacific' }, singapore: { name: 'Singapore', tripType: 'long_haul_asia_pacific' },
  seoul: { name: 'Seoul', tripType: 'long_haul_asia_pacific' }, 'hong-kong': { name: 'Hong Kong', tripType: 'long_haul_asia_pacific' },
  sydney: { name: 'Sydney', tripType: 'long_haul_asia_pacific' }, auckland: { name: 'Auckland', tripType: 'long_haul_asia_pacific' },
  'ho-chi-minh-city': { name: 'Ho Chi Minh City', tripType: 'long_haul_asia_pacific' }, manila: { name: 'Manila', tripType: 'long_haul_asia_pacific' },
  phuket: { name: 'Phuket', tripType: 'long_haul_asia_pacific' }, 'kuala-lumpur': { name: 'Kuala Lumpur', tripType: 'long_haul_asia_pacific' },
  beijing: { name: 'Beijing', tripType: 'long_haul_asia_pacific' }, delhi: { name: 'Delhi', tripType: 'long_haul_asia_pacific' },
  maldives: { name: 'Maldives', tripType: 'long_haul_asia_pacific' }, taipei: { name: 'Taipei', tripType: 'long_haul_asia_pacific' },
  colombo: { name: 'Colombo', tripType: 'long_haul_asia_pacific' }, 'siem-reap': { name: 'Siem Reap', tripType: 'long_haul_asia_pacific' },
  fiji: { name: 'Fiji', tripType: 'long_haul_asia_pacific' }, 'bora-bora': { name: 'Bora Bora', tripType: 'long_haul_asia_pacific' },
  cancun: { name: 'Cancún', tripType: 'short_haul' }, 'punta-cana': { name: 'Punta Cana', tripType: 'short_haul' },
  'san-juan': { name: 'San Juan', tripType: 'short_haul' }, nassau: { name: 'Nassau', tripType: 'short_haul' },
  'montego-bay': { name: 'Montego Bay', tripType: 'short_haul' }, 'cabo-san-lucas': { name: 'Cabo San Lucas', tripType: 'short_haul' },
  aruba: { name: 'Aruba', tripType: 'short_haul' }, 'turks-and-caicos': { name: 'Turks and Caicos', tripType: 'short_haul' },
  'st-lucia': { name: 'St. Lucia', tripType: 'short_haul' }, 'san-jose-costa-rica': { name: 'San José', tripType: 'short_haul' },
  vancouver: { name: 'Vancouver', tripType: 'short_haul' }, toronto: { name: 'Toronto', tripType: 'short_haul' },
  montreal: { name: 'Montreal', tripType: 'short_haul' }, 'quebec-city': { name: 'Quebec City', tripType: 'short_haul' },
  calgary: { name: 'Calgary', tripType: 'short_haul' },
  dubai: { name: 'Dubai', tripType: 'long_haul_transatlantic' }, marrakech: { name: 'Marrakech', tripType: 'long_haul_transatlantic' },
  'cape-town': { name: 'Cape Town', tripType: 'long_haul_asia_pacific' }, 'rio-de-janeiro': { name: 'Rio de Janeiro', tripType: 'long_haul_transatlantic' },
  'buenos-aires': { name: 'Buenos Aires', tripType: 'long_haul_transatlantic' }, bogota: { name: 'Bogotá', tripType: 'short_haul' },
  lima: { name: 'Lima', tripType: 'long_haul_transatlantic' }, cusco: { name: 'Cusco', tripType: 'long_haul_transatlantic' },
  santiago: { name: 'Santiago', tripType: 'long_haul_transatlantic' }, cartagena: { name: 'Cartagena', tripType: 'short_haul' },
  'panama-city': { name: 'Panama City', tripType: 'short_haul' }, 'belize-city': { name: 'Belize City', tripType: 'short_haul' },
  'grand-cayman': { name: 'Grand Cayman', tripType: 'short_haul' }, antigua: { name: 'Antigua', tripType: 'short_haul' },
  curacao: { name: 'Curaçao', tripType: 'short_haul' },
  doha: { name: 'Doha', tripType: 'long_haul_asia_pacific' }, 'tel-aviv': { name: 'Tel Aviv', tripType: 'long_haul_transatlantic' },
  'abu-dhabi': { name: 'Abu Dhabi', tripType: 'long_haul_asia_pacific' }, zanzibar: { name: 'Zanzibar', tripType: 'long_haul_asia_pacific' },
  nairobi: { name: 'Nairobi', tripType: 'long_haul_asia_pacific' }, casablanca: { name: 'Casablanca', tripType: 'long_haul_transatlantic' },
};

// kg CO2 per passenger-mile, economy baseline, roughly matching published
// aviation emission-factor methodologies (e.g. ICAO carbon calculator).
const ECONOMY_KG_PER_MILE = 0.15;
const CABIN_MULTIPLIERS = { economy: 1, 'premium-economy': 1.5, business: 3, first: 4 };
const CABIN_LABELS = { economy: 'Economy', 'premium-economy': 'Premium Economy', business: 'Business', first: 'First' };

// Rough average car emissions, kg CO2 per mile, for a relatable comparison.
const CAR_KG_PER_MILE = 0.4;

function computeResult({ destination, cabinClass, roundTrip }) {
  const dest = DESTINATIONS[destination];
  if (!dest) throw new Error('Unknown destination');
  const cabin = CABIN_MULTIPLIERS[cabinClass] ? cabinClass : 'economy';
  const isRoundTrip = roundTrip !== false && roundTrip !== 'false';

  const oneWayMiles = TRIP_TYPE_DISTANCE_MILES[dest.tripType];
  const totalMiles = isRoundTrip ? oneWayMiles * 2 : oneWayMiles;
  const totalKgCO2 = Math.round(totalMiles * ECONOMY_KG_PER_MILE * CABIN_MULTIPLIERS[cabin]);
  const carEquivalentMiles = Math.round(totalKgCO2 / CAR_KG_PER_MILE);

  const headline = `Your ${isRoundTrip ? 'round-trip' : 'one-way'} flight to ${dest.name} in ${CABIN_LABELS[cabin]} produces roughly ${totalKgCO2.toLocaleString('en-US')} kg of CO2 per person.`;

  return {
    destination, destinationName: dest.name, cabinClass: cabin, cabinLabel: CABIN_LABELS[cabin],
    roundTrip: isRoundTrip, totalMiles, totalKgCO2, carEquivalentMiles, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/carbon-calculator/calculate
// @access Public
exports.calculateCarbon = (req, res) => {
  try {
    const { destination, cabinClass, roundTrip } = req.body;
    if (!destination) return res.status(400).json({ success: false, error: 'destination is required' });
    const result = computeResult({ destination, cabinClass, roundTrip });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/carbon-calculator/pdf
// @access Public
exports.generateCarbonPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, destination, cabinClass, roundTrip } = req.body;
    if (!email || !destination) {
      return res.status(400).json({ success: false, error: 'email and destination are required' });
    }

    const result = computeResult({ destination, cabinClass, roundTrip });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'flight-carbon-calculator',
        JSON.stringify({ destination, cabinClass, roundTrip }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.destinationName} Flight Carbon Estimate`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="flight-carbon-calculator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, 'This is an illustrative estimate based on typical published aviation emission factors and average trip distances for this route type — actual emissions vary by aircraft type, route, altitude, and how full the flight is. It is not intended for offsetting or compliance purposes.');

    pdfService.highlightBox(doc, `~${result.totalKgCO2.toLocaleString('en-US')} kg CO2 · equivalent to driving about ${result.carEquivalentMiles.toLocaleString('en-US')} miles in an average car`);

    pdfService.heading(doc, 'Ways to reduce your flight\'s footprint');
    pdfService.bulletList(doc, [
      'Fly economy rather than premium/business when possible — cabin class has a bigger emissions impact than most people expect, since it\'s based on the cabin space you occupy.',
      'Choose nonstop flights over connections when available — extra takeoffs and landings burn disproportionately more fuel per mile.',
      'Pack lighter — every kilogram adds to the fuel burn for the whole flight.',
      'Consider a reputable, verified carbon offset program if you want to address unavoidable emissions from a specific trip.',
    ]);

    pdfService.addFooterCTA(doc, destination);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🌍 Your ${result.destinationName} flight carbon estimate`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your flight carbon estimate:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond carbon estimates? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${destination}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send carbon-calculator confirmation email:', err.message));

  } catch (error) {
    console.error('generateCarbonPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.DESTINATIONS = DESTINATIONS;
