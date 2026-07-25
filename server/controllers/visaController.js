const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// Entry-requirement data for US passport holders, by destination country.
// visaType: 'visa_free' | 'eta_required' | 'evisa_required' | 'visa_required' | 'visa_on_arrival'
// passportValidityMonths: commonly-applied buffer beyond your return date (3 for Schengen, 6 elsewhere as a safe default, 0 for US territories).
const COUNTRIES = {
  france: { name: 'France', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit France visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  austria: { name: 'Austria', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Austria visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  'czech-republic': { name: 'Czech Republic', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit the Czech Republic visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  denmark: { name: 'Denmark', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Denmark visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  germany: { name: 'Germany', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Germany visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  greece: { name: 'Greece', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Greece visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  hungary: { name: 'Hungary', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Hungary visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  iceland: { name: 'Iceland', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Iceland visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  italy: { name: 'Italy', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Italy visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  netherlands: { name: 'Netherlands', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit the Netherlands visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  portugal: { name: 'Portugal', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Portugal visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  spain: { name: 'Spain', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Spain visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  sweden: { name: 'Sweden', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Sweden visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },
  switzerland: { name: 'Switzerland', visaType: 'visa_free', durationDays: 90, advanceAuth: 'ETIAS (rolling out)', passportValidityMonths: 3, note: "US citizens can currently visit Switzerland visa-free for up to 90 days within the Schengen area. The EU's ETIAS travel authorization system has been in a rollout period, so check the current requirement close to your travel date." },

  ireland: { name: 'Ireland', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "Ireland is not part of the Schengen area. US citizens can visit visa-free for up to 90 days, with no ETIAS or other advance authorization currently required." },
  'united-kingdom': { name: 'United Kingdom', visaType: 'eta_required', durationDays: 180, advanceAuth: 'UK ETA', passportValidityMonths: 6, note: "The UK is not part of the Schengen area. US citizens don't need a visa for short visits, but need a UK Electronic Travel Authorisation (ETA), obtained online before departure." },
  turkey: { name: 'Turkey', visaType: 'evisa_required', durationDays: 90, advanceAuth: 'e-Visa', passportValidityMonths: 6, note: "Turkey is not part of the Schengen area. US citizens need to obtain an e-Visa online before travel — a simple, inexpensive process, but required in advance." },

  japan: { name: 'Japan', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Japan visa-free for short tourism stays, typically up to 90 days, with no advance visa required." },
  thailand: { name: 'Thailand', visaType: 'visa_free', durationDays: 30, advanceAuth: 'TDAC digital arrival card', passportValidityMonths: 6, note: "US citizens get visa-exempt entry for short tourist stays, but must complete Thailand's digital arrival card (TDAC) online before arrival." },
  indonesia: { name: 'Indonesia', visaType: 'visa_on_arrival', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "US citizens need a Visa on Arrival to enter Indonesia (including Bali) — it's paid, typically valid around 30 days, and extendable, but it is not visa-free entry." },
  singapore: { name: 'Singapore', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Singapore visa-free for short tourist stays, typically up to 90 days." },
  'south-korea': { name: 'South Korea', visaType: 'eta_required', durationDays: 90, advanceAuth: 'K-ETA', passportValidityMonths: 6, note: "US citizens need to register for South Korea's K-ETA (Korea Electronic Travel Authorization) online before departure, in addition to the visa-free short-stay allowance." },
  'hong-kong': { name: 'Hong Kong', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Hong Kong visa-free for short tourist stays, typically up to 90 days, separate from mainland China's visa rules." },
  vietnam: { name: 'Vietnam', visaType: 'evisa_required', durationDays: 90, advanceAuth: 'e-Visa', passportValidityMonths: 6, note: "US citizens need an e-Visa for Vietnam, obtained online in advance — Vietnam is not visa-free for US passport holders." },
  philippines: { name: 'Philippines', visaType: 'visa_free', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "US citizens get visa-free entry for short tourist stays, typically up to 30 days, with no advance visa or e-visa currently required." },
  malaysia: { name: 'Malaysia', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Malaysia visa-free for short tourist stays, typically up to 90 days." },
  china: { name: 'China', visaType: 'visa_required', durationDays: null, advanceAuth: 'Visa', passportValidityMonths: 6, note: "Unlike many neighboring countries, China generally still requires US citizens to obtain a visa in advance — apply well before your trip rather than expecting visa-free entry." },
  india: { name: 'India', visaType: 'evisa_required', durationDays: null, advanceAuth: 'e-Visa', passportValidityMonths: 6, note: "US citizens need an e-Visa for India, applied for online in advance — India is not visa-free for US passport holders." },
  maldives: { name: 'Maldives', visaType: 'visa_on_arrival', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "The Maldives issues a free visa on arrival to US citizens for short tourist stays, typically 30 days — no advance application needed." },
  taiwan: { name: 'Taiwan', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Taiwan visa-free for short tourist stays, typically up to 90 days." },
  'sri-lanka': { name: 'Sri Lanka', visaType: 'eta_required', durationDays: 30, advanceAuth: 'ETA', passportValidityMonths: 6, note: "US citizens need to apply online in advance for Sri Lanka's Electronic Travel Authorization (ETA) — a simple online process, but required before travel." },
  cambodia: { name: 'Cambodia', visaType: 'evisa_required', durationDays: 30, advanceAuth: 'e-Visa or visa on arrival', passportValidityMonths: 6, note: "US citizens need a visa for Cambodia — available as an e-Visa online in advance or a visa on arrival for a fee; it is not visa-free." },

  australia: { name: 'Australia', visaType: 'eta_required', durationDays: 90, advanceAuth: 'Australian ETA', passportValidityMonths: 6, note: "US citizens need to apply for an Australian ETA (Electronic Travel Authority) online before departure — it's not a no-paperwork visa-free entry." },
  'new-zealand': { name: 'New Zealand', visaType: 'eta_required', durationDays: 90, advanceAuth: 'NZeTA', passportValidityMonths: 6, note: "US citizens need to apply for an NZeTA (New Zealand Electronic Travel Authorization) online before departure." },
  fiji: { name: 'Fiji', visaType: 'visa_free', durationDays: 120, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Fiji visa-free for short tourist stays, typically up to 4 months." },
  'french-polynesia': { name: 'French Polynesia', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit French Polynesia (including Bora Bora and Tahiti) visa-free for short tourist stays, typically up to 90 days." },

  mexico: { name: 'Mexico', visaType: 'visa_free', durationDays: 180, advanceAuth: 'Tourist card (FMM)', passportValidityMonths: 6, note: "US citizens can visit Mexico visa-free with a simple tourist card (FMM), typically handled as part of the airfare/immigration process — no advance visa needed." },
  'dominican-republic': { name: 'Dominican Republic', visaType: 'visa_free', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit the Dominican Republic visa-free for short tourist stays, with no advance visa needed." },
  'puerto-rico': { name: 'Puerto Rico', visaType: 'visa_free', durationDays: null, advanceAuth: null, passportValidityMonths: 0, note: "No passport or visa is required — Puerto Rico is a US territory, so traveling there is treated like any other domestic US trip." },
  bahamas: { name: 'Bahamas', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit the Bahamas visa-free for short tourist stays with a valid passport, no advance visa needed." },
  jamaica: { name: 'Jamaica', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit Jamaica visa-free for short tourist stays, no advance visa needed." },
  aruba: { name: 'Aruba', visaType: 'visa_free', durationDays: 180, advanceAuth: 'Online ED Card', passportValidityMonths: 6, note: "US citizens can visit Aruba visa-free for short tourist stays, but must complete Aruba's online ED Card (a simple digital immigration/customs form) before arrival." },
  'turks-and-caicos': { name: 'Turks and Caicos', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit visa-free for short tourist stays — it's a British Overseas Territory with no advance visa required." },
  'st-lucia': { name: 'St. Lucia', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit St. Lucia visa-free for short tourist stays, no advance visa needed." },
  'costa-rica': { name: 'Costa Rica', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit Costa Rica visa-free for short tourist stays, no advance visa needed." },
  panama: { name: 'Panama', visaType: 'visa_free', durationDays: 180, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit Panama visa-free for short tourist stays, no advance visa needed." },
  belize: { name: 'Belize', visaType: 'visa_free', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit Belize visa-free for short tourist stays, no advance visa needed." },
  'cayman-islands': { name: 'Cayman Islands', visaType: 'visa_free', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit the Cayman Islands visa-free for short tourist stays, no advance visa needed." },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', visaType: 'visa_free', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can visit Antigua and Barbuda visa-free for short tourist stays, no advance visa needed." },
  curacao: { name: 'Curaçao', visaType: 'visa_free', durationDays: 90, advanceAuth: 'Digital Immigration Card (DI Card)', passportValidityMonths: 6, note: "US citizens can visit Curaçao visa-free for short tourist stays, but must complete an online Digital Immigration Card (DI Card) before arrival." },

  canada: { name: 'Canada', visaType: 'visa_free', durationDays: 180, advanceAuth: null, passportValidityMonths: 0, note: "No visa is needed, and US citizens are specifically exempt from Canada's eTA requirement — a valid passport is all that's required." },

  'united-arab-emirates': { name: 'United Arab Emirates', visaType: 'visa_on_arrival', durationDays: 30, advanceAuth: null, passportValidityMonths: 6, note: "The UAE grants US citizens a free visa on arrival for short tourist stays — no advance application needed." },
  morocco: { name: 'Morocco', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Morocco visa-free for short tourist stays, typically up to 90 days, with no advance visa needed." },
  'south-africa': { name: 'South Africa', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit South Africa visa-free for short tourist stays, typically up to 90 days." },
  qatar: { name: 'Qatar', visaType: 'visa_on_arrival', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Qatar visa-free for short tourist stays, with visa-on-arrival/visa-free entry for tourism." },
  israel: { name: 'Israel', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Israel visa-free for short tourist stays, typically up to 90 days, with no advance visa required. Requirements and travel conditions can change, so check current advisories before booking." },
  tanzania: { name: 'Tanzania', visaType: 'evisa_required', durationDays: null, advanceAuth: 'e-Visa or visa on arrival', passportValidityMonths: 6, note: "US citizens need a visa for Tanzania (including Zanzibar), available as an e-Visa online in advance or a visa on arrival for a fee — it is not visa-free." },
  kenya: { name: 'Kenya', visaType: 'evisa_required', durationDays: null, advanceAuth: 'e-Visa', passportValidityMonths: 6, note: "US citizens need an e-Visa for Kenya, applied for online in advance — it is not visa-free." },

  argentina: { name: 'Argentina', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Argentina visa-free for short tourist stays, typically up to 90 days." },
  peru: { name: 'Peru', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Peru visa-free for short tourist stays, typically up to 90 days — the same entry rules apply whether you're headed to Lima or Cusco." },
  chile: { name: 'Chile', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Chile visa-free for short tourist stays, typically up to 90 days." },
  colombia: { name: 'Colombia', visaType: 'visa_free', durationDays: 90, advanceAuth: null, passportValidityMonths: 6, note: "US citizens can currently visit Colombia visa-free for short tourist stays, typically up to 90 days." },
  brazil: { name: 'Brazil', visaType: 'visa_required', durationDays: 90, advanceAuth: 'e-Visa (policy has changed repeatedly)', passportValidityMonths: 6, note: "Brazil's visa policy for US citizens has changed multiple times in recent years, alternating between visa-free entry and an e-Visa requirement. Verify the current requirement close to your travel date before booking." },
};

const VISA_TYPE_LABELS = {
  visa_free: 'Visa-free',
  eta_required: 'Electronic travel authorization required',
  evisa_required: 'e-Visa required',
  visa_required: 'Visa required',
  visa_on_arrival: 'Visa on arrival',
};

function computeResult({ country, travelDate, passportExpiryDate }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const result = {
    country,
    countryName: data.name,
    visaType: data.visaType,
    visaTypeLabel: VISA_TYPE_LABELS[data.visaType],
    durationDays: data.durationDays,
    advanceAuth: data.advanceAuth,
    note: data.note,
    passportValidityMonths: data.passportValidityMonths,
  };

  if (travelDate && passportExpiryDate) {
    const travel = new Date(travelDate + 'T00:00:00Z');
    const expiry = new Date(passportExpiryDate + 'T00:00:00Z');
    const requiredExpiry = new Date(travel);
    requiredExpiry.setUTCMonth(requiredExpiry.getUTCMonth() + data.passportValidityMonths);
    result.passportOk = expiry >= requiredExpiry;
    result.requiredExpiryDate = requiredExpiry.toISOString().slice(0, 10);
  }

  let headline;
  if (data.visaType === 'visa_free' && !data.advanceAuth) {
    headline = `${data.name}: visa-free for US citizens${data.durationDays ? ` for up to ${data.durationDays} days` : ''}.`;
  } else if (data.visaType === 'visa_free' && data.advanceAuth) {
    headline = `${data.name}: no traditional visa needed, but ${data.advanceAuth} is required before you fly.`;
  } else if (data.visaType === 'evisa_required' || data.visaType === 'visa_required') {
    headline = `${data.name}: requires ${data.advanceAuth || 'a visa'} for US citizens — not visa-free.`;
  } else if (data.visaType === 'visa_on_arrival') {
    headline = `${data.name}: visa on arrival for US citizens${data.durationDays ? ` (up to ${data.durationDays} days)` : ''} — not fully visa-free.`;
  } else {
    headline = `${data.name}: ${result.visaTypeLabel.toLowerCase()} for US citizens.`;
  }

  if (result.passportOk === false) {
    headline += ` Also: your passport won't meet the typical ${data.passportValidityMonths}-month validity requirement for this trip — renew before booking.`;
  }

  result.headline = headline;
  return result;
}

// @desc Instant lookup, no email required
// @route POST /api/tools/visa-checker/calculate
// @access Public
exports.calculateVisaRequirement = (req, res) => {
  try {
    const { country, travelDate, passportExpiryDate } = req.body;
    if (!country) return res.status(400).json({ success: false, error: 'country is required' });
    const result = computeResult({ country, travelDate, passportExpiryDate });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send a confirmation email
// @route POST /api/tools/visa-checker/pdf
// @access Public
exports.generateVisaPdf = async (req, res) => {
  try {
    const { email, firstName, country, travelDate, passportExpiryDate } = req.body;
    if (!email || !country) {
      return res.status(400).json({ success: false, error: 'email and country are required' });
    }

    const result = computeResult({ country, travelDate, passportExpiryDate });

    await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [email, firstName || null, 'visa-requirement-checker',
        JSON.stringify({ country, travelDate, passportExpiryDate }), JSON.stringify(result)]
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Entry Requirements — Your Report`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="visa-requirement-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    pdfService.highlightBox(doc, `${result.countryName}: ${result.visaTypeLabel}${result.durationDays ? ` · up to ${result.durationDays} days` : ''}${result.advanceAuth ? ` · requires ${result.advanceAuth}` : ''}`);

    pdfService.heading(doc, 'Passport validity');
    pdfService.paragraph(doc, result.passportValidityMonths > 0
      ? `A commonly-applied rule is that your passport should remain valid at least ${result.passportValidityMonths} months beyond your trip for ${result.countryName}. This is a general guideline — always confirm the exact requirement for your specific passport and trip dates.`
      : `${result.countryName} does not require passport validity buffers for US citizens the way most international destinations do.`);

    pdfService.heading(doc, 'Before you book');
    pdfService.bulletList(doc, [
      'Entry requirements can change with little notice — re-check official government sources close to your travel date, not just before booking.',
      'If an electronic authorization or e-Visa is required, apply as soon as you have your itinerary — most take only minutes, but processing can occasionally take longer.',
      'Keep a digital and printed copy of any visa, e-Visa, or ETA approval with you while traveling.',
      'Some countries also require proof of onward/return travel and sufficient blank passport pages — check before you fly.',
    ]);

    pdfService.addFooterCTA(doc);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🛂 Your ${result.countryName} entry requirements report`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your entry-requirement check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond entry requirements? That's what TravelSmarter does.</p>
<p><a href="https://travelsmarterapp.com/sales-page.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send visa-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateVisaPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
