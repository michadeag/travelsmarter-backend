const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Taxi fare norms per destination — how street-hail taxi pricing actually
// works, distinct from rideshareController.js (which covers app
// availability, not traditional taxi practice). fareLevel: 'metered'
// (meters are standard, legally required, and reliably used — insist on
// one) | 'negotiate' (fares are typically agreed upfront before the ride,
// since metering isn't standard or reliably enforced) | 'app-based'
// (a ride-hailing app is the practical default for visitors, sidestepping
// street-taxi fare uncertainty altogether).
const COUNTRIES = {
  france: { name: 'France', fareLevel: 'metered', note: 'Taxis are legally required to use a meter — insist on one being switched on, and be aware of a legitimate flat rate that sometimes applies from certain airports.' },
  austria: { name: 'Austria', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  'czech-republic': { name: 'Czech Republic', fareLevel: 'metered', note: 'Taxis are legally required to be metered — overcharging tourists by manipulating meters is a known issue in Prague, so stick to official taxi ranks or reputable companies.' },
  denmark: { name: 'Denmark', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  germany: { name: 'Germany', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated — insist on the meter being used.' },
  greece: { name: 'Greece', fareLevel: 'metered', note: 'Taxis are legally required to be metered, with a legitimate flat rate from Athens International Airport — insist on the meter for regular city rides.' },
  hungary: { name: 'Hungary', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used, and stick to official yellow taxis in Budapest.' },
  iceland: { name: 'Iceland', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  italy: { name: 'Italy', fareLevel: 'metered', note: 'Taxis are legally required to be metered, though some cities have legitimate flat rates for airport transfers — confirm which applies before you get in.' },
  netherlands: { name: 'Netherlands', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  portugal: { name: 'Portugal', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  spain: { name: 'Spain', fareLevel: 'metered', note: 'Taxis are legally required to be metered, with a legitimate flat rate from some airports — confirm which applies before you get in.' },
  sweden: { name: 'Sweden', fareLevel: 'metered', note: "Taxis use meters, but prices aren't centrally regulated — rates can vary a lot between companies, so check the price sticker on the window before getting in, especially at airports." },
  switzerland: { name: 'Switzerland', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  ireland: { name: 'Ireland', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  'united-kingdom': { name: 'United Kingdom', fareLevel: 'metered', note: 'Black cabs are metered and tightly regulated — minicabs, by contrast, should always have the fare agreed before the ride, since they don\'t use meters.' },
  turkey: { name: 'Turkey', fareLevel: 'metered', note: 'Taxis are legally required to be metered — meter tampering and overcharging tourists is a documented issue in Istanbul, so watch the meter and stick to official taxi ranks where possible.' },
  japan: { name: 'Japan', fareLevel: 'metered', note: 'Taxis are metered and extremely reliably regulated — overcharging is essentially unheard of.' },
  thailand: { name: 'Thailand', fareLevel: 'app-based', note: 'Taxis are legally required to be metered, but drivers frequently refuse the meter with tourists and push for an inflated flat fare — using Grab sidesteps the whole negotiation and shows the price upfront.' },
  indonesia: { name: 'Indonesia', fareLevel: 'app-based', note: 'Gojek and Grab are the practical default — fixed, transparent pricing avoids the fare negotiation that comes with flagging down a street taxi.' },
  singapore: { name: 'Singapore', fareLevel: 'metered', note: 'Taxis are metered and tightly regulated — surcharges (peak hours, midnight, airport) are standardized and posted, not negotiated.' },
  'south-korea': { name: 'South Korea', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated — insist on the meter being used.' },
  'hong-kong': { name: 'Hong Kong', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated — insist on the meter being used.' },
  vietnam: { name: 'Vietnam', fareLevel: 'app-based', note: 'Grab is the practical default — reputable metered taxi companies exist (Vinasun, Mai Linh), but rigged meters and overcharging are documented issues with less reputable operators, so an app sidesteps the risk.' },
  philippines: { name: 'Philippines', fareLevel: 'app-based', note: 'Grab is the practical default — taxis are technically metered, but refusal to use the meter and fare negotiation with tourists is common, especially outside Manila.' },
  malaysia: { name: 'Malaysia', fareLevel: 'app-based', note: 'Grab is the practical default — taxis are technically metered, but drivers frequently refuse the meter and negotiate a flat (often inflated) fare with tourists.' },
  china: { name: 'China', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated in most cities — Didi (the local ride-hailing app) is also widely used and offers upfront pricing.' },
  india: { name: 'India', fareLevel: 'app-based', note: 'Ola and Uber are the practical default in most cities — auto-rickshaws and traditional taxis are often negotiated upfront, and meter disputes with tourists are a documented issue.' },
  maldives: { name: 'Maldives', fareLevel: 'negotiate', note: 'The resort-island format means traditional taxis rarely come up — transport is typically arranged directly through your resort or via speedboat/seaplane transfer with a fixed, pre-arranged price.' },
  taiwan: { name: 'Taiwan', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated — insist on the meter being used.' },
  'sri-lanka': { name: 'Sri Lanka', fareLevel: 'app-based', note: "PickMe (the local ride-hailing app) is genuinely recommended over flagging down a street tuk-tuk or taxi, which typically involves negotiating the fare upfront and can mean overpaying without local price knowledge." },
  cambodia: { name: 'Cambodia', fareLevel: 'negotiate', note: 'Tuk-tuks and taxis typically require agreeing the fare before the ride — metering isn\'t standard practice, so confirm the price upfront, ideally with a rough sense of the going rate.' },
  australia: { name: 'Australia', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  'new-zealand': { name: 'New Zealand', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  fiji: { name: 'Fiji', fareLevel: 'negotiate', note: 'Taxis outside main towns typically require agreeing the fare before the ride — metering exists in Nadi and Suva but isn\'t universally used.' },
  'french-polynesia': { name: 'French Polynesia', fareLevel: 'negotiate', note: 'Taxis typically require agreeing the fare before the ride, and rates can run high given the limited competition on most islands.' },
  mexico: { name: 'Mexico', fareLevel: 'app-based', note: 'Uber is genuinely recommended over hailing a street taxi, particularly for safety reasons in some cities — metered taxis exist in Mexico City but fare disputes and overcharging tourists are documented issues.' },
  'dominican-republic': { name: 'Dominican Republic', fareLevel: 'negotiate', note: 'Taxis typically require agreeing the fare before the ride — metering isn\'t standard practice, so confirm the price upfront.' },
  'puerto-rico': { name: 'Puerto Rico', fareLevel: 'metered', note: 'Taxis in San Juan are metered, with legitimate fixed zone rates for tourist-area routes — confirm which applies before you get in.' },
  bahamas: { name: 'Bahamas', fareLevel: 'negotiate', note: 'Taxi fares are set by an official government rate chart based on zones and distance rather than a meter — ask the driver to confirm the rate before the ride.' },
  jamaica: { name: 'Jamaica', fareLevel: 'negotiate', note: 'Taxis typically require agreeing the fare before the ride — metering isn\'t standard practice, so confirm the price upfront, ideally through your hotel.' },
  aruba: { name: 'Aruba', fareLevel: 'negotiate', note: 'Taxi fares follow an official government rate chart based on zones rather than a meter — confirm the rate with the driver before the ride.' },
  'turks-and-caicos': { name: 'Turks and Caicos', fareLevel: 'negotiate', note: 'Taxi fares typically follow a set rate based on destination rather than a meter — confirm the price with the driver before the ride.' },
  'st-lucia': { name: 'St. Lucia', fareLevel: 'negotiate', note: 'Taxis typically require agreeing the fare before the ride — metering isn\'t standard practice, so confirm the price upfront, ideally through your hotel.' },
  'costa-rica': { name: 'Costa Rica', fareLevel: 'metered', note: 'Official red taxis are legally required to use a meter ("maría") — insist on it, and be wary of unofficial taxis offering a flat rate instead.' },
  panama: { name: 'Panama', fareLevel: 'app-based', note: 'Uber is genuinely recommended over street taxis in Panama City — taxis are technically metered but negotiation and overcharging tourists is common in practice.' },
  belize: { name: 'Belize', fareLevel: 'negotiate', note: 'Taxis typically require agreeing the fare before the ride — metering isn\'t standard practice, so confirm the price upfront.' },
  'cayman-islands': { name: 'Cayman Islands', fareLevel: 'negotiate', note: 'Taxi fares follow an official government rate chart based on zones rather than a meter — confirm the rate with the driver before the ride.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', fareLevel: 'negotiate', note: 'Taxi fares follow an official government rate chart based on zones rather than a meter — confirm the rate with the driver before the ride.' },
  curacao: { name: 'Curaçao', fareLevel: 'negotiate', note: 'Taxi fares follow an official rate chart based on zones rather than a meter — confirm the rate with the driver before the ride.' },
  canada: { name: 'Canada', fareLevel: 'metered', note: 'Taxis are metered and well-regulated — insist on the meter being used.' },
  'united-arab-emirates': { name: 'United Arab Emirates', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated, particularly in Dubai — insist on the meter being used.' },
  morocco: { name: 'Morocco', fareLevel: 'negotiate', note: 'Petit taxis are technically metered by law, but drivers frequently refuse the meter with tourists — agreeing the fare before the ride is the practical norm, especially outside Casablanca.' },
  'south-africa': { name: 'South Africa', fareLevel: 'app-based', note: 'Uber and Bolt are genuinely recommended over street taxis, both for transparent pricing and general safety practice for visitors.' },
  qatar: { name: 'Qatar', fareLevel: 'metered', note: 'Taxis are metered and reliably regulated in Doha — insist on the meter being used.' },
  israel: { name: 'Israel', fareLevel: 'app-based', note: 'Gett (the local ride-hailing app) is genuinely recommended for upfront pricing — street taxis are technically metered but fare negotiation with tourists, especially for intercity or airport rides, is common.' },
  tanzania: { name: 'Tanzania', fareLevel: 'negotiate', note: 'Taxis typically require agreeing the fare before the ride — metering isn\'t standard practice, so confirm the price upfront, ideally through your hotel or lodge.' },
  kenya: { name: 'Kenya', fareLevel: 'app-based', note: 'Uber and Bolt are genuinely recommended in Nairobi for transparent, upfront pricing — traditional taxis typically require fare negotiation.' },
  argentina: { name: 'Argentina', fareLevel: 'metered', note: 'Taxis are metered and generally well-regulated, especially in Buenos Aires — insist on the meter being used.' },
  peru: { name: 'Peru', fareLevel: 'app-based', note: 'Uber is genuinely recommended in Lima for transparent, upfront pricing and general safety practice — traditional taxis typically require fare negotiation.' },
  chile: { name: 'Chile', fareLevel: 'metered', note: 'Taxis are metered and generally well-regulated, especially in Santiago — insist on the meter being used.' },
  colombia: { name: 'Colombia', fareLevel: 'app-based', note: 'Uber and inDriver are genuinely recommended over street taxis in Bogotá and Medellín, both for transparent pricing and general safety practice.' },
  brazil: { name: 'Brazil', fareLevel: 'app-based', note: 'Uber is extremely dominant and genuinely recommended over street taxis, both for transparent pricing and general safety practice for visitors.' },
  'united-states': { name: 'United States', fareLevel: 'metered', note: 'Traditional taxis in most major cities are metered and regulated — ride-hailing apps (Uber, Lyft) are equally standard and often preferred for upfront pricing.' },
};

const FARE_LABELS = {
  metered: 'Metered — Insist On It, By Law',
  negotiate: 'Negotiate — Agree the Fare Upfront',
  'app-based': 'App-Based — Skip Street Taxis Altogether',
};

const DISCLAIMER = "This reflects general practice, not a guarantee for every taxi or driver — even in well-regulated destinations, individual drivers sometimes try to skip the meter with tourists specifically. When in doubt, agree on the fare (or confirm the meter is running) before the car pulls away, not after you arrive.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const fareLabel = FARE_LABELS[data.fareLevel];
  const headline = `${data.name}: ${fareLabel}.`;

  return {
    country, countryName: data.name, fareLevel: data.fareLevel, fareLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/taxi-fare-checker/calculate
// @access Public
exports.calculateTaxiFare = (req, res) => {
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
// @route POST /api/tools/taxi-fare-checker/pdf
// @access Public
exports.generateTaxiFarePdf = async (req, res) => {
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
      [email, firstName || null, 'taxi-fare-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Taxi Fare Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="taxi-fare-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.fareLabel);

    pdfService.heading(doc, 'General taxi fare tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If a metered taxi driver refuses to start the meter, that\'s a signal to either insist firmly, get out and find another cab, or switch to a ride-hailing app if one is available.',
      'In "negotiate" destinations, asking your hotel or a local for a rough expected fare before you flag a cab gives you a real number to negotiate against, rather than guessing.',
      'Screenshot or note your ride-hailing app\'s quoted price before confirming — in a few places, prices can shift between the quote and pickup.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚕 Your ${result.countryName} taxi fare guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the taxi fare check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond getting around town? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send taxi-fare-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateTaxiFarePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
