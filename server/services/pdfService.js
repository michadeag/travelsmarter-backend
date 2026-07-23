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

function highlightBox(doc, text) {
  const startY = doc.y;
  const boxHeight = doc.heightOfString(text, { width: 460, fontSize: 12 }) + 24;
  doc.rect(50, startY, 495, boxHeight).fill('#f0f4ff');
  doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold').text(text, 65, startY + 12, { width: 460 });
  doc.fillColor('black').font('Helvetica');
  doc.y = startY + boxHeight + 12;
}

// Standard closing CTA block — same on every tool's PDF.
function addFooterCTA(doc) {
  doc.moveDown(1);
  const startY = doc.y;
  doc.rect(50, startY, 495, 90).fill(NAVY);
  doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
    .text('This tool is part of TravelSmarter Pro', 65, startY + 16, { width: 465 });
  doc.fontSize(10).font('Helvetica')
    .text('Get 50+ more travel tools, AI-powered recommendations, and ongoing updates — plus the full 87-hack library.', 65, startY + 38, { width: 465 });
  doc.fillColor(CORAL).font('Helvetica-Bold')
    .text('travelsmarterapp.com/sales-page.html', 65, startY + 66);
  doc.fillColor('black').font('Helvetica');
  doc.y = startY + 100;
}

module.exports = {
  createBrandedDoc,
  heading,
  paragraph,
  bulletList,
  highlightBox,
  addFooterCTA,
  COLORS: { NAVY, CORAL, GRAY, LIGHT_GRAY },
};
