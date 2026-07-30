const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// What it actually takes for foreigners to legally marry at a
// destination — distinct from visaRequirementController.js, which
// covers entry rules, not marriage bureaucracy. complexityLevel:
// 'straightforward' (minimal or no residency requirement, fast
// processing, a genuinely popular legal destination-wedding market) |
// 'moderate' (real paperwork and/or a notice period, but manageable
// with advance planning or a local wedding planner) | 'complex'
// (significant residency requirements, extensive documentation, or
// marriage law tied to religion — most couples here do a symbolic
// ceremony and marry legally at home instead). A marriage legally
// performed abroad is generally recognized back home, with occasional
// specific exceptions noted below.
const COUNTRIES = {
  france: { name: 'France', complexityLevel: 'complex', note: "France requires at least one spouse to establish residency in the local commune for roughly 30-40 days before the marriage, plus a 10-day public notice period — genuinely impractical for a typical trip. Most couples do a symbolic ceremony here and marry legally at home." },
  austria: { name: 'Austria', complexityLevel: 'complex', note: 'Real residency and documentation requirements apply, similar to much of Western Europe — most couples do a symbolic ceremony here and marry legally at home.' },
  'czech-republic': { name: 'Czech Republic', complexityLevel: 'moderate', note: 'Prague is a genuinely popular, accessible legal destination-wedding spot — requires translated and apostilled documents (birth certificate, single-status affidavit) but no long residency requirement, notably more accessible than most of Western Europe.' },
  denmark: { name: 'Denmark', complexityLevel: 'straightforward', note: 'Denmark is famously one of the easiest countries in Europe to marry in — no residency requirement, and processing can take as little as a day or two, which is exactly why it\'s become a popular legal-marriage destination.' },
  germany: { name: 'Germany', complexityLevel: 'complex', note: 'Real residency and extensive documentation requirements apply, similar to France — most couples do a symbolic ceremony here and marry legally at home.' },
  greece: { name: 'Greece', complexityLevel: 'moderate', note: 'Requires publishing a marriage notice and specific documentation, but a genuinely popular and established legal destination-wedding market, especially on the islands.' },
  hungary: { name: 'Hungary', complexityLevel: 'moderate', note: 'Requires a Certificate of No Impediment and processing time, but Budapest is a genuinely popular, accessible legal destination-wedding spot.' },
  iceland: { name: 'Iceland', complexityLevel: 'moderate', note: 'Requires documentation and a short notice period, but a real and growing legal destination-wedding market with an established process for foreigners.' },
  italy: { name: 'Italy', complexityLevel: 'moderate', note: 'Requires a Nulla Osta (certificate of no impediment) from your home country plus local registration — genuinely popular for destination weddings despite the paperwork, especially with a wedding planner\'s help.' },
  netherlands: { name: 'Netherlands', complexityLevel: 'complex', note: 'Significant residency and documentation requirements apply — most couples do a symbolic ceremony here and marry legally at home.' },
  portugal: { name: 'Portugal', complexityLevel: 'moderate', note: 'Requires documentation and processing time, but a real, accessible legal destination-wedding market.' },
  spain: { name: 'Spain', complexityLevel: 'moderate', note: 'Requires a Certificate of No Impediment and registration — genuinely popular for destination weddings, especially with a wedding planner\'s help.' },
  sweden: { name: 'Sweden', complexityLevel: 'complex', note: 'Significant residency and documentation requirements apply, typical of Scandinavia outside Denmark — most couples do a symbolic ceremony here and marry legally at home.' },
  switzerland: { name: 'Switzerland', complexityLevel: 'complex', note: 'Notably strict requirements, including mandatory in-person appearances and residency — most couples do a symbolic ceremony here and marry legally at home.' },
  ireland: { name: 'Ireland', complexityLevel: 'moderate', note: 'Requires giving at least 3 months\' notice in person to a registrar, which rules out most short trips unless planned far in advance.' },
  'united-kingdom': { name: 'United Kingdom', complexityLevel: 'moderate', note: 'Requires giving notice and a minimum residency period (typically at least 7-8 days) at a register office — doable with advance planning, but not spontaneous.' },
  turkey: { name: 'Turkey', complexityLevel: 'moderate', note: 'Requires documentation (including a health certificate) and translated papers submitted in person, but a genuinely popular and manageable legal destination-wedding market.' },
  japan: { name: 'Japan', complexityLevel: 'moderate', note: 'Requires a specific Affidavit of Competency to Marry from your embassy, but once paperwork is in order, the actual registration process is fast, with no residency requirement.' },
  thailand: { name: 'Thailand', complexityLevel: 'straightforward', note: "A genuinely popular, accessible legal destination-wedding market — get an Affidavit of Freedom to Marry from your embassy, then register locally; same-day registration is possible." },
  indonesia: { name: 'Indonesia', complexityLevel: 'complex', note: "Marriage law in Indonesia is tied to religious requirements, making civil marriage genuinely complicated for foreign tourists — most couples (especially in Bali) do a symbolic ceremony and marry legally at home." },
  singapore: { name: 'Singapore', complexityLevel: 'moderate', note: 'Requires a 21-day notice period and specific documentation, but an established, accessible legal process for foreigners.' },
  'south-korea': { name: 'South Korea', complexityLevel: 'moderate', note: 'Requires an Affidavit of Eligibility and registration — a real but manageable process.' },
  'hong-kong': { name: 'Hong Kong', complexityLevel: 'moderate', note: 'Requires roughly a 15-day notice period and documentation, but an established, accessible legal process for foreigners.' },
  vietnam: { name: 'Vietnam', complexityLevel: 'complex', note: 'Extensive documentation and translation/legalization requirements make legal marriage genuinely difficult for tourists — most couples do a symbolic ceremony and marry legally at home.' },
  philippines: { name: 'Philippines', complexityLevel: 'moderate', note: 'Requires a Certificate of Legal Capacity to Contract Marriage from your embassy plus a 10-day public posting period — real but manageable with advance planning.' },
  malaysia: { name: 'Malaysia', complexityLevel: 'complex', note: 'Civil marriage for non-Muslims is possible but involves specific residency/notice requirements, and marriage law is tied to religion for Muslims — genuinely complex for foreign tourists.' },
  china: { name: 'China', complexityLevel: 'complex', note: 'Extensive documentation, translation, and notarization requirements make legal marriage genuinely difficult for tourists.' },
  india: { name: 'India', complexityLevel: 'complex', note: "India's Special Marriage Act requires a mandatory 30-day notice period plus extensive documentation — genuinely difficult for tourists on a short trip. Most couples do a symbolic ceremony and marry legally at home." },
  maldives: { name: 'Maldives', complexityLevel: 'complex', note: 'Legal marriage under Maldivian law generally requires the couple to be Muslim — most tourists instead do a symbolic (non-legally-binding) resort ceremony and marry legally at home.' },
  taiwan: { name: 'Taiwan', complexityLevel: 'moderate', note: 'Requires an Affidavit of Single Status and registration — a real but manageable process, with no residency requirement.' },
  'sri-lanka': { name: 'Sri Lanka', complexityLevel: 'moderate', note: 'Requires roughly a 14-day notice period and documentation — a real but manageable process, genuinely popular for beach weddings.' },
  cambodia: { name: 'Cambodia', complexityLevel: 'complex', note: 'Marriage to a foreign national involves extensive Cambodian government approval processes — most couples do a symbolic ceremony and marry legally at home.' },
  australia: { name: 'Australia', complexityLevel: 'moderate', note: "Requires giving at least one month's Notice of Intended Marriage before the ceremony — doable with advance planning, but not spontaneous." },
  'new-zealand': { name: 'New Zealand', complexityLevel: 'straightforward', note: 'Requires only a short notice period (3 working days minimum) and minimal paperwork — genuinely one of the more accessible English-speaking legal destination-wedding markets.' },
  fiji: { name: 'Fiji', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with a short 3-working-day notice period and an established process for foreigners.' },
  'french-polynesia': { name: 'French Polynesia', complexityLevel: 'complex', note: "French civil code residency requirements apply here, similar to mainland France — most couples do a symbolic ceremony (a popular Tahitian tradition) and marry legally at home." },
  mexico: { name: 'Mexico', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market, especially in resort areas like Riviera Maya and Los Cabos, with wedding coordinators who handle the relatively straightforward local paperwork.' },
  'dominican-republic': { name: 'Dominican Republic', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with resort wedding coordinators who handle the paperwork, and no residency requirement.' },
  'puerto-rico': { name: 'Puerto Rico', complexityLevel: 'moderate', note: 'As US territory, requires a local marriage license and a brief waiting period, similar to mainland US state processes.' },
  bahamas: { name: 'Bahamas', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market — couples can obtain a license after just one day of residency.' },
  jamaica: { name: 'Jamaica', complexityLevel: 'straightforward', note: 'One of the most popular destination-wedding markets in the Caribbean, with a residency requirement as short as 24 hours and resort wedding coordinators who handle the paperwork.' },
  aruba: { name: 'Aruba', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with resort wedding coordinators who handle the relatively straightforward local paperwork.' },
  'turks-and-caicos': { name: 'Turks and Caicos', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with a residency requirement as short as 24 hours and resort wedding coordinators who handle the paperwork.' },
  'st-lucia': { name: 'St. Lucia', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with a residency requirement as short as 24-48 hours and resort wedding coordinators who handle the paperwork.' },
  'costa-rica': { name: 'Costa Rica', complexityLevel: 'moderate', note: 'Requires specific documentation (apostilled birth certificates, single-status affidavits), typically handled by a local lawyer — real but manageable with a wedding planner\'s help.' },
  panama: { name: 'Panama', complexityLevel: 'moderate', note: 'Requires specific documentation, typically handled by a local lawyer — real but manageable.' },
  belize: { name: 'Belize', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with only a 3-day residency requirement and resort wedding coordinators who handle the paperwork.' },
  'cayman-islands': { name: 'Cayman Islands', complexityLevel: 'straightforward', note: 'One of the most accessible legal destination-wedding markets in the Caribbean — no residency requirement at all, with a same-day license genuinely possible.' },
  'antigua-and-barbuda': { name: 'Antigua and Barbuda', complexityLevel: 'straightforward', note: 'A genuinely popular, accessible legal destination-wedding market with a residency requirement as short as 24 hours and resort wedding coordinators who handle the paperwork.' },
  curacao: { name: 'Curaçao', complexityLevel: 'moderate', note: 'Requires specific documentation and advance notice — a real but manageable process, somewhat less streamlined than other Caribbean destinations.' },
  canada: { name: 'Canada', complexityLevel: 'moderate', note: 'Requirements vary by province but generally involve a marriage license application with no long residency requirement — a real but manageable process.' },
  'united-arab-emirates': { name: 'United Arab Emirates', complexityLevel: 'complex', note: "Civil marriage for non-Muslim foreigners is possible through specific court processes or a foreign embassy's civil marriage service, but involves real bureaucracy — many couples do a symbolic ceremony and marry legally at home instead." },
  morocco: { name: 'Morocco', complexityLevel: 'complex', note: 'Marriage to a foreign national involves extensive documentation and government approval processes — most couples do a symbolic ceremony and marry legally at home.' },
  'south-africa': { name: 'South Africa', complexityLevel: 'moderate', note: 'Requires documentation (unabridged birth certificates, affidavits) and processing time — a real but manageable process, genuinely popular for safari-lodge destination weddings.' },
  qatar: { name: 'Qatar', complexityLevel: 'complex', note: 'Marriage law is tied to Islamic requirements — civil marriage for non-Muslim foreign couples is genuinely difficult, and most marry legally at home instead.' },
  israel: { name: 'Israel', complexityLevel: 'complex', note: "Israel has no general civil marriage performed within the country — marriage is administered by religious authorities. Most foreign couples do a symbolic ceremony and marry legally at home, or use a common workaround of a quick civil ceremony in nearby Cyprus." },
  tanzania: { name: 'Tanzania', complexityLevel: 'moderate', note: 'Requires a 21-day notice period and documentation — a real but manageable process, genuinely popular for safari and beach weddings with a wedding planner\'s help.' },
  kenya: { name: 'Kenya', complexityLevel: 'moderate', note: 'Requires a notice period (often around 21 days, sometimes reducible) and documentation — a real but manageable process, genuinely popular for safari weddings with a wedding planner\'s help.' },
  argentina: { name: 'Argentina', complexityLevel: 'complex', note: 'Extensive documentation and translation/legalization requirements make legal marriage genuinely difficult for tourists — most couples do a symbolic ceremony and marry legally at home.' },
  peru: { name: 'Peru', complexityLevel: 'moderate', note: 'Requires specific documentation and a municipal registration process — real but manageable with a wedding planner\'s help.' },
  chile: { name: 'Chile', complexityLevel: 'complex', note: 'Extensive documentation and residency-adjacent requirements make legal marriage genuinely difficult for tourists — most couples do a symbolic ceremony and marry legally at home.' },
  colombia: { name: 'Colombia', complexityLevel: 'moderate', note: 'Requires apostilled and translated documentation plus a notary process — real but manageable with a wedding planner\'s help, genuinely popular in Cartagena.' },
  brazil: { name: 'Brazil', complexityLevel: 'moderate', note: 'Requires specific documentation and a notary/registry process — real but manageable with a wedding planner\'s help.' },
  'united-states': { name: 'United States', complexityLevel: 'straightforward', note: 'Requirements vary by state, but many popular destination-wedding states (Nevada, Hawaii, Florida) have no residency requirement and offer same-day or next-day licenses — among the most accessible processes in the world.' },
};

const COMPLEXITY_LABELS = {
  straightforward: 'Straightforward — Popular Legal Destination',
  moderate: 'Moderate — Real Paperwork, Manageable',
  complex: 'Complex — Most Couples Marry Legally at Home',
};

const DISCLAIMER = "Requirements, waiting periods, and required documents change and vary by nationality — always confirm current specifics with the destination's civil registry (or a local wedding planner/lawyer) well before you book. A marriage legally performed abroad is generally recognized back home, but always confirm the specific recognition process with your home country's government too.";

function computeResult({ country }) {
  const data = COUNTRIES[country];
  if (!data) throw new Error('Unknown country');

  const complexityLabel = COMPLEXITY_LABELS[data.complexityLevel];
  const headline = `${data.name}: ${complexityLabel}.`;

  return {
    country, countryName: data.name, complexityLevel: data.complexityLevel, complexityLabel,
    note: data.note, disclaimer: DISCLAIMER, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/wedding-legal-checker/calculate
// @access Public
exports.calculateWeddingLegal = (req, res) => {
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
// @route POST /api/tools/wedding-legal-checker/pdf
// @access Public
exports.generateWeddingLegalPdf = async (req, res) => {
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
      [email, firstName || null, 'wedding-legal-checker',
        JSON.stringify({ country }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.countryName} Destination Wedding Legal Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-legal-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);
    pdfService.highlightBox(doc, result.complexityLabel);

    pdfService.heading(doc, 'Before you plan the ceremony');
    pdfService.bulletList(doc, [
      result.disclaimer,
      'If legal marriage here looks complex, a popular, low-stress option is marrying legally at home first (or after) and having a purely symbolic ceremony at your destination — many couples do exactly this.',
      'A local wedding planner or coordinator who handles paperwork regularly is worth the cost almost everywhere on this list, even in "straightforward" destinations.',
      'Start gathering documents (birth certificates, single-status affidavits, apostilles) months in advance — these almost always take longer than couples expect.',
    ]);

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `💍 Your ${result.countryName} destination wedding legal guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's the destination wedding legal check for ${result.countryName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p style="color:#6b7280;font-size:14px;">${result.disclaimer}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond the ceremony? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send wedding-legal-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateWeddingLegalPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.COUNTRIES = COUNTRIES;
exports.computeResult = computeResult;
