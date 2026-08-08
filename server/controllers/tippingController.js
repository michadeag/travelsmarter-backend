const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Restaurant tipping norm per country, reused from Tool #3's country list.
// tipPercent is a typical/expected restaurant tip; note explains context
// (service charge already included, cash preferred, cultural sensitivities, etc.)
const COUNTRIES = {
  france: { name: 'France', tipPercent: 0, note: 'A service charge is legally included in the bill (service compris). Rounding up or leaving small change for good service is appreciated but not expected.' },
  austria: { name: 'Austria', tipPercent: 5, note: 'Round up or add about 5-10%, usually handed directly to the server rather than left on the table.' },
  'czech-republic': { name: 'Czech Republic', tipPercent: 10, note: 'About 10% is standard in restaurants, usually rounded up or handed to the server.' },
  denmark: { name: 'Denmark', tipPercent: 0, note: 'Service is included in the price. Rounding up is appreciated for great service but not expected.' },
  germany: { name: 'Germany', tipPercent: 5, note: 'Round up or add about 5-10%, stated as a total to the server rather than left on the table.' },
  greece: { name: 'Greece', tipPercent: 10, note: 'About 5-10% is appreciated, especially in tourist areas, though not strictly required.' },
  hungary: { name: 'Hungary', tipPercent: 10, note: 'About 10% is standard and often expected, especially in Budapest.' },
  iceland: { name: 'Iceland', tipPercent: 0, note: 'Service is included in prices. Tipping is not expected and can even feel unusual to locals.' },
  italy: { name: 'Italy', tipPercent: 0, note: 'A cover charge (coperto) is often already added. Rounding up or leaving a few euros for good service is common but not required.' },
  netherlands: { name: 'Netherlands', tipPercent: 5, note: 'Service is often included, but rounding up or adding 5-10% for good service is common.' },
  portugal: { name: 'Portugal', tipPercent: 5, note: 'About 5-10% is appreciated in restaurants, though not strictly required.' },
  spain: { name: 'Spain', tipPercent: 5, note: 'Rounding up or adding a few euros is common; a full 15-20% is not expected.' },
  sweden: { name: 'Sweden', tipPercent: 0, note: 'Service is included in prices. Rounding up is appreciated but tipping isn\'t expected.' },
  switzerland: { name: 'Switzerland', tipPercent: 0, note: 'Service is legally included in the price. Rounding up is common but not required.' },
  ireland: { name: 'Ireland', tipPercent: 10, note: 'About 10-15% is common in restaurants if a service charge isn\'t already added — check the bill first.' },
  'united-kingdom': { name: 'United Kingdom', tipPercent: 10, note: 'About 10-12.5% is standard if a service charge isn\'t already included — check your bill, as many restaurants add it automatically.' },
  turkey: { name: 'Turkey', tipPercent: 10, note: 'About 10% is customary in restaurants, usually left in cash even if you pay by card.' },
  japan: { name: 'Japan', tipPercent: 0, note: 'Tipping is not customary and can be seen as confusing or even rude — excellent service is the standard, not something extra to reward with money.' },
  thailand: { name: 'Thailand', tipPercent: 10, note: 'Not obligatory, but rounding up or leaving 10% for good service is appreciated, especially in tourist-oriented restaurants.' },
  indonesia: { name: 'Indonesia', tipPercent: 10, note: 'A service charge is often already included; if not, 10% is a generous, appreciated tip.' },
  singapore: { name: 'Singapore', tipPercent: 0, note: 'A 10% service charge is usually already included on the bill — additional tipping is not expected.' },
  'south-korea': { name: 'South Korea', tipPercent: 0, note: 'Tipping is not customary and can occasionally be refused — prices already reflect the full cost of service.' },
  'hong-kong': { name: 'Hong Kong', tipPercent: 10, note: 'A 10% service charge is often already added; if not, rounding up or adding 10% is appreciated.' },
  vietnam: { name: 'Vietnam', tipPercent: 5, note: 'Not traditionally expected, but rounding up or leaving 5-10% in tourist-oriented restaurants is increasingly common and appreciated.' },
  philippines: { name: 'Philippines', tipPercent: 10, note: 'About 10% is appreciated if not already included as a service charge — check the bill first.' },
  malaysia: { name: 'Malaysia', tipPercent: 0, note: 'A 10% service charge is often already included; additional tipping is not generally expected.' },
  china: { name: 'China', tipPercent: 0, note: 'Tipping is not customary in most of mainland China and can sometimes cause confusion — it\'s not expected in local restaurants.' },
  india: { name: 'India', tipPercent: 10, note: 'About 10% is appreciated if a service charge isn\'t already included on the bill.' },
  maldives: { name: 'Maldives', tipPercent: 10, note: 'A service charge is usually included at resorts; additional tipping for exceptional service is appreciated but optional.' },
  taiwan: { name: 'Taiwan', tipPercent: 0, note: 'Tipping is not customary — a 10% service charge is often already included at nicer restaurants.' },
  'sri-lanka': { name: 'Sri Lanka', tipPercent: 10, note: 'About 10% is appreciated if a service charge isn\'t already included.' },
  cambodia: { name: 'Cambodia', tipPercent: 10, note: 'Not obligatory, but leaving 10% or rounding up is appreciated given generally low service wages.' },
  australia: { name: 'Australia', tipPercent: 0, note: 'Tipping is not customary — service staff are paid a full living wage. Rounding up for exceptional service is fine but not expected.' },
  'new-zealand': { name: 'New Zealand', tipPercent: 0, note: 'Tipping is not customary — service staff are paid a full living wage, similar to Australia.' },
  fiji: { name: 'Fiji', tipPercent: 0, note: 'Tipping is not traditionally expected, though a service charge may be added automatically at resorts.' },
  'french-polynesia': { name: 'French Polynesia', tipPercent: 0, note: 'Tipping is not customary and can occasionally feel awkward to offer — it\'s not part of the local culture.' },
  mexico: { name: 'Mexico', tipPercent: 15, note: 'About 10-15% is standard and expected in restaurants, similar to US norms.' },
  'dominican-republic': { name: 'Dominican Republic', tipPercent: 10, note: 'A 10% service charge is often already included on the bill; add a bit more for excellent service.' },
  'puerto-rico': { name: 'Puerto Rico', tipPercent: 18, note: 'US tipping norms apply — 15-20% is standard and expected in restaurants.' },
  bahamas: { name: 'Bahamas', tipPercent: 15, note: 'About 15% is standard and often already added as a service charge — check your bill.' },
  jamaica: { name: 'Jamaica', tipPercent: 10, note: 'A 10-15% service charge is often already included; add more only for exceptional service.' },
  aruba: { name: 'Aruba', tipPercent: 15, note: 'A 15% service charge is often already included on the bill — check before adding extra.' },
  'turks-and-caicos': { name: 'Turks and Caicos', tipPercent: 15, note: 'About 15% is standard, similar to US norms, and sometimes already included.' },
  'st-lucia': { name: 'St. Lucia', tipPercent: 10, note: 'A 10% service charge is often already included; additional tipping for great service is appreciated.' },
  'costa-rica': { name: 'Costa Rica', tipPercent: 10, note: 'A 10% service charge is included by law; additional tipping is optional and only for exceptional service.' },
  panama: { name: 'Panama', tipPercent: 10, note: 'About 10% is standard and appreciated in restaurants.' },
  belize: { name: 'Belize', tipPercent: 10, note: 'About 10-15% is standard and appreciated in restaurants, especially tourist-oriented ones.' },
  'cayman-islands': { name: 'Cayman Islands', tipPercent: 15, note: 'A 15% service charge is often already included — check the bill before adding extra.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', tipPercent: 10, note: 'About 10% is standard and sometimes already included as a service charge.' },
  curacao: { name: 'Curaçao', tipPercent: 10, note: 'A 10-15% service charge is often already included; add more only for exceptional service.' },
  canada: { name: 'Canada', tipPercent: 18, note: 'About 15-20% is standard and expected in restaurants, similar to US norms.' },
  'united-arab-emirates': { name: 'United Arab Emirates', tipPercent: 10, note: 'A service charge is often already included; an additional 10% in cash is appreciated for good service.' },
  morocco: { name: 'Morocco', tipPercent: 10, note: 'About 10% is customary and appreciated, usually left in cash.' },
  'south-africa': { name: 'South Africa', tipPercent: 10, note: 'About 10-15% is standard and generally expected in restaurants.' },
  qatar: { name: 'Qatar', tipPercent: 10, note: 'A service charge is often already included; an additional 10% is appreciated but not required.' },
  israel: { name: 'Israel', tipPercent: 12, note: 'About 10-15% is standard and generally expected in restaurants.' },
  tanzania: { name: 'Tanzania', tipPercent: 10, note: 'About 10% is appreciated, especially for safari guides and restaurant service.' },
  kenya: { name: 'Kenya', tipPercent: 10, note: 'About 10% is appreciated in restaurants; safari guides and drivers are typically tipped separately.' },
  argentina: { name: 'Argentina', tipPercent: 10, note: 'About 10% is standard, usually left in cash even when paying by card.' },
  peru: { name: 'Peru', tipPercent: 10, note: 'About 10% is appreciated if not already included as a service charge.' },
  chile: { name: 'Chile', tipPercent: 10, note: 'A 10% "propina" is often suggested on the bill and generally expected.' },
  colombia: { name: 'Colombia', tipPercent: 10, note: 'A voluntary 10% service charge is often added to the bill — you can decline it, but it\'s generally paid.' },
  brazil: { name: 'Brazil', tipPercent: 10, note: 'A 10% service charge is often already included by law; additional tipping isn\'t expected.' },
  'united-states': { name: 'United States', tipPercent: 18, note: 'Tipping 18-20% at restaurants is the norm, not optional — service staff are often paid a lower base wage on the assumption tips make up the difference. Also expected for bartenders, taxi/rideshare drivers, and hotel staff.' },
};

function computeResult({ country, billAmount }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const bill = billAmount ? Number(billAmount) : null;
  const tipAmount = bill && Number.isFinite(bill) ? Math.round(bill * (data.tipPercent / 100) * 100) / 100 : null;
  const totalAmount = bill && tipAmount !== null ? Math.round((bill + tipAmount) * 100) / 100 : null;

  let headline;
  if (data.tipPercent === 0) {
    headline = `In ${data.name}, tipping isn't generally expected in restaurants.`;
  } else if (tipAmount !== null) {
    headline = `For a $${bill.toFixed(2)} bill in ${data.name}, a typical tip is about $${tipAmount.toFixed(2)} (${data.tipPercent}%).`;
  } else {
    headline = `In ${data.name}, a typical restaurant tip is about ${data.tipPercent}%.`;
  }

  return {
    country, countryName: data.name, tipPercent: data.tipPercent, note: data.note,
    billAmount: bill, tipAmount, totalAmount, headline,
  };
}

// @desc Instant calculation, no email required
// @route POST /api/tools/tipping-calculator/calculate
// @access Public
exports.calculateTip = (req, res) => {
  try {
    const { country, billAmount } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country, billAmount });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF tipping guide, send confirmation email
// @route POST /api/tools/tipping-calculator/pdf
// @access Public
exports.generateTippingPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, country, billAmount } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country, billAmount });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'tipping-calculator',
        JSON.stringify({ country, billAmount }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Tipping Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tipping-calculator.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    if (result.tipAmount !== null) {
      pdfService.highlightBox(doc, `Bill: $${result.billAmount.toFixed(2)} + Tip: $${result.tipAmount.toFixed(2)} = Total: $${result.totalAmount.toFixed(2)}`);
    } else {
      pdfService.highlightBox(doc, `Typical restaurant tip in ${result.countryName}: ${result.tipPercent}%`);
    }

    pdfService.heading(doc, 'Beyond restaurants');
    pdfService.bulletList(doc, [
      'Taxi/rideshare: rounding up to the nearest note or a small percentage is common in most countries, even where restaurant tipping isn\'t customary.',
      'Hotel housekeeping: a small daily cash tip (left visibly, not just assumed) is appreciated in most countries.',
      'Tour guides: tipping is more commonly expected for guided tours than for casual restaurant meals, even in low-tipping-culture countries.',
      'When in doubt, carry small local-currency notes — card payments rarely have a clean way to add a partial tip.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💵 Your ${result.countryName} tipping guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your tipping guide for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond tipping etiquette? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send tipping-calculator confirmation email:', err.message));

  } catch (error) {
    console.error('generateTippingPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
