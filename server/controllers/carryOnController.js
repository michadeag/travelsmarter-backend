const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Carry-on and personal-item limits per airline, in inches (rounded from official cm specs).
// weightLimitLb applies to the carry-on bag only, where the airline enforces one (mainly
// European low-cost carriers) — US carriers generally do not weigh carry-ons.
const AIRLINES = {
  delta: {
    name: 'Delta Air Lines', region: 'US major',
    carryOn: { l: 22, w: 14, h: 9 }, personalItem: { l: 18, w: 14, h: 8 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'Delta Basic Economy still includes a free full-size carry-on — only the personal item restriction found on some other airlines does not apply here.',
  },
  united: {
    name: 'United Airlines', region: 'US major',
    carryOn: { l: 22, w: 14, h: 9 }, personalItem: { l: 17, w: 10, h: 9 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'United Basic Economy on most routes still includes a free full-size carry-on, though a small number of Basic Economy fares (mainly international) restrict you to a personal item only — check your fare rules.',
  },
  american: {
    name: 'American Airlines', region: 'US major',
    carryOn: { l: 22, w: 14, h: 9 }, personalItem: { l: 18, w: 14, h: 8 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'American Basic Economy still includes a free full-size carry-on on domestic routes — some international Basic Economy fares are more restrictive, so check your fare rules.',
  },
  southwest: {
    name: 'Southwest Airlines', region: 'US major',
    carryOn: { l: 24, w: 16, h: 10 }, personalItem: { l: 18.5, w: 13.5, h: 8.5 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'All Southwest fares include a free carry-on and personal item, plus two free checked bags — there is no Basic-Economy-style restriction on this airline.',
  },
  jetblue: {
    name: 'JetBlue Airways', region: 'US major',
    carryOn: { l: 22, w: 14, h: 9 }, personalItem: { l: 17, w: 13, h: 8 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'JetBlue\'s Blue Basic fare still includes a free full-size carry-on.',
  },
  alaska: {
    name: 'Alaska Airlines', region: 'US major',
    carryOn: { l: 22, w: 14, h: 9 }, personalItem: { l: 18, w: 14, h: 8 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'Alaska\'s Saver fare still includes a free full-size carry-on, unlike the Basic Economy tiers on some other major airlines.',
  },
  hawaiian: {
    name: 'Hawaiian Airlines', region: 'US major',
    carryOn: { l: 22, w: 14, h: 9 }, personalItem: { l: 17, w: 12, h: 8 },
    weightLimitLb: null, carryOnFree: true,
    basicEconomyNote: 'Hawaiian\'s Main Cabin Basic fare still includes a free full-size carry-on.',
  },
  spirit: {
    name: 'Spirit Airlines', region: 'US budget',
    carryOn: { l: 22, w: 18, h: 10 }, personalItem: { l: 18, w: 14, h: 8 },
    weightLimitLb: 40, carryOnFree: false,
    basicEconomyNote: 'On Spirit, only the personal item is free on every fare — a full-size carry-on is a paid add-on unless you\'ve purchased a bundle that includes it, and it\'s cheaper to add it during booking than at the gate.',
  },
  frontier: {
    name: 'Frontier Airlines', region: 'US budget',
    carryOn: { l: 24, w: 16, h: 10 }, personalItem: { l: 18, w: 14, h: 8 },
    weightLimitLb: 35, carryOnFree: false,
    basicEconomyNote: 'On Frontier, only the personal item is free on every fare — a full-size carry-on is a paid add-on unless included in your bundle, and it\'s cheaper to add it during booking than at the gate.',
  },
  allegiant: {
    name: 'Allegiant Air', region: 'US budget',
    carryOn: { l: 22, w: 16, h: 10 }, personalItem: { l: 16, w: 15, h: 7 },
    weightLimitLb: null, carryOnFree: false,
    basicEconomyNote: 'On Allegiant, only the personal item is free — a full-size carry-on is a paid add-on, and it\'s cheaper to add it during booking than at the gate or on board.',
  },
  ryanair: {
    name: 'Ryanair', region: 'European budget',
    carryOn: { l: 21.5, w: 15.5, h: 7.75 }, personalItem: { l: 15.75, w: 7.75, h: 9.75 },
    weightLimitLb: 22, carryOnFree: false,
    basicEconomyNote: 'Ryanair includes only one free small bag (fits under the seat) on every fare. A larger cabin bag with a 10kg weight limit requires Priority boarding, purchased in advance — Ryanair is known for strictly enforcing sizes at the gate with physical sizers and charging a higher fee on the spot for non-compliant bags.',
  },
  easyjet: {
    name: 'easyJet', region: 'European budget',
    carryOn: { l: 22, w: 17.75, h: 9.75 }, personalItem: { l: 17.75, w: 14, h: 7.9 },
    weightLimitLb: 33, carryOnFree: false,
    basicEconomyNote: 'easyJet includes only one free small underseat bag on every fare. A larger cabin bag (with a weight limit) requires an Up Front or Extra Legroom seat, or a paid add-on — gate enforcement varies by airport but can result in a higher fee than booking ahead.',
  },
  wizzair: {
    name: 'Wizz Air', region: 'European budget',
    carryOn: { l: 21.65, w: 15.75, h: 9.1 }, personalItem: { l: 15.75, w: 11.8, h: 7.9 },
    weightLimitLb: 22, carryOnFree: false,
    basicEconomyNote: 'Wizz Air includes only one free small bag on every fare. A larger cabin bag with a 10kg weight limit requires "WIZZ Priority," purchased in advance — it\'s cheaper to add it during booking than pay the gate fee for a non-compliant bag.',
  },
};

const AIRLINE_LABELS = Object.fromEntries(Object.entries(AIRLINES).map(([slug, a]) => [slug, a.name]));

function fitsDims(bag, limit) {
  const bagSorted = [bag.l, bag.w, bag.h].sort((a, b) => b - a);
  const limitSorted = [limit.l, limit.w, limit.h].sort((a, b) => b - a);
  return bagSorted[0] <= limitSorted[0] && bagSorted[1] <= limitSorted[1] && bagSorted[2] <= limitSorted[2];
}

function computeResult({ airline, length, width, height, weight }) {
  const data = AIRLINES[airline];
  if (!data) throw new Error('Unknown airline');
  if (!length || !width || !height) throw new Error('length, width, and height are required');

  const bag = { l: Number(length), w: Number(width), h: Number(height) };
  if ([bag.l, bag.w, bag.h].some(v => !Number.isFinite(v) || v <= 0)) {
    throw new Error('length, width, and height must be positive numbers');
  }

  const fitsCarryOn = fitsDims(bag, data.carryOn);
  const fitsPersonalItem = fitsDims(bag, data.personalItem);

  let weightOk = true;
  if (data.weightLimitLb && weight) {
    weightOk = Number(weight) <= data.weightLimitLb;
  }

  let status, headline;
  if (fitsCarryOn && weightOk) {
    status = 'fits_carry_on';
    headline = `Your bag fits ${data.name}'s carry-on size limit${data.weightLimitLb && weight ? ' and weight limit' : ''}.`;
  } else if (fitsCarryOn && !weightOk) {
    status = 'too_heavy';
    headline = `Your bag fits the size limit, but exceeds ${data.name}'s ${data.weightLimitLb}lb carry-on weight limit.`;
  } else if (fitsPersonalItem) {
    status = 'personal_item_only';
    headline = `Your bag is too large for ${data.name}'s carry-on limit, but fits as a personal item.`;
  } else {
    status = 'too_large';
    headline = `Your bag exceeds both the carry-on and personal item limits for ${data.name} — plan to check it.`;
  }

  return {
    airline,
    airlineName: data.name,
    region: data.region,
    bag,
    carryOnLimit: data.carryOn,
    personalItemLimit: data.personalItem,
    weightLimitLb: data.weightLimitLb,
    weight: weight ? Number(weight) : null,
    carryOnFree: data.carryOnFree,
    basicEconomyNote: data.basicEconomyNote,
    fitsCarryOn,
    fitsPersonalItem,
    weightOk,
    status,
    headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/carry-on-checker/calculate
// @access Public
exports.calculateCarryOnFit = (req, res) => {
  try {
    const { airline, length, width, height, weight } = req.body;
    if (!airline) return res.status(400).json({ success: false, error: 'airline is required' });
    const result = computeResult({ airline, length, width, height, weight });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a packing PDF, send a confirmation email
// @route POST /api/tools/carry-on-checker/pdf
// @access Public
exports.generateCarryOnPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, airline, length, width, height, weight } = req.body;
    if (!email || !airline) {
      return res.status(400).json({ success: false, error: 'email and airline are required' });
    }

    const result = computeResult({ airline, length, width, height, weight });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'carry-on-size-checker',
        JSON.stringify({ airline, length, width, height, weight }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.airlineName} Carry-On Size Report`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="carry-on-size-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, `Your bag: ${result.bag.l}" x ${result.bag.w}" x ${result.bag.h}"${result.weight ? ` at ${result.weight}lb` : ''}. ${result.airlineName}'s carry-on limit is ${result.carryOnLimit.l}" x ${result.carryOnLimit.w}" x ${result.carryOnLimit.h}"${result.weightLimitLb ? `, with a ${result.weightLimitLb}lb weight limit` : ' (no published weight limit)'}. The free personal item limit is ${result.personalItemLimit.l}" x ${result.personalItemLimit.w}" x ${result.personalItemLimit.h}".`);

    pdfService.highlightBox(doc, result.headline);

    pdfService.heading(doc, 'Fare and fee notes');
    pdfService.paragraph(doc, result.basicEconomyNote);

    pdfService.heading(doc, 'Packing tips');
    pdfService.bulletList(doc, [
      'Measure your bag with wheels, handles, and any external pockets included — gate sizers measure the bag as-is, not just the main compartment.',
      'Soft-sided bags can sometimes compress slightly to fit a sizer even if they measure a bit over — hard-shell bags cannot.',
      'If your bag is borderline, wear bulky items (jacket, boots) instead of packing them to reduce bag volume and weight.',
      'On airlines with a paid carry-on, add it during booking — the gate fee is almost always higher than the online price.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🧳 Your ${result.airlineName} carry-on report`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your carry-on check for ${result.airlineName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and packing tools built into your trip planning instead of checking bag rules by hand? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send carry-on-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateCarryOnPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.AIRLINES = AIRLINES;
exports.AIRLINE_LABELS = AIRLINE_LABELS;
