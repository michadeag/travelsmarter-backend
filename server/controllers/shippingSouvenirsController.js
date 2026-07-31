const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Shipping reliability for sending souvenirs or packages home per
// destination — distinct from souvenirExportController.js (legal export
// restrictions on what you're allowed to take out, not shipping
// logistics/reliability). shippingLevel: 'reliable-postal' (the national
// postal service is reliable and commonly used for sending packages home,
// reasonably priced) | 'courier-recommended' (private couriers like
// DHL/FedEx are the practical, dependable option — national post is
// slower or less reliable for anything you care about) | 'limited-
// reliable' (options exist but are pricier or less predictable — insure
// and track anything valuable) | 'carry-it-yourself' (formal shipping
// options are genuinely hard to access or unreliable — better to carry
// souvenirs home in your luggage than trust the mail).
const COUNTRIES = {
  france: { name: 'France', shippingLevel: 'reliable-postal', note: 'La Poste is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  austria: { name: 'Austria', shippingLevel: 'reliable-postal', note: 'Austrian Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'czech-republic': { name: 'Czech Republic', shippingLevel: 'reliable-postal', note: 'Czech Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  denmark: { name: 'Denmark', shippingLevel: 'reliable-postal', note: 'PostNord is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  germany: { name: 'Germany', shippingLevel: 'reliable-postal', note: 'Deutsche Post/DHL (a German company) is extremely reliable for international shipping — sending souvenirs home by post is a genuinely dependable option.' },
  greece: { name: 'Greece', shippingLevel: 'courier-recommended', note: 'Greek postal service can be inconsistent for international shipping — a private courier (DHL, UPS) is the more dependable option for anything you care about.' },
  hungary: { name: 'Hungary', shippingLevel: 'reliable-postal', note: 'Hungarian Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  iceland: { name: 'Iceland', shippingLevel: 'reliable-postal', note: 'Icelandic postal service is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  italy: { name: 'Italy', shippingLevel: 'courier-recommended', note: 'Italian postal service has a real reputation for inconsistency on international shipments — a private courier (DHL, UPS) is the more dependable option for anything you care about.' },
  netherlands: { name: 'Netherlands', shippingLevel: 'reliable-postal', note: 'PostNL is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  portugal: { name: 'Portugal', shippingLevel: 'reliable-postal', note: 'CTT (Portuguese post) is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  spain: { name: 'Spain', shippingLevel: 'reliable-postal', note: 'Correos is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  sweden: { name: 'Sweden', shippingLevel: 'reliable-postal', note: 'PostNord is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  switzerland: { name: 'Switzerland', shippingLevel: 'reliable-postal', note: 'Swiss Post is extremely reliable for international shipping — sending souvenirs home by post is a genuinely dependable option.' },
  ireland: { name: 'Ireland', shippingLevel: 'reliable-postal', note: 'An Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'united-kingdom': { name: 'United Kingdom', shippingLevel: 'reliable-postal', note: 'Royal Mail is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  turkey: { name: 'Turkey', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, UPS) is the more dependable option for international shipping — Turkish national post is less consistent for items you care about.' },
  japan: { name: 'Japan', shippingLevel: 'reliable-postal', note: 'Japan Post is extremely reliable and efficient for international shipping — sending souvenirs home by post (including convenient forwarding services) is a genuinely dependable option.' },
  thailand: { name: 'Thailand', shippingLevel: 'courier-recommended', note: 'Thai Post is usable, but a private courier (DHL, UPS) is the more dependable option for international shipments you actually care about.' },
  indonesia: { name: 'Indonesia', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, UPS) is the more dependable option for international shipping — Indonesian national post is less consistent for items you care about.' },
  singapore: { name: 'Singapore', shippingLevel: 'reliable-postal', note: 'SingPost is reliable and efficient for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'south-korea': { name: 'South Korea', shippingLevel: 'reliable-postal', note: 'Korea Post is reliable and efficient for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'hong-kong': { name: 'Hong Kong', shippingLevel: 'reliable-postal', note: 'Hongkong Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  vietnam: { name: 'Vietnam', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, UPS) is the more dependable option for international shipping — Vietnamese national post is less consistent for items you care about.' },
  philippines: { name: 'Philippines', shippingLevel: 'limited-reliable', note: 'Philippine postal service has a real reputation for unreliable international delivery — if you use it, insure and track anything valuable, or use a private courier instead.' },
  malaysia: { name: 'Malaysia', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, UPS) is the more dependable option for international shipping — Malaysian national post is less consistent for items you care about.' },
  china: { name: 'China', shippingLevel: 'courier-recommended', note: 'International post from China can be slow and inconsistent — a private courier (DHL, SF Express, UPS) is the more dependable option for anything you care about.' },
  india: { name: 'India', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Indian national post is less consistent for items you care about.' },
  maldives: { name: 'Maldives', shippingLevel: 'carry-it-yourself', note: 'Formal shipping infrastructure is genuinely limited given the resort-island format — carrying souvenirs home in your luggage is the practical option.' },
  taiwan: { name: 'Taiwan', shippingLevel: 'reliable-postal', note: 'Chunghwa Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'sri-lanka': { name: 'Sri Lanka', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent — insure and track anything valuable, or consider a private courier instead.' },
  cambodia: { name: 'Cambodia', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent — insure and track anything valuable, or consider a private courier instead.' },
  australia: { name: 'Australia', shippingLevel: 'reliable-postal', note: 'Australia Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'new-zealand': { name: 'New Zealand', shippingLevel: 'reliable-postal', note: 'New Zealand Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  fiji: { name: 'Fiji', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable.' },
  'french-polynesia': { name: 'French Polynesia', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure on outer islands — insure and track anything valuable.' },
  mexico: { name: 'Mexico', shippingLevel: 'courier-recommended', note: 'Mexican national post has a real reputation for unreliable international delivery — a private courier (DHL, UPS) is the more dependable option.' },
  'dominican-republic': { name: 'Dominican Republic', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent — insure and track anything valuable, or consider a private courier.' },
  'puerto-rico': { name: 'Puerto Rico', shippingLevel: 'reliable-postal', note: 'As a US territory, USPS service is reliable — sending souvenirs home by post is a normal, dependable option.' },
  bahamas: { name: 'Bahamas', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable.' },
  jamaica: { name: 'Jamaica', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent — insure and track anything valuable, or consider a private courier.' },
  aruba: { name: 'Aruba', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable.' },
  'turks-and-caicos': { name: 'Turks and Caicos', shippingLevel: 'carry-it-yourself', note: 'Formal shipping infrastructure is genuinely limited given the small size of the islands — carrying souvenirs home in your luggage is the practical option.' },
  'st-lucia': { name: 'St. Lucia', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable.' },
  'costa-rica': { name: 'Costa Rica', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Costa Rican national post is less consistent for items you care about.' },
  panama: { name: 'Panama', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Panamanian national post is less consistent for items you care about.' },
  belize: { name: 'Belize', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable.' },
  'cayman-islands': { name: 'Cayman Islands', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable, or consider a private courier.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent given the limited infrastructure — insure and track anything valuable.' },
  curacao: { name: 'Curaçao', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent — insure and track anything valuable, or consider a private courier.' },
  canada: { name: 'Canada', shippingLevel: 'reliable-postal', note: 'Canada Post is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
  'united-arab-emirates': { name: 'United Arab Emirates', shippingLevel: 'reliable-postal', note: 'Emirates Post and an extensive courier network make shipping genuinely reliable — sending souvenirs home is a dependable option, especially via DHL, which has a major regional hub in Dubai.' },
  morocco: { name: 'Morocco', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, UPS) is the more dependable option for international shipping — Moroccan national post is less consistent for items you care about.' },
  'south-africa': { name: 'South Africa', shippingLevel: 'courier-recommended', note: 'The South African Post Office has had well-documented reliability issues in recent years — a private courier (DHL, FedEx) is the genuinely more dependable option.' },
  qatar: { name: 'Qatar', shippingLevel: 'reliable-postal', note: 'Qatar Post and a well-developed courier network make shipping reliable in Doha — sending souvenirs home is a dependable option.' },
  israel: { name: 'Israel', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Israeli national post is less consistent and can be slower for items you care about.' },
  tanzania: { name: 'Tanzania', shippingLevel: 'limited-reliable', note: 'Postal reliability for international shipments is inconsistent, especially from remote safari areas — insure and track anything valuable, or arrange shipping through your lodge.' },
  kenya: { name: 'Kenya', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Kenyan national post is less consistent for items you care about.' },
  argentina: { name: 'Argentina', shippingLevel: 'courier-recommended', note: 'Argentine customs and postal processing for international shipments can be slow and unpredictable — a private courier (DHL, FedEx) is the more dependable, if pricier, option.' },
  peru: { name: 'Peru', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Peruvian national post is less consistent for items you care about.' },
  chile: { name: 'Chile', shippingLevel: 'reliable-postal', note: 'Correos de Chile is reasonably reliable for international shipping — sending souvenirs home by post is a workable, dependable option.' },
  colombia: { name: 'Colombia', shippingLevel: 'courier-recommended', note: 'A private courier (DHL, FedEx) is the more dependable option for international shipping — Colombian national post is less consistent for items you care about.' },
  brazil: { name: 'Brazil', shippingLevel: 'limited-reliable', note: 'Correios has well-documented reliability and customs-delay issues for international packages — insure and track anything valuable, and expect real delays even with a private courier.' },
  'united-states': { name: 'United States', shippingLevel: 'reliable-postal', note: 'USPS is reliable for international shipping — sending souvenirs home by post is a normal, dependable option.' },
};

const SHIPPING_LABELS = {
  'reliable-postal': 'Reliable — National Post Works Fine',
  'courier-recommended': 'Use a Courier — DHL/FedEx Over National Post',
  'limited-reliable': 'Limited — Insure and Track Anything Valuable',
  'carry-it-yourself': "Carry It Yourself — Shipping Isn't Practical",
};

const DISCLAIMER = "This reflects general reputation, not a guarantee for any specific shipment — service quality varies by branch and season everywhere, and customs processing time is a separate factor from the carrier itself. For anything genuinely valuable or irreplaceable, insurance and tracking are worth it regardless of the destination's overall reputation.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const shippingLabel = SHIPPING_LABELS[data.shippingLevel];
  const headline = `${data.name}: ${shippingLabel}.`;

  return {
    country, countryName: data.name, shippingLevel: data.shippingLevel, shippingLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/shipping-souvenirs-checker/calculate
// @access Public
exports.calculateShippingSouvenirs = (req, res) => {
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
// @route POST /api/tools/shipping-souvenirs-checker/pdf
// @access Public
exports.generateShippingSouvenirsPdf = async (req, res) => {
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
      [email, firstName || null, 'shipping-souvenirs-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Shipping Souvenirs Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="shipping-souvenirs-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.shippingLabel);

    pdfService.heading(doc, 'General shipping tips');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'Take a photo of the contents and get a tracking number for anything you ship — it makes a customs or lost-package claim far easier if something goes wrong.',
      'Check the destination country\'s customs rules too — some items that were legal to buy can trigger duties or extra paperwork when they arrive at your home address.',
      'For anything genuinely irreplaceable or high-value, the safest option everywhere is carrying it in your luggage rather than shipping it at all.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📦 Your ${result.countryName} shipping guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the shipping reliability check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond shipping logistics? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send shipping-souvenirs-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateShippingSouvenirsPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
