/**
 * Document Controller
 * Handles: create, list, get, status transitions, PDF download.
 *
 * Document creation flow:
 *   1. Validate input
 *   2. Open DB transaction
 *   3. Generate serial (row-locked inside same transaction)
 *   4. Insert document record
 *   5. Commit transaction
 *   6. Generate PDF (after commit — so serial is permanent)
 *   7. Update file_path on document
 *   8. Write audit log
 */

const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { sequelize, Document, Client, Project, User, AuditLog } = require('../models');
const { generateSerial } = require('../services/serialGenerator');
const { generateDocumentPDF } = require('../services/pdfService');
const audit = require('../services/auditService');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

// ── POST /api/documents ─────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      title,
      doc_type_code,
      department_code,
      content,
      client_id,
      project_id,
      notes
    } = req.body;

    // Generate serial inside this transaction — row lock prevents duplicates
    const serialNumber = await generateSerial(
      doc_type_code.toUpperCase(),
      (department_code || req.user.department_code).toUpperCase(),
      t          // ← pass transaction so serial gen shares the same TX
    );

    const document = await Document.create({
      serial_number: serialNumber,
      title,
      doc_type_code: doc_type_code.toUpperCase(),
      department_code: (department_code || req.user.department_code).toUpperCase(),
      version: 1,
      status: 'draft',
      content: content || {},
      client_id: client_id || null,
      project_id: project_id || null,
      created_by: req.user.id,
      notes: notes || null
    }, { transaction: t });

    await t.commit();

    // ── Generate PDF after commit (serial is now permanent in DB) ──
    try {
      const docWithRelations = await Document.findByPk(document.id, {
        include: [
          { model: Client, as: 'client' },
          { model: Project, as: 'project' },
          { model: User, as: 'creator', attributes: ['first_name', 'last_name'] }
        ]
      });

      const relativePath = await generateDocumentPDF(docWithRelations.get({ plain: true }));
      await document.update({ file_path: relativePath });

      await audit.log({
        entityType: 'document',
        entityId: document.id,
        action: 'created',
        newValues: { serial_number: serialNumber, status: 'draft', file_path: relativePath },
        userId: req.user.id,
        ipAddress: req.ip
      });

      res.status(201).json({
        message: 'Document created',
        document: await Document.findByPk(document.id, {
          include: [
            { model: Client, as: 'client' },
            { model: Project, as: 'project' },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
          ]
        })
      });
    } catch (pdfErr) {
      // Document record is saved; PDF failure is non-fatal
      await audit.log({
        entityType: 'document',
        entityId: document.id,
        action: 'pdf_failed',
        newValues: { error: pdfErr.message },
        userId: req.user.id
      });
      res.status(201).json({
        message: 'Document created (PDF generation failed, retry later)',
        document,
        pdf_error: pdfErr.message
      });
    }

  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ── GET /api/documents ──────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const {
      status, doc_type_code, department_code, client_id, project_id,
      page = 1, limit = 20, search
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (doc_type_code) where.doc_type_code = doc_type_code.toUpperCase();
    if (department_code) where.department_code = department_code.toUpperCase();
    if (client_id) where.client_id = client_id;
    if (project_id) where.project_id = project_id;

    // Client-portal users see only their company's approved/issued documents
    if (req.user.role?.name === 'client') {
      if (!req.user.client_id) {
        return res.json({ total: 0, page: 1, pages: 0, documents: [] });
      }
      where.client_id = req.user.client_id;
      where.status = where.status && ['approved','issued'].includes(where.status)
        ? where.status
        : { [Op.in]: ['approved', 'issued'] };
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { serial_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['id', 'code', 'company_name'] },
        { model: Project, as: 'project', attributes: ['id', 'code', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit), 100),
      offset
    });

    res.json({
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      documents: rows
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/documents/:id ──────────────────────────────────────────────────
exports.get = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [
        { model: Client, as: 'client' },
        { model: Project, as: 'project' },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'issuer', attributes: ['id', 'first_name', 'last_name'] },
        {
          model: AuditLog, as: 'audit_trail',
          include: [{ model: User, as: 'actor', attributes: ['first_name', 'last_name'] }],
          order: [['created_at', 'DESC']],
          limit: 20
        }
      ]
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });

    if (req.user.role?.name === 'client') {
      if (document.client_id !== req.user.client_id || !['approved','issued'].includes(document.status)) {
        return res.status(404).json({ error: 'Document not found' });
      }
    }

    res.json({ document });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/documents/:id/status ─────────────────────────────────────────
const VALID_TRANSITIONS = {
  draft: ['under_review', 'cancelled'],
  under_review: ['approved', 'draft', 'cancelled'],
  approved: ['issued', 'cancelled'],
  issued: [],
  cancelled: []
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const document = await Document.findByPk(req.params.id);

    if (!document) return res.status(404).json({ error: 'Document not found' });

    const allowed = VALID_TRANSITIONS[document.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${document.status}' to '${status}'`,
        allowed_transitions: allowed
      });
    }

    const oldStatus = document.status;
    const updates = { status };

    if (status === 'approved') {
      updates.approved_by = req.user.id;
      updates.approved_at = new Date();
    }
    if (status === 'issued') {
      updates.issued_by = req.user.id;
      updates.issued_at = new Date();
    }

    await document.update(updates);

    await audit.log({
      entityType: 'document',
      entityId: document.id,
      action: 'status_changed',
      oldValues: { status: oldStatus },
      newValues: { status },
      userId: req.user.id,
      ipAddress: req.ip
    });

    res.json({ message: `Document status updated to '${status}'`, document });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/documents/:id/download ─────────────────────────────────────────
exports.download = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!document.file_path) return res.status(404).json({ error: 'PDF not yet generated' });

    const fullPath = path.join(UPLOADS_DIR, document.file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'PDF file missing from disk' });

    await audit.log({
      entityType: 'document',
      entityId: document.id,
      action: 'downloaded',
      userId: req.user.id,
      ipAddress: req.ip
    });

    res.download(fullPath, `${document.serial_number}_v${document.version}.pdf`);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/documents/:id/attachment ──────────────────────────────────────
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.attachment_path) {
      const oldFull = path.join(UPLOADS_DIR, document.attachment_path);
      fs.unlink(oldFull, () => {});
    }

    const relative = path.join('attachments', req.file.filename);
    await document.update({
      attachment_path: relative,
      attachment_original_name: req.file.originalname,
      attachment_mime: req.file.mimetype,
      attachment_size: req.file.size
    });

    await audit.log({
      entityType: 'document',
      entityId: document.id,
      action: 'attachment_uploaded',
      newValues: { name: req.file.originalname, size: req.file.size },
      userId: req.user.id,
      ipAddress: req.ip
    });

    res.json({ message: 'Attachment uploaded', attachment: { name: req.file.originalname, size: req.file.size, mime: req.file.mimetype } });
  } catch (err) { next(err); }
};

// ── GET /api/documents/:id/attachment ───────────────────────────────────────
exports.downloadAttachment = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!document.attachment_path) return res.status(404).json({ error: 'No attachment' });

    const full = path.join(UPLOADS_DIR, document.attachment_path);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'Attachment missing on disk' });

    const inline = req.query.inline === '1';
    res.setHeader('Content-Type', document.attachment_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${document.attachment_original_name || 'attachment'}"`);
    fs.createReadStream(full).pipe(res);
  } catch (err) { next(err); }
};

// ── GET /api/documents/:id/preview ──────────────────────────────────────────
// Returns inline-renderable content for the attachment.
//  - PDF / image: streams with inline disposition
//  - DOCX: converts to sanitized HTML with mammoth and returns { type:'html', html }
//  - else: 415
exports.previewAttachment = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!document.attachment_path) return res.status(404).json({ error: 'No attachment' });

    const full = path.join(UPLOADS_DIR, document.attachment_path);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'Attachment missing on disk' });

    const mime = (document.attachment_mime || '').toLowerCase();
    const name = (document.attachment_original_name || '').toLowerCase();

    const isPdf   = mime.includes('pdf')   || name.endsWith('.pdf');
    const isImage = mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name);
    const isText  = mime.startsWith('text/')  || /\.(txt|md|csv|log)$/.test(name);
    const isDocx  = mime.includes('officedocument.wordprocessingml') || name.endsWith('.docx');

    if (isPdf || isImage) {
      res.setHeader('Content-Type', mime || (isPdf ? 'application/pdf' : 'application/octet-stream'));
      res.setHeader('Content-Disposition', `inline; filename="${document.attachment_original_name || 'attachment'}"`);
      return fs.createReadStream(full).pipe(res);
    }

    if (isText) {
      const content = fs.readFileSync(full, 'utf8');
      return res.json({ type: 'text', text: content });
    }

    if (isDocx) {
      const mammoth = require('mammoth');
      const result = await mammoth.convertToHtml({ path: full });
      return res.json({ type: 'html', html: result.value });
    }

    return res.status(415).json({ error: 'Preview not supported for this file type. Please download.' });
  } catch (err) { next(err); }
};

// ── POST /api/documents/:id/regenerate-pdf ──────────────────────────────────
exports.regeneratePDF = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [
        { model: Client, as: 'client' },
        { model: Project, as: 'project' },
        { model: User, as: 'creator', attributes: ['first_name', 'last_name'] }
      ]
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });

    const relativePath = await generateDocumentPDF(document.get({ plain: true }));
    await document.update({ file_path: relativePath });

    await audit.log({
      entityType: 'document',
      entityId: document.id,
      action: 'pdf_regenerated',
      userId: req.user.id
    });

    res.json({ message: 'PDF regenerated', file_path: relativePath });
  } catch (err) {
    next(err);
  }
};
