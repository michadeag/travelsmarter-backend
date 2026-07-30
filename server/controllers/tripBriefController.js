const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const tripBriefEmailSequence = require('../services/tripBriefEmailSequence');
const { computeTripBriefSections, groupSectionsByCategory, SAFE_DESTINATIONS } = require('../services/tripBriefRegistry');
// SAFE_DESTINATIONS is the verified intersection of all 35 registry tools'
// own country rosters — NOT all 54 free tools share one country list (see
// the comment on SAFE_DESTINATIONS itself), so this is deliberately
// narrower than "every country any tool has ever covered." Selecting
// outside this set would silently produce an incomplete paid PDF.
const DESTINATION_LOOKUP = new Map(SAFE_DESTINATIONS.map(d => [d.slug, d]));

const PRICING = {
  single: { name: 'Trip Brief', price: 1900, priceUSD: 19.00, description: 'One personalized trip brief, combining every relevant check for your destination into one PDF.' },
  lifetime: { name: 'Trip Brief — Unlimited', price: 9900, priceUSD: 99.00, description: 'Unlimited personalized trip briefs, for every future trip, forever.' },
};

function resolveDestination(destination) {
  const data = DESTINATION_LOOKUP.get(destination);
  if (!data) throw new Error('Unknown or unsupported destination');
  return data;
}

// @desc List every tool included in a Trip Brief, grouped by category — used
//   by the frontend to render "what's included" without duplicating the list.
// @route GET /api/trip-brief/tools
// @access Public
exports.getTripBriefTools = (req, res) => {
  const { TOOLS, CATEGORY_ORDER } = require('../services/tripBriefRegistry');
  const byCategory = CATEGORY_ORDER.map(category => ({
    category,
    tools: TOOLS.filter(t => t.category === category).map(t => ({ name: t.name, icon: t.icon, conditional: t.conditional })),
  }));
  res.status(200).json({ success: true, categories: byCategory, totalTools: TOOLS.length });
};

// @desc List destinations safe to offer for a Trip Brief — the frontend
//   dropdown is built from this instead of hardcoding its own country list,
//   so it can never drift out of sync with which destinations actually
//   produce a complete brief (see SAFE_DESTINATIONS in tripBriefRegistry.js).
// @route GET /api/trip-brief/destinations
// @access Public
exports.getTripBriefDestinations = (req, res) => {
  res.status(200).json({ success: true, destinations: SAFE_DESTINATIONS });
};

// @desc Streams a real sample Trip Brief PDF (fixed demo destination —
//   Thailand, chosen for having entries across every category, including
//   the sparser ones like Pet Travel) so a visitor can see exactly what
//   they're paying for before checkout. No email required, not a lead
//   capture — this exists purely to reduce purchase anxiety on a $19-99
//   decision made sight-unseen otherwise.
// @route GET /api/trip-brief/sample-pdf
// @access Public
exports.getSampleTripBriefPdf = async (req, res) => {
  try {
    const sampleDestination = 'thailand';
    const destinationName = resolveDestination(sampleDestination).name;
    const pdfBuffer = await generateTripBriefPdfBuffer({ destination: sampleDestination }, destinationName, true);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="trip-brief-sample-thailand.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('getSampleTripBriefPdf error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Check whether an email already has lifetime Trip Brief access
// @route POST /api/trip-brief/check-access
// @access Public
exports.checkLifetimeAccess = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required' });

    const result = await pool.query(
      'SELECT granted_at FROM trip_brief_lifetime_access WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    res.status(200).json({ success: true, hasLifetimeAccess: result.rows.length > 0 });
  } catch (error) {
    console.error('checkLifetimeAccess error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Builds the combined PDF for a trip as a Buffer (for email attachment) —
// shared by both the paid-checkout path and the free lifetime-access path,
// plus the public sample-PDF endpoint (isSample: true) that lets a visitor
// see a real Trip Brief before paying for one.
async function generateTripBriefPdfBuffer(trip, destinationName, isSample = false) {
  const sections = computeTripBriefSections(trip);
  const groups = groupSectionsByCategory(sections);

  const doc = pdfService.createBrandedDoc(`${destinationName} Trip Brief${isSample ? ' (Sample)' : ''}`);
  const bufferPromise = pdfService.toBuffer(doc);

  pdfService.heading(doc, `Your ${destinationName} Trip Brief`);
  if (isSample) {
    pdfService.paragraph(doc, `This is a real sample Trip Brief for ${destinationName}, shown so you know exactly what you're getting before you pay — every check below is live data, not a mockup. Enter your own destination at travelsmarterapp.com/trip-brief.html to get one personalized for your trip.`);
  }
  pdfService.paragraph(doc, `This brief combines ${sections.length} checks across ${groups.length} categories into one place, so you don't have to track down each answer separately. Last verified: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Rules can change — always confirm anything critical (visas, health requirements, entry rules) against an official government source close to your travel date.`);

  for (const group of groups) {
    pdfService.heading(doc, group.category);
    for (const section of group.sections) {
      pdfService.subheading(doc, `${section.icon} ${section.name}`);
      pdfService.paragraph(doc, section.result.headline);
      if (section.result.note && section.result.note !== section.result.headline) {
        pdfService.paragraph(doc, section.result.note);
      }
    }
  }

  pdfService.heading(doc, 'Before you fly');
  pdfService.bulletList(doc, [
    'This brief covers the general rules for your destination as a whole — always double-check anything city- or region-specific with a local source once you\'ve finalized your itinerary.',
    'Screenshot or print the sections that matter most for offline access — airport wifi and roaming aren\'t always reliable exactly when you need them.',
    'Traveling again? A Trip Brief covers one destination — check travelsmarterapp.com for pricing on unlimited future briefs.',
  ]);

  pdfService.addFooterCTA(doc);
  doc.end();

  return bufferPromise;
}

async function sendTripBriefEmail({ email, firstName, destinationName, pdfBuffer, destinationSlug }) {
  return emailService.sendEmail({
    to: email,
    subject: `✈️ Your ${destinationName} Trip Brief is ready`,
    html: `<p>Hi ${firstName || 'there'},</p>
<p>Your personalized <strong>${destinationName} Trip Brief</strong> is attached — every relevant check for your trip, combined into one PDF.</p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    attachments: [
      {
        content: pdfBuffer.toString('base64'),
        filename: `trip-brief-${destinationSlug}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  });
}

// @desc Create a Stripe Checkout session for a Trip Brief ($19 single trip
//   or $99 unlimited/lifetime) — or, if the email already has lifetime
//   access, skip payment entirely and generate+email the brief immediately.
// @route POST /api/trip-brief/checkout
// @access Public
exports.createCheckoutSession = async (req, res) => {
  try {
    const { destination, email, firstName, age, passportExpiryDate, product, sourcePage } = req.body;

    if (!destination || !email) {
      return res.status(400).json({ success: false, error: 'destination and email are required' });
    }
    const chosenProduct = product === 'lifetime' ? 'lifetime' : 'single';
    const normalizedEmail = email.toLowerCase().trim();

    let destinationName;
    try {
      destinationName = resolveDestination(destination).name;
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const trip = { destination, age: age || null, passportExpiryDate: passportExpiryDate || null, firstName };

    // Fail fast rather than take payment for a destination that somehow
    // produces zero sections (should not happen given the validation
    // above, but this is the actual guarantee that matters).
    const sectionCount = computeTripBriefSections(trip).length;
    if (sectionCount === 0) {
      return res.status(400).json({ success: false, error: 'No data available for this destination yet' });
    }

    // Existing lifetime customer — generate and send immediately, no charge.
    const lifetimeCheck = await pool.query(
      'SELECT id FROM trip_brief_lifetime_access WHERE email = $1',
      [normalizedEmail]
    );
    if (lifetimeCheck.rows.length > 0) {
      const leadResult = await pool.query(
        `INSERT INTO trip_briefs (email, first_name, destination_country, age, passport_expiry_date, product, status, source_page)
         VALUES ($1, $2, $3, $4, $5, 'lifetime', 'paid', $6)
         RETURNING id`,
        [normalizedEmail, firstName || null, destination, age || null, passportExpiryDate || null, sourcePage || null]
      );

      generateTripBriefPdfBuffer(trip, destinationName)
        .then(async (pdfBuffer) => {
          await sendTripBriefEmail({ email: normalizedEmail, firstName, destinationName, pdfBuffer, destinationSlug: destination });
          await pool.query(`UPDATE trip_briefs SET status = 'generated', pdf_generated_at = NOW() WHERE id = $1`, [leadResult.rows[0].id]);
          tripBriefEmailSequence.initializeTripBriefSequence(leadResult.rows[0].id, normalizedEmail, firstName).catch(err =>
            console.error('Failed to initialize Trip Brief buyer sequence:', err.message)
          );
        })
        .catch(err => console.error('Lifetime Trip Brief generation failed:', err.message));

      return res.status(200).json({ success: true, freeViaLifetime: true, message: 'Your Trip Brief is on its way to your inbox.' });
    }

    // New paid checkout
    const leadResult = await pool.query(
      `INSERT INTO trip_briefs (email, first_name, destination_country, age, passport_expiry_date, product, status, source_page)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING id`,
      [normalizedEmail, firstName || null, destination, age || null, passportExpiryDate || null, chosenProduct, sourcePage || null]
    );

    const session = await stripe.checkout.sessions.create({
      customer_email: normalizedEmail,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: PRICING[chosenProduct].name,
              description: PRICING[chosenProduct].description,
            },
            unit_amount: PRICING[chosenProduct].price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/trip-brief-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/trip-brief.html?destination=${destination}`,
      metadata: {
        type: 'trip_brief',
        tripBriefId: leadResult.rows[0].id,
        product: chosenProduct,
        destination,
      },
    });

    await pool.query(`UPDATE trip_briefs SET stripe_session_id = $1 WHERE id = $2`, [session.id, leadResult.rows[0].id]);

    res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Trip Brief checkout session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Called by subscriptionController's shared Stripe webhook handler when a
// checkout.session.completed event carries metadata.type === 'trip_brief'
// (that handler branches on session.mode/metadata before reaching its own
// subscription-specific logic, so no separate webhook endpoint/secret is
// needed in the Stripe Dashboard).
// @access Internal (called from subscriptionController, not routed directly)
exports.handleTripBriefCheckoutCompleted = async (session) => {
  const tripBriefId = session.metadata.tripBriefId;

  const briefResult = await pool.query('SELECT * FROM trip_briefs WHERE id = $1', [tripBriefId]);
  if (briefResult.rows.length === 0) {
    console.error(`Trip Brief not found: ${tripBriefId}`);
    return;
  }
  const brief = briefResult.rows[0];

  const amountPaid = typeof session.amount_total === 'number' ? session.amount_total / 100 : PRICING[brief.product].priceUSD;

  await pool.query(
    `UPDATE trip_briefs SET status = 'paid', stripe_payment_intent_id = $1, amount_paid = $2 WHERE id = $3`,
    [session.payment_intent, amountPaid, tripBriefId]
  );

  if (brief.product === 'lifetime') {
    await pool.query(
      `INSERT INTO trip_brief_lifetime_access (email, stripe_payment_intent_id)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [brief.email, session.payment_intent]
    );
  }

  console.log(`✅ Trip Brief paid: ${tripBriefId} (${brief.product}) for ${brief.email}`);

  try {
    const destinationName = resolveDestination(brief.destination_country).name;
    const trip = {
      destination: brief.destination_country,
      age: brief.age,
      passportExpiryDate: brief.passport_expiry_date,
      firstName: brief.first_name,
    };

    const pdfBuffer = await generateTripBriefPdfBuffer(trip, destinationName);
    await sendTripBriefEmail({
      email: brief.email,
      firstName: brief.first_name,
      destinationName,
      pdfBuffer,
      destinationSlug: brief.destination_country,
    });

    await pool.query(`UPDATE trip_briefs SET status = 'generated', pdf_generated_at = NOW() WHERE id = $1`, [tripBriefId]);
    tripBriefEmailSequence.initializeTripBriefSequence(tripBriefId, brief.email, brief.first_name).catch(err =>
      console.error('Failed to initialize Trip Brief buyer sequence:', err.message)
    );
  } catch (err) {
    console.error(`Trip Brief PDF generation/email failed for ${tripBriefId}:`, err.message);
    await pool.query(`UPDATE trip_briefs SET status = 'failed' WHERE id = $1`, [tripBriefId]).catch(() => {});
  }
};

exports.PRICING = PRICING;
