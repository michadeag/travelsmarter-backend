const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Sporting equipment baggage fees per airline, reused from the shared
// 13-airline list. Distinct from overweightBaggageController.js (general
// weight/size penalty for any bag) and carryOnController.js (cabin bag
// dimensions) — most airlines have a separate, specific policy for skis/
// snowboards, golf clubs, surfboards, and bikes that doesn't follow
// standard baggage rules at all: sometimes it's genuinely free as one of
// your checked bags, sometimes it's a flat special-item fee regardless
// of weight. Fees are typical, approximate, and change often — always
// verify on the airline's site before you fly.
const EQUIPMENT_LABELS = {
  ski_snowboard: 'Skis / Snowboard',
  golf: 'Golf Clubs',
  surfboard: 'Surfboard',
  bike: 'Bicycle',
};

const AIRLINES = {
  delta: {
    name: 'Delta Air Lines',
    equipment: {
      ski_snowboard: { policy: 'Counts as one checked bag, no extra fee', note: 'A genuine perk — ski and snowboard equipment is treated as a standard checked bag if within the normal 50 lb weight limit, not as special/oversized.' },
      golf: { policy: 'Counts as one checked bag, no extra fee', note: 'Golf clubs get the same treatment as ski equipment — a standard checked bag if within the normal 50 lb weight limit.' },
      surfboard: { policy: '$150 special item fee', note: 'Applies to boards over 115 linear inches; shorter boards that fit standard checked-bag dimensions may travel as a normal bag instead.' },
      bike: { policy: '$150 special item fee', note: 'The bike must be boxed or in a proper bike bag — loose bikes are not accepted.' },
    },
  },
  united: {
    name: 'United Airlines',
    equipment: {
      ski_snowboard: { policy: 'Counts as one checked bag, no extra fee', note: 'Ski and snowboard equipment is treated as a standard checked bag if within the normal 50 lb weight limit.' },
      golf: { policy: 'Counts as one checked bag, no extra fee', note: 'Golf clubs get the same treatment as ski equipment — a standard checked bag if within the normal 50 lb weight limit.' },
      surfboard: { policy: '~$200 special item fee', note: 'Applies to boards over standard checked-bag dimensions — check current size cutoffs, as they\'re periodically adjusted.' },
      bike: { policy: '~$200 special item fee', note: 'The bike must be boxed or in a proper bike bag — loose bikes are not accepted.' },
    },
  },
  american: {
    name: 'American Airlines',
    equipment: {
      ski_snowboard: { policy: 'Counts as one checked bag, no extra fee', note: 'Ski and snowboard equipment is treated as a standard checked bag if within the normal 50 lb weight limit.' },
      golf: { policy: 'Counts as one checked bag, no extra fee', note: 'Golf clubs get the same treatment as ski equipment — a standard checked bag if within the normal 50 lb weight limit.' },
      surfboard: { policy: '~$150-200 special item fee', note: 'Applies to boards over standard checked-bag dimensions — the exact fee varies somewhat by route.' },
      bike: { policy: '~$150-200 special item fee', note: 'The bike must be boxed or in a proper bike bag — loose bikes are not accepted.' },
    },
  },
  southwest: {
    name: 'Southwest Airlines',
    equipment: {
      ski_snowboard: { policy: 'Counts as one of your two free checked bags', note: "A genuine standout given Southwest's free-bag policy — ski and snowboard equipment counts toward your two free checked bags if within the normal weight limit, at no extra cost." },
      golf: { policy: 'Counts as one of your two free checked bags', note: 'Golf clubs get the same treatment as ski equipment — a real perk on top of the already-free standard baggage allowance.' },
      surfboard: { policy: 'Special handling fee applies (varies)', note: 'Oversized items like surfboards incur an additional handling fee even though your first two checked bags are otherwise free.' },
      bike: { policy: 'Special handling fee applies (varies)', note: 'Oversized items like bikes incur an additional handling fee even though your first two checked bags are otherwise free — box or bag it properly.' },
    },
  },
  jetblue: {
    name: 'JetBlue Airways',
    equipment: {
      ski_snowboard: { policy: 'Counts as one checked bag, no extra fee', note: 'Ski and snowboard equipment is treated as a standard checked bag if within the normal weight limit.' },
      golf: { policy: 'Counts as one checked bag, no extra fee', note: 'Golf clubs get the same treatment as ski equipment — a standard checked bag if within the normal weight limit.' },
      surfboard: { policy: '~$150 special item fee', note: 'Applies to boards over standard checked-bag dimensions.' },
      bike: { policy: '~$150 special item fee', note: 'The bike must be boxed or in a proper bike bag — loose bikes are not accepted.' },
    },
  },
  alaska: {
    name: 'Alaska Airlines',
    equipment: {
      ski_snowboard: { policy: 'Counts as one checked bag, no extra fee', note: 'One of the most sports-friendly policies of any major US carrier — Alaska markets itself specifically to skiers, golfers, surfers, and climbers.' },
      golf: { policy: 'Counts as one checked bag, no extra fee', note: 'Golf clubs get the same generous treatment — a standard checked bag if within the normal weight limit, no special fee.' },
      surfboard: { policy: 'Counts as one checked bag, no extra fee (up to standard size)', note: 'A genuine standout — many other carriers charge a special oversize fee for surfboards that Alaska waives if the board fits within standard checked-bag dimensions.' },
      bike: { policy: 'Counts as one checked bag, no extra fee (boxed)', note: 'Also notably generous — a properly boxed bike typically counts as a standard checked bag rather than incurring a special oversize fee.' },
    },
  },
  hawaiian: {
    name: 'Hawaiian Airlines',
    equipment: {
      ski_snowboard: { policy: 'Counts as one checked bag, no extra fee', note: 'Ski and snowboard equipment is treated as a standard checked bag if within the normal weight limit — less commonly relevant given the route network, but the policy is generous.' },
      golf: { policy: 'Counts as one checked bag, no extra fee', note: 'Golf clubs get the same treatment as ski equipment — a standard checked bag if within the normal weight limit.' },
      surfboard: { policy: '~$50-150 special item fee depending on route', note: 'A particularly relevant policy given the destinations — surfboard fees are lower than many mainland-only carriers but still apply, and vary by specific route.' },
      bike: { policy: '~$150 special item fee', note: 'The bike must be boxed or in a proper bike bag — loose bikes are not accepted.' },
    },
  },
  spirit: {
    name: 'Spirit Airlines',
    equipment: {
      ski_snowboard: { policy: 'Standard checked bag fee applies', note: "No special exemption — ski and snowboard equipment is charged the same as any other checked bag, which on a budget carrier can add up if paid at the airport rather than pre-booked online." },
      golf: { policy: 'Standard checked bag fee applies', note: 'Same as ski equipment — no special exemption, charged as a standard checked bag.' },
      surfboard: { policy: 'Standard bag fee plus an additional oversize fee', note: 'Budget carriers like Spirit typically stack a checked-bag fee and a separate oversize fee for surfboards — pre-booking online is meaningfully cheaper than paying at the gate.' },
      bike: { policy: 'Standard bag fee plus an additional oversize fee', note: 'Same stacking of fees applies to bikes — box it properly and pre-book online to minimize the cost.' },
    },
  },
  frontier: {
    name: 'Frontier Airlines',
    equipment: {
      ski_snowboard: { policy: 'Standard checked bag fee applies', note: 'No special exemption — ski and snowboard equipment is charged the same as any other checked bag.' },
      golf: { policy: 'Standard checked bag fee applies', note: 'Same as ski equipment — no special exemption, charged as a standard checked bag.' },
      surfboard: { policy: 'Standard bag fee plus an additional oversize fee', note: 'Budget carriers like Frontier typically stack a checked-bag fee and a separate oversize fee for surfboards — pre-booking online is meaningfully cheaper.' },
      bike: { policy: 'Standard bag fee plus an additional oversize fee', note: 'Same stacking of fees applies to bikes — box it properly and pre-book online to minimize the cost.' },
    },
  },
  allegiant: {
    name: 'Allegiant Air',
    equipment: {
      ski_snowboard: { policy: 'Standard checked bag fee applies', note: 'No special exemption — ski and snowboard equipment is charged the same as any other checked bag.' },
      golf: { policy: 'Standard checked bag fee applies', note: 'Same as ski equipment — no special exemption, charged as a standard checked bag.' },
      surfboard: { policy: 'Standard bag fee plus an additional oversize fee', note: 'Budget carriers like Allegiant typically stack a checked-bag fee and a separate oversize fee for surfboards.' },
      bike: { policy: 'Standard bag fee plus an additional oversize fee', note: 'Same stacking of fees applies to bikes — box it properly and pre-book online to minimize the cost.' },
    },
  },
  ryanair: {
    name: 'Ryanair',
    equipment: {
      ski_snowboard: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Ryanair charges a specific "ski carriage" fee separate from standard baggage — pre-booking online is significantly cheaper than paying at the airport.' },
      golf: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Golf clubs are charged as sports equipment, separate from standard baggage — pre-booking online is significantly cheaper than paying at the airport.' },
      surfboard: { policy: 'Flat sports equipment fee (higher than ski/golf)', note: 'Surfboards are treated as oversized sports equipment with one of the higher special-item rates — pre-booking online is essential to avoid a much steeper airport rate.' },
      bike: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Bikes must be properly boxed and are charged as sports equipment — pre-booking online is significantly cheaper than paying at the airport.' },
    },
  },
  easyjet: {
    name: 'easyJet',
    equipment: {
      ski_snowboard: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'easyJet offers a specific discounted ski carriage rate if booked in advance — notably cheaper than paying at the airport.' },
      golf: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Golf clubs are charged as sports equipment, separate from standard baggage — pre-booking online is cheaper than paying at the airport.' },
      surfboard: { policy: 'Flat sports equipment fee (higher than ski/golf)', note: 'Surfboards are treated as oversized sports equipment with one of the higher special-item rates — pre-book online to avoid a steeper airport rate.' },
      bike: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Bikes must be properly boxed and are charged as sports equipment — pre-booking online is cheaper than paying at the airport.' },
    },
  },
  wizzair: {
    name: 'Wizz Air',
    equipment: {
      ski_snowboard: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Wizz Air charges a specific ski equipment fee separate from standard baggage — pre-booking online is significantly cheaper than paying at the airport.' },
      golf: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Golf clubs are charged as sports equipment, separate from standard baggage — pre-booking online is significantly cheaper than paying at the airport.' },
      surfboard: { policy: 'Flat sports equipment fee (higher than ski/golf)', note: 'Surfboards are treated as oversized sports equipment with one of the higher special-item rates — pre-booking online is essential.' },
      bike: { policy: 'Flat sports equipment fee, discounted if pre-booked online', note: 'Bikes must be properly boxed and are charged as sports equipment — pre-booking online is significantly cheaper.' },
    },
  },
};

function computeResult({ airline, equipmentType }) {
  const airlineData = AIRLINES[airline];
  if (!airlineData) throw new Error('Unknown airline');
  const equipmentData = airlineData.equipment[equipmentType];
  if (!equipmentData) throw new Error('Unknown equipment type');

  const equipmentLabel = EQUIPMENT_LABELS[equipmentType];
  const headline = `${airlineData.name}, ${equipmentLabel.toLowerCase()}: ${equipmentData.policy}.`;

  return {
    airline, airlineName: airlineData.name, equipmentType, equipmentLabel,
    policy: equipmentData.policy, note: equipmentData.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/sports-equipment-checker/calculate
// @access Public
exports.calculateSportsEquipment = (req, res) => {
  try {
    const { airline, equipmentType } = req.body;
    if (!airline || !equipmentType) return res.status(400).json({ success: false, error: 'airline and equipmentType are required' });
    const result = computeResult({ airline, equipmentType });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/sports-equipment-checker/pdf
// @access Public
exports.generateSportsEquipmentPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airline, equipmentType } = req.body;
    if (!email || !airline || !equipmentType) {
      return res.status(400).json({ success: false, error: 'email, airline, and equipmentType are required' });
    }

    const result = computeResult({ airline, equipmentType });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'sports-equipment-checker',
        JSON.stringify({ airline, equipmentType }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Sports Equipment Baggage Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sports-equipment-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, `${result.equipmentLabel}: ${result.policy}`);

    pdfService.heading(doc, 'Before you pack your gear');
    pdfService.bulletList(doc, [
      'Sports equipment policies are separate from standard baggage rules on most airlines — don\'t assume your regular checked-bag fee covers it.',
      'Pre-booking special items online, before you get to the airport, is almost always cheaper than paying at check-in or the gate.',
      'Box or bag your equipment properly (especially bikes) — airlines can refuse improperly packed items regardless of fee paid.',
      'Fees quoted here are typical estimates — always verify on the airline\'s current site before you fly, since these change often.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🏂 Your ${result.airlineName} sports equipment baggage guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the sports equipment baggage check for ${result.airlineName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond packing gear? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send sports-equipment-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateSportsEquipmentPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
exports.EQUIPMENT_LABELS = EQUIPMENT_LABELS;
exports.computeResult = computeResult;
