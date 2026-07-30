/**
 * Branded PDF generation for free tools (lead magnets).
 * Shared helpers here so each new tool only needs to write its own content,
 * not rebuild the branded document shell every time.
 */

const PDFDocument = require('pdfkit');

const NAVY = '#1a2744';
const CORAL = '#ff6b4a';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#9ca3af';

// Creates a new branded PDF document with a header already drawn.
// Returns the PDFDocument — caller writes content, then calls addFooterCTA()
// before doc.end().
function createBrandedDoc(title) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.rect(0, 0, doc.page.width, 90).fill(NAVY);
  doc.fillColor(CORAL).fontSize(20).font('Helvetica-Bold').text('TravelSmarter', 50, 30);
  doc.fillColor('white').fontSize(11).font('Helvetica').text(title, 50, 58);
  doc.fillColor('black');
  doc.y = 120;

  return doc;
}

function heading(doc, text) {
  doc.moveDown(0.5);
  doc.fillColor(NAVY).fontSize(16).font('Helvetica-Bold').text(text);
  doc.fillColor('black').font('Helvetica');
  doc.moveDown(0.3);
}

// Smaller, coral-colored heading for a sub-item within a section — used by
// the Trip Brief to label each individual tool's result under its category
// heading, one step down from heading() in the visual hierarchy.
function subheading(doc, text) {
  doc.moveDown(0.4);
  doc.fillColor(CORAL).fontSize(13).font('Helvetica-Bold').text(text);
  doc.fillColor('black').font('Helvetica');
  doc.moveDown(0.15);
}

function paragraph(doc, text) {
  doc.fontSize(11).fillColor('#1f2937').font('Helvetica').text(text, { lineGap: 3 });
  doc.moveDown(0.5);
}

function bulletList(doc, items) {
  items.forEach(item => {
    doc.fontSize(11).fillColor('#1f2937').text(`•  ${item}`, { lineGap: 3, indent: 10 });
  });
  doc.moveDown(0.5);
}

// linkUrl is optional — when passed, the whole box's text becomes a
// clickable link (e.g. a mid-document Trip Brief nudge in a long bundle
// PDF, so the ask isn't only ever at the very end of the document).
function highlightBox(doc, text, linkUrl) {
  const startY = doc.y;
  const boxHeight = doc.heightOfString(text, { width: 460, fontSize: 12 }) + 24;
  doc.rect(50, startY, 495, boxHeight).fill('#f0f4ff');
  doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
    .text(text, 65, startY + 12, linkUrl ? { width: 460, link: linkUrl, underline: true } : { width: 460 });
  doc.fillColor('black').font('Helvetica');
  doc.y = startY + boxHeight + 12;
}

// Standard closing CTA block — same on every tool's PDF. When called with a
// destination country slug, pitches the Trip Brief (this trip's other open
// questions, combined into one PDF) as the primary CTA, with TravelSmarter
// Pro as a smaller secondary line — otherwise falls back to the original
// Pro-only box, e.g. for airline/airport-based tools with no destination.
function addFooterCTA(doc, tripDestination) {
  doc.moveDown(1);
  const startY = doc.y;
  const boxHeight = tripDestination ? 108 : 90;
  doc.rect(50, startY, 495, boxHeight).fill(NAVY);

  if (tripDestination) {
    const tripBriefUrl = `https://travelsmarterapp.com/trip-brief.html?destination=${tripDestination}`;
    doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
      .text('Got other open questions about this trip?', 65, startY + 16, { width: 465 });
    doc.fontSize(10).font('Helvetica')
      .text('Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.', 65, startY + 38, { width: 465 });
    doc.fillColor(CORAL).font('Helvetica-Bold')
      .text(`travelsmarterapp.com/trip-brief.html?destination=${tripDestination}`, 65, startY + 62, { width: 465, link: tripBriefUrl, underline: true });
    doc.fillColor(LIGHT_GRAY).fontSize(8.5).font('Helvetica')
      .text('Or unlock 50+ tools and ongoing updates with TravelSmarter Pro — travelsmarterapp.com/sales-page.html', 65, startY + 86, { width: 465, link: 'https://travelsmarterapp.com/sales-page.html' });
  } else {
    doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
      .text('This tool is part of TravelSmarter Pro', 65, startY + 16, { width: 465 });
    doc.fontSize(10).font('Helvetica')
      .text('Get 50+ more travel tools, AI-powered recommendations, and ongoing updates — plus the full 87-hack library.', 65, startY + 38, { width: 465 });
    doc.fillColor(CORAL).font('Helvetica-Bold')
      .text('travelsmarterapp.com/sales-page.html', 65, startY + 66, { link: 'https://travelsmarterapp.com/sales-page.html', underline: true });
  }

  doc.fillColor('black').font('Helvetica');
  doc.y = startY + boxHeight + 12;
}

// Collects a PDFDocument's output into a Buffer instead of streaming it to
// an HTTP response — needed wherever a PDF is emailed as an attachment
// (base64) rather than downloaded directly, e.g. the Trip Brief. Call
// BEFORE doc.end(): pass the doc, write all content, call doc.end(), then
// await the returned promise.
function toBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

module.exports = {
  createBrandedDoc,
  toBuffer,
  heading,
  subheading,
  paragraph,
  bulletList,
  highlightBox,
  addFooterCTA,
  COLORS: { NAVY, CORAL, GRAY, LIGHT_GRAY },
};
