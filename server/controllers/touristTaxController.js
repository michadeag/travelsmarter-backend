const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Tourist/city tax presence per country. level: 'nationwide' (a national
// levy applies broadly, regardless of city) | 'some-cities' (varies by
// city/region — no single national rule) | 'none' (no widespread tourist
// tax as of writing). amountNote/paymentNote describe the typical pattern;
// always check the specific city since rates/rules can change.
const COUNTRIES = {
  japan: { name: 'Japan', level: 'nationwide', amountNote: '¥1,000 International Tourist Tax, charged once on departure.', paymentNote: 'Almost always bundled into your airfare automatically — you rarely pay it separately.', note: 'Applies to nearly all international departures regardless of which city you fly from.' },
  thailand: { name: 'Thailand', level: 'nationwide', amountNote: 'A tourist entry fee of around 300 THB.', paymentNote: 'Collection method has changed over time — check current status before travel, as it has been delayed/adjusted multiple times.', note: 'Intended to fund tourist infrastructure and insurance; applies regardless of city.' },
  malaysia: { name: 'Malaysia', level: 'nationwide', amountNote: 'A flat Tourism Tax of RM 10 per room, per night.', paymentNote: 'Paid directly at the hotel at check-in or check-out, in addition to the room rate.', note: 'Applies at hotels nationwide, not just tourist hotspots.' },
  'new-zealand': { name: 'New Zealand', level: 'nationwide', amountNote: 'An International Visitor Conservation and Tourism Levy (IVL), a flat one-time fee.', paymentNote: 'Usually collected as part of your visa or NZeTA application before arrival.', note: 'Funds conservation and tourism infrastructure nationwide.' },
  austria: { name: 'Austria', level: 'nationwide', amountNote: 'A per-night overnight tax ("Nächtigungstaxe" / "Ortstaxe"), typically a few percent of the room rate or a small flat fee.', paymentNote: 'Usually added to your hotel bill automatically, sometimes payable in cash at check-out.', note: 'Rates vary by state (Bundesland), but the tax itself is widespread nationwide.' },
  switzerland: { name: 'Switzerland', level: 'nationwide', amountNote: 'A per-night "Kurtaxe" (visitor\'s tax), typically CHF 1-7 depending on the resort/city.', paymentNote: 'Usually added to your hotel bill — many towns issue a guest card in return that gives discounts on local transport/attractions.', note: 'Widespread across cantons, especially in resort and mountain towns.' },
  indonesia: { name: 'Indonesia', level: 'some-cities', amountNote: 'Bali charges a one-time Rp 150,000 (roughly $10) foreign tourist levy.', paymentNote: 'Payable online in advance or on arrival at Bali\'s airport/ports.', note: 'Specific to Bali — most of the rest of Indonesia does not currently charge this.' },
  mexico: { name: 'Mexico', level: 'some-cities', amountNote: 'Quintana Roo state (Cancún, Playa del Carmen, Tulum) charges a "Visitax" of roughly $15-20 per person.', paymentNote: 'Payable online in advance or in person before departure.', note: 'Specific to the Cancún/Riviera Maya region — most of Mexico does not currently charge this.' },

  spain: { name: 'Spain', level: 'some-cities', amountNote: 'Catalonia (Barcelona) and the Balearic Islands charge €1-4 per night, scaled by accommodation type.', paymentNote: 'Usually added to your hotel bill, sometimes payable at check-in.', note: 'Not nationwide — Madrid, for example, does not currently charge a tourist tax, while Barcelona does.' },
  italy: { name: 'Italy', level: 'some-cities', amountNote: 'Rome, Venice, Florence, and Milan (among others) charge roughly €1-7 per night depending on hotel category.', paymentNote: 'Usually paid in cash directly to your hotel, often not payable by card.', note: 'Venice also separately charges a day-tripper entry fee on certain peak days for visitors not staying overnight.' },
  france: { name: 'France', level: 'nationwide', amountNote: 'A "taxe de séjour" applies in the vast majority of French cities and towns, typically €0.20-€5+ per night depending on location and accommodation category.', paymentNote: 'Usually added to your accommodation bill automatically, sometimes payable separately at check-in.', note: 'One of the most widespread tourist tax systems in Europe — assume it applies almost anywhere in France.' },
  germany: { name: 'Germany', level: 'some-cities', amountNote: 'Berlin, Cologne, Hamburg, and Frankfurt (among others) charge roughly 5% of the room rate or a small flat fee per night.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Called "Bettensteuer" or "Kulturförderabgabe" depending on the city — not nationwide.' },
  netherlands: { name: 'Netherlands', level: 'some-cities', amountNote: 'Amsterdam has one of the highest tourist taxes in Europe — a percentage of the room rate plus a flat per-night fee.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Amsterdam is the notable case — rates vary in other Dutch cities.' },
  portugal: { name: 'Portugal', level: 'some-cities', amountNote: 'Lisbon and Porto charge roughly €2-4 per night, usually capped at a maximum number of nights.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Not nationwide — smaller towns often don\'t charge it.' },
  greece: { name: 'Greece', level: 'some-cities', amountNote: 'A "climate crisis resilience fee" applies per night, scaled by accommodation category and season — higher in peak summer months.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Applies more broadly across popular islands and Athens than many other European tourist taxes.' },
  croatia: { name: 'Croatia', level: 'nationwide', amountNote: 'A per-night "sojourn tax" applies broadly, typically €1-2, higher in peak season.', paymentNote: 'Usually added to your accommodation bill automatically.', note: 'Applies nationwide, not just in Dubrovnik or Split.' },
  'czech-republic': { name: 'Czech Republic', level: 'some-cities', amountNote: 'Prague charges a modest per-night fee, typically a few dozen crowns.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Concentrated in Prague and a few other tourist centers.' },
  hungary: { name: 'Hungary', level: 'some-cities', amountNote: 'Budapest charges roughly 4% of the room rate per night.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Concentrated in Budapest.' },
  belgium: { name: 'Belgium', level: 'some-cities', amountNote: 'Brussels and Bruges charge a modest per-night fee, typically a few euros.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Varies by city — not a single national rate.' },

  'united-states': { name: 'United States', level: 'some-cities', amountNote: 'Most major cities (New York, Los Angeles, Las Vegas, and many others) charge a hotel occupancy tax, typically 10-17% of the room rate plus sometimes a flat resort fee.', paymentNote: 'Usually included in your hotel bill at checkout, sometimes shown separately as taxes and fees during booking.', note: 'Extremely common across US cities, though the exact rate is set locally, not federally.' },
  'united-kingdom': { name: 'United Kingdom', level: 'some-cities', amountNote: 'A small number of cities (including Manchester and parts of Wales) have introduced a modest nightly visitor levy.', paymentNote: 'Usually added to your hotel bill automatically where it applies.', note: 'Still uncommon compared to continental Europe, but expanding to more UK cities over time.' },

  'south-africa': { name: 'South Africa', level: 'none', note: 'No widespread tourist tax as of writing.' },
  kenya: { name: 'Kenya', level: 'none', note: 'No widespread tourist tax as of writing, though park/conservancy entrance fees apply separately for safaris.' },
  morocco: { name: 'Morocco', level: 'some-cities', amountNote: 'A modest "taxe de séjour" applies in some cities, typically a small flat fee per night.', paymentNote: 'Usually paid in cash at your accommodation.', note: 'Varies significantly by city and hotel category.' },
  egypt: { name: 'Egypt', level: 'none', note: 'No widespread tourist tax as of writing, beyond standard entry visa fees.' },
  turkey: { name: 'Turkey', level: 'nationwide', amountNote: 'A nationwide accommodation tax of 2% of the room rate applies across the country.', paymentNote: 'Usually included in your hotel bill automatically.', note: 'Applies broadly, not just in Istanbul.' },
  'united-arab-emirates': { name: 'United Arab Emirates', level: 'nationwide', amountNote: 'A "Tourism Dirham" fee applies per night in both Dubai and Abu Dhabi, typically AED 7-20 depending on hotel category.', paymentNote: 'Usually added to your hotel bill automatically.', note: 'Applies across both major emirates, with slightly different rates.' },
  'saudi-arabia': { name: 'Saudi Arabia', level: 'none', note: 'No widespread tourist tax as of writing.' },
  israel: { name: 'Israel', level: 'none', note: 'No widespread tourist tax as of writing.' },
  jordan: { name: 'Jordan', level: 'none', note: 'No widespread tourist tax as of writing, beyond standard entry visa fees.' },

  vietnam: { name: 'Vietnam', level: 'none', note: 'No widespread tourist tax as of writing.' },
  cambodia: { name: 'Cambodia', level: 'none', note: 'No widespread tourist tax as of writing, though a separate Angkor Archaeological Park pass is required for temple visits.' },
  philippines: { name: 'Philippines', level: 'some-cities', amountNote: 'Some destinations (notably Boracay and Palawan/El Nido) charge a small environmental or terminal fee.', paymentNote: 'Usually paid in cash on arrival or at the airport/port.', note: 'Not a general nationwide hotel tax — more of a destination entry fee in specific tourist areas.' },
  singapore: { name: 'Singapore', level: 'none', note: 'No widespread tourist tax as of writing.' },
  china: { name: 'China', level: 'none', note: 'No widespread tourist tax as of writing.' },
  india: { name: 'India', level: 'some-cities', amountNote: 'Some states charge a "luxury tax" on hotel rooms above a certain price threshold, varying by state.', paymentNote: 'Usually included in your hotel bill.', note: 'Varies significantly by state — not a single national rule.' },
  'south-korea': { name: 'South Korea', level: 'none', note: 'No widespread tourist tax as of writing.' },

  canada: { name: 'Canada', level: 'some-cities', amountNote: 'Most provinces/cities apply a destination marketing fee or municipal accommodation tax, typically 2-6% of the room rate.', paymentNote: 'Usually included in your hotel bill.', note: 'Varies by province and city — not a single national rate.' },
  brazil: { name: 'Brazil', level: 'none', note: 'No widespread tourist tax as of writing.' },
  argentina: { name: 'Argentina', level: 'none', note: 'No widespread tourist tax as of writing.' },
  peru: { name: 'Peru', level: 'none', note: 'No widespread tourist tax as of writing, beyond standard site entry fees (e.g. Machu Picchu).' },
  colombia: { name: 'Colombia', level: 'none', note: 'No widespread tourist tax as of writing.' },
  'costa-rica': { name: 'Costa Rica', level: 'none', note: 'No widespread tourist tax as of writing, beyond a departure tax often bundled into airfare.' },

  poland: { name: 'Poland', level: 'some-cities', amountNote: 'Some cities charge a modest "climate fee" or spa fee, typically a small flat amount per night.', paymentNote: 'Usually added to your accommodation bill.', note: 'Varies by city — not nationwide.' },
  norway: { name: 'Norway', level: 'none', note: 'No widespread tourist tax as of writing, though this is under active discussion in several municipalities.' },
  sweden: { name: 'Sweden', level: 'none', note: 'No widespread tourist tax as of writing.' },
  denmark: { name: 'Denmark', level: 'none', note: 'No widespread tourist tax as of writing.' },
  iceland: { name: 'Iceland', level: 'nationwide', amountNote: 'A per-night accommodation tax applies nationwide, a modest flat fee.', paymentNote: 'Usually included in your accommodation bill automatically.', note: 'Applies broadly across the country, not just Reykjavik.' },
  ireland: { name: 'Ireland', level: 'none', note: 'No widespread tourist tax as of writing.' },

  australia: { name: 'Australia', level: 'none', note: 'No widespread tourist tax as of writing.' },
};

const LEVEL_LABELS = {
  nationwide: 'charges a tourist/accommodation tax nationwide',
  'some-cities': 'has a tourist tax in some cities, not nationwide',
  none: 'has no widespread tourist tax as of writing',
};

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const headline = `${data.name} ${LEVEL_LABELS[data.level]}.`;

  return {
    country, countryName: data.name, level: data.level, levelLabel: LEVEL_LABELS[data.level],
    amountNote: data.amountNote || null, paymentNote: data.paymentNote || null, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/tourist-tax-checker/calculate
// @access Public
exports.calculateTouristTax = (req, res) => {
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
// @route POST /api/tools/tourist-tax-checker/pdf
// @access Public
exports.generateTouristTaxPdf = async (req, res) => {
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
      [email, firstName || null, 'tourist-tax-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Tourist Tax Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tourist-tax-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    if (result.amountNote) {
      pdfService.heading(doc, 'Typical amount');
      pdfService.paragraph(doc, result.amountNote);
    }
    if (result.paymentNote) {
      pdfService.heading(doc, 'How it\'s usually paid');
      pdfService.paragraph(doc, result.paymentNote);
    }
    pdfService.heading(doc, 'Good to know');
    pdfService.paragraph(doc, result.note);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      'Tourist taxes are almost never included in the price shown by booking sites — budget a small buffer per night, especially in cities known for it.',
      'Many tourist taxes are cash-only, paid directly at your accommodation — keep some local currency on hand for check-in/check-out.',
      'Rates and rules change relatively often — this guide reflects general, widely-known patterns rather than a real-time official source, so it\'s worth a quick check closer to your travel dates.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🏨 Your ${result.countryName} tourist tax check`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your tourist tax check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond hidden fees? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send tourist-tax-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateTouristTaxPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
