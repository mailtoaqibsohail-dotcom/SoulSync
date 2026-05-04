/**
 * PDF Generation Service (PDFKit — pure Node.js, no headless Chrome)
 * Generates a professional document PDF from document data.
 * File is saved to: {UPLOADS_DIR}/{year}/{month}/{doc_type}/
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

/**
 * Build the file path for a document.
 * e.g. /uploads/2026/04/PFE/PFE-ENG-2026-0001_v1.pdf
 */
function buildFilePath(serialNumber, docTypeCode, version = 1) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const dir = path.join(UPLOADS_DIR, String(year), month, docTypeCode);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${serialNumber}_v${version}.pdf`;
  return {
    absolutePath: path.join(dir, filename),
    relativePath: path.join(String(year), month, docTypeCode, filename)
  };
}

/**
 * Generate a PDF for a document record.
 *
 * @param {object} docData   Fields: serial_number, title, doc_type_code,
 *                           department_code, version, content, client, project, creator
 * @returns {Promise<string>} relativePath stored in DB
 */
function generateDocumentPDF(docData) {
  return new Promise((resolve, reject) => {
    const { absolutePath, relativePath } = buildFilePath(
      docData.serial_number,
      docData.doc_type_code,
      docData.version
    );

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: docData.title,
        Author: `${docData.creator?.first_name} ${docData.creator?.last_name}`,
        Subject: docData.serial_number,
        Creator: 'SDM-CRM'
      }
    });

    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    renderHeader(doc, docData);
    renderBody(doc, docData);
    renderFooter(doc, docData);

    doc.end();

    stream.on('finish', () => {
      logger.info(`PDF generated: ${relativePath}`);
      resolve(relativePath);
    });

    stream.on('error', reject);
  });
}

// ──────────────────────────────────────────────
// Layout Helpers
// ──────────────────────────────────────────────

function renderHeader(doc, data) {
  const pageWidth = doc.page.width - 120; // account for margins

  // Company brand bar
  doc.rect(60, 40, pageWidth, 48).fill('#1a3a5c');
  doc.fontSize(18).fillColor('#ffffff')
     .text('SDM-CRM | Engineering Document Control', 70, 52, { width: pageWidth - 20 });

  doc.moveDown(3);

  // Document title
  doc.fontSize(16).fillColor('#1a3a5c')
     .text(data.title, { align: 'center' });

  doc.moveDown(0.5);

  // Serial number badge
  doc.fontSize(12).fillColor('#555')
     .text(`Serial: ${data.serial_number}  |  Version: ${data.version}  |  Status: ${data.status}`,
           { align: 'center' });

  doc.moveDown(1);
  doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#1a3a5c').stroke();
  doc.moveDown(0.5);
}

function renderBody(doc, data) {
  // Metadata table
  const rows = [
    ['Document Type', data.doc_type_code],
    ['Department', data.department_code],
    ['Client', data.client?.company_name || 'N/A'],
    ['Project', data.project ? `${data.project.code} — ${data.project.name}` : 'N/A'],
    ['Prepared By', `${data.creator?.first_name} ${data.creator?.last_name}`],
    ['Date', new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })]
  ];

  const colX = [60, 220];
  const rowH = 22;
  let y = doc.y;

  rows.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? '#f0f4f8' : '#ffffff';
    doc.rect(colX[0], y, 480, rowH).fill(bg);
    doc.fontSize(10).fillColor('#333')
       .text(label, colX[0] + 6, y + 5, { width: 154 })
       .text(String(value || ''), colX[1], y + 5, { width: 310 });
    y += rowH;
  });

  doc.y = y + 10;
  doc.moveDown(1);

  // Document content fields
  const content = data.content || {};
  if (Object.keys(content).length > 0) {
    doc.fontSize(13).fillColor('#1a3a5c').text('Document Content');
    doc.moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    Object.entries(content).forEach(([key, value]) => {
      doc.fontSize(11).fillColor('#1a3a5c').text(toLabel(key));
      doc.fontSize(10).fillColor('#333').text(String(value || ''));
      doc.moveDown(0.5);
    });
  }

  // Notes
  if (data.notes) {
    doc.moveDown(1);
    doc.fontSize(11).fillColor('#1a3a5c').text('Notes');
    doc.fontSize(10).fillColor('#555').text(data.notes);
  }
}

function renderFooter(doc, data) {
  const bottom = doc.page.height - 50;
  doc.fontSize(8).fillColor('#888')
     .text(
       `${data.serial_number}  |  Generated: ${new Date().toISOString()}  |  CONFIDENTIAL`,
       60, bottom,
       { align: 'center', width: doc.page.width - 120 }
     );
  doc.moveTo(60, bottom - 6).lineTo(doc.page.width - 60, bottom - 6).strokeColor('#ccc').stroke();
}

function toLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

module.exports = { generateDocumentPDF, buildFilePath };
