const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');
const { computeTripBriefSections, CATEGORY_ORDER } = require('../services/tripBriefRegistry');

// Bundled, free, one-category PDF — e.g. "everything Health & Safety knows
// about Thailand" combining beach safety, street food, air quality,
// altitude sickness, water, health, etc. into one document, instead of the
// single-tool PDF just re-printing what the landing page already shows for
// free. Reuses tripBriefRegistry's per-country section computation (the
// same engine behind the paid Trip Brief) but scopes it to one category and
// gives it away free as the lead magnet — the natural upsell is "get every
// category, not just this one" via the $19 Trip Brief.
const CATEGORY_SLUGS = {
  'Documents & Entry': 'documents-entry',
  'Money': 'money',
  'Health & Safety': 'health-safety',
  'On the Ground': 'on-the-ground',
  'Local Rules': 'local-rules',
  'Pet Travel': 'pet-travel',
};

function computeCategorySections({ category, country }) {
  if (!CATEGORY_ORDER.includes(category)) throw new Error('Unknown category');
  const sections = computeTripBriefSections({ destination: country });
  const filtered = sections.filter(s => s.category === category);
  if (filtered.length === 0) throw new Error('No data available for this destination yet');
  return filtered;
}

// @desc Instant lookup, no email required — used by generator scripts to
//   confirm at build time that a country has real bundle content, and by
//   the frontend to show "X checks included" before the email gate.
// @route POST /api/tools/category-bundle/preview
// @access Public
exports.previewCategoryBundle = (req, res) => {
  try {
    const { category, country } = req.body;
    if (!category || !country) return res.status(400).json({ success: false, error: 'category and country are required' });
    const sections = computeCategorySections({ category, country });
    res.status(200).json({
      success: true,
      count: sections.length,
      tools: sections.map(s => ({ name: s.name, icon: s.icon })),
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a bundled multi-tool
//   PDF for one category/country, send a summary email pitching the full
//   Trip Brief (every category) as the natural next step.
// @route POST /api/tools/category-bundle/pdf
// @access Public
exports.generateCategoryBundlePdf = async (req, res) => {
  try {
    const { category, country, email, firstName, sourcePage } = req.body;
    if (!category || !country || !email) {
      return res.status(400).json({ success: false, error: 'category, country, and email are required' });
    }

    const sections = computeCategorySections({ category, country });
    const countryName = sections[0].result.countryName;
    const categorySlug = CATEGORY_SLUGS[category] || category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const toolSlug = `bundle-${categorySlug}`;

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, toolSlug,
        JSON.stringify({ category, country }),
        JSON.stringify({ count: sections.length, tools: sections.map(s => s.name) }),
        sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${countryName} ${category} Bundle`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${toolSlug}-${country}.pdf"`);
    doc.pipe(res);

    pdfService.heading(doc, `${countryName}: ${category}`);
    pdfService.paragraph(doc, `${sections.length} checks combined into one PDF, so you don't have to visit ${sections.length} separate pages for your trip to ${countryName}.`);

    // A 15-check bundle is a long document — the only ask used to be the
    // very last thing on the page, easy to never reach. This repeats it
    // once, lightly, at the halfway point.
    const midpoint = Math.floor(sections.length / 2);
    sections.forEach((section, i) => {
      pdfService.subheading(doc, `${section.icon} ${section.name}`);
      pdfService.paragraph(doc, section.result.headline);
      const body = section.result.note || section.result.reason;
      if (body && body !== section.result.headline) pdfService.paragraph(doc, body);

      if (i === midpoint && sections.length >= 6) {
        pdfService.highlightBox(
          doc,
          `Halfway through — ${countryName}'s Trip Brief covers this and every other category (money, documents, local rules) in one $19 PDF.`,
          `https://travelsmarterapp.com/trip-brief.html?destination=${country}`
        );
      }
    });

    pdfService.addFooterCTA(doc, country);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `📋 Your ${countryName} ${category} guide (${sections.length} checks)`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your <strong>${countryName} ${category}</strong> bundle — ${sections.length} checks combined into one PDF:</p>
<ul>${sections.map(s => `<li>${s.icon} ${s.name}</li>`).join('')}</ul>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>This is just one category.</strong> The full Trip Brief combines every relevant check — Documents & Entry, Money, Health & Safety, On the Ground, Local Rules, and more — into one personalized PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${country}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Full Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send category-bundle confirmation email:', err.message));

  } catch (error) {
    console.error('generateCategoryBundlePdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.CATEGORY_SLUGS = CATEGORY_SLUGS;
