/**
 * Render an MOC Audit Report PDF using pdfkit.
 * Streams to the provided HTTP response so memory stays small.
 */
const PDFDocument = require('pdfkit');

function fmt(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toISOString().slice(0, 10);
}

function streamAuditPdf(audit, res) {
  const doc = new PDFDocument({ margin: 36, size: 'A4', info: { Title: 'MOC Audit Report' } });
  doc.pipe(res);

  // ── Header
  doc.fontSize(18).fillColor('#0f172a').text('Management of Change — Audit Report', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(9).fillColor('#475569').text(
    `Period: ${fmt(audit.range.from)}  to  ${fmt(audit.range.to)}    Generated: ${fmt(new Date())}`,
    { align: 'center' }
  );
  doc.moveDown(0.8);

  // ── Top totals
  hr(doc);
  doc.fontSize(12).fillColor('#0f172a').text('Summary');
  doc.moveDown(0.2);
  const t = audit.totals;
  kvRow(doc, [
    ['Raised',   String(t.raised)],
    ['Closed',   String(t.closed)],
    ['Rejected', String(t.rejected)],
    ['Expired',  String(t.expired)],
    ['Open',     String(t.open)]
  ]);
  doc.moveDown(0.4);

  // ── Cycle timing
  doc.fontSize(11).fillColor('#0f172a').text('Average Cycle Times (days)');
  doc.moveDown(0.2);
  const ti = audit.timing || {};
  kvRow(doc, [
    ['Initiate → Approve',     fmtNum(ti.avg_days_to_approve)],
    ['Approve → Execute',      fmtNum(ti.avg_days_approve_to_exec)],
    ['Execute → Close',        fmtNum(ti.avg_days_exec_to_close)],
    ['Total cycle',            fmtNum(ti.avg_days_total_cycle)]
  ]);
  doc.moveDown(0.6);

  // ── Distributions
  twoColMaps(doc,
    'By Status',         audit.by_status,
    'By Stage',          audit.by_stage);
  twoColMaps(doc,
    'By Classification', audit.by_classification,
    'By Risk Level',     audit.by_risk_level);
  twoColMaps(doc,
    'By Department',     audit.by_department,
    'By Kind',           audit.by_kind);
  twoColMaps(doc,
    'By Field',          audit.by_field,
    null,                null);

  // ── By Originator
  ensureSpace(doc, 120);
  doc.fontSize(12).fillColor('#0f172a').text('MOCs Raised — By Originator');
  doc.moveDown(0.2);
  table(doc,
    ['Name', 'Dept', 'Raised', 'Closed', 'Rejected', 'Expired', 'In Progress'],
    audit.by_originator.map(r => [
      r.name || '—', r.dept || '—',
      String(r.raised), String(r.closed), String(r.rejected), String(r.expired), String(r.in_progress)
    ]),
    [120, 50, 50, 50, 60, 50, 70]
  );
  doc.moveDown(0.6);

  // ── Pending workload
  ensureSpace(doc, 120);
  doc.fontSize(12).fillColor('#0f172a').text('Pending Approval Workload — By Assignee (current)');
  doc.moveDown(0.2);
  table(doc,
    ['Name', 'Dept', 'Total', 'Classify', 'Approve', 'SME'],
    audit.pending_by_assignee.map(r => [
      r.name || '—', r.dept || '—',
      String(r.pending_steps), String(r.pending_classify), String(r.pending_approve), String(r.pending_sme)
    ]),
    [140, 60, 60, 70, 70, 60]
  );
  doc.moveDown(0.6);

  // ── List of MOCs in range
  ensureSpace(doc, 140);
  doc.fontSize(12).fillColor('#0f172a').text(`MOCs in Period (${audit.list.length})`);
  doc.moveDown(0.2);
  table(doc,
    ['MOC #', 'Title', 'Dept', 'Class', 'Stage', 'Status', 'Originator', 'Initiated', 'Closed'],
    audit.list.map(m => [
      m.moc_number,
      truncate(m.title, 28),
      `${m.department_code}/${m.field_name || ''}`,
      m.classification || '—',
      String(m.stage),
      m.status,
      truncate(m.originator || '—', 18),
      fmt(m.initiated_at),
      m.closed_at ? fmt(m.closed_at) : '—'
    ]),
    [80, 130, 60, 45, 35, 60, 90, 55, 55]
  );

  // ── Footer note
  doc.moveDown(0.6);
  doc.fontSize(8).fillColor('#475569').text(
    'Audit data sourced from MariEnergies SDM-CRM. MSP-HSE-08 Management of Change procedure.',
    { align: 'center' }
  );

  doc.end();
}

// ── helpers ────────────────────────────────────
function hr(doc) {
  doc.strokeColor('#e2e8f0').lineWidth(0.5)
     .moveTo(doc.page.margins.left, doc.y)
     .lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.3);
}

function kvRow(doc, pairs) {
  const xStart = doc.page.margins.left;
  const widthEach = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / pairs.length;
  const y = doc.y;
  pairs.forEach(([label, value], i) => {
    const x = xStart + i * widthEach;
    doc.fontSize(8).fillColor('#475569').text(label, x, y, { width: widthEach - 4 });
    doc.fontSize(13).fillColor('#0f172a').text(value, x, y + 11, { width: widthEach - 4 });
  });
  doc.y = y + 30;
}

function twoColMaps(doc, lLabel, lMap, rLabel, rMap) {
  ensureSpace(doc, 90);
  const startY = doc.y;
  const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - 6;
  if (lLabel) renderMap(doc, lLabel, lMap || {}, doc.page.margins.left, startY, colW);
  if (rLabel) renderMap(doc, rLabel, rMap || {}, doc.page.margins.left + colW + 12, startY, colW);
  // advance to lower of the two
  const lh = Object.keys(lMap || {}).length;
  const rh = Object.keys(rMap || {}).length;
  doc.y = startY + 18 + Math.max(lh, rh) * 12 + 8;
}

function renderMap(doc, label, map, x, y, w) {
  doc.fontSize(10).fillColor('#0f172a').text(label, x, y, { width: w });
  let cy = y + 14;
  const entries = Object.entries(map);
  if (!entries.length) {
    doc.fontSize(9).fillColor('#94a3b8').text('(none)', x, cy);
    return;
  }
  entries.forEach(([k, v]) => {
    doc.fontSize(9).fillColor('#475569').text(String(k), x, cy, { width: w * 0.7 });
    doc.fontSize(9).fillColor('#0f172a').text(String(v), x + w * 0.7, cy, { width: w * 0.3, align: 'right' });
    cy += 12;
  });
}

function table(doc, headers, rows, widths) {
  const xStart = doc.page.margins.left;
  let y = doc.y;
  // header
  doc.fontSize(8).fillColor('#fff');
  doc.rect(xStart, y - 2, widths.reduce((a,b)=>a+b,0), 14).fill('#0f172a');
  let x = xStart + 4;
  headers.forEach((h, i) => {
    doc.fillColor('#fff').fontSize(8).text(h, x, y, { width: widths[i] - 6 });
    x += widths[i];
  });
  y += 14;
  doc.fillColor('#0f172a');

  // body
  rows.forEach((row, ri) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    if (ri % 2 === 0) {
      doc.rect(xStart, y - 2, widths.reduce((a,b)=>a+b,0), 13).fill('#f8fafc');
    }
    let cx = xStart + 4;
    row.forEach((cell, i) => {
      doc.fillColor('#0f172a').fontSize(8).text(String(cell ?? ''), cx, y, { width: widths[i] - 6, lineBreak: false, ellipsis: true });
      cx += widths[i];
    });
    y += 13;
  });
  doc.y = y + 4;
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function fmtNum(n) { return (n === null || n === undefined) ? '—' : String(n); }

module.exports = { streamAuditPdf };
