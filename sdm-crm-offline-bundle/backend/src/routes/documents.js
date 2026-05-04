const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/documentController');
const { requireAuth, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
const ATTACH_DIR = path.join(UPLOADS_DIR, 'attachments');
fs.mkdirSync(ATTACH_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ATTACH_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /pdf|msword|officedocument|image\/(png|jpeg|jpg)|plain|excel|spreadsheet/i.test(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type'), ok);
  }
});

// All document routes require authentication
router.use(requireAuth);

router.post('/',
  requirePermission('documents:create'),
  body('title').notEmpty().isLength({ max: 500 }),
  body('doc_type_code').notEmpty().isLength({ max: 10 }).isAlphanumeric(),
  body('department_code').optional().isLength({ max: 10 }).isAlphanumeric(),
  body('client_id').optional().isInt({ min: 1 }),
  body('project_id').optional().isInt({ min: 1 }),
  body('content').optional().isObject(),
  validate,
  ctrl.create
);

router.get('/', ctrl.list);

router.get('/:id',
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.get
);

router.patch('/:id/status',
  requirePermission('documents:update_status'),
  param('id').isInt({ min: 1 }),
  body('status').isIn(['under_review', 'approved', 'issued', 'cancelled', 'draft']),
  validate,
  ctrl.updateStatus
);

router.get('/:id/download',
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.download
);

router.post('/:id/attachment',
  requirePermission('documents:create'),
  param('id').isInt({ min: 1 }),
  validate,
  upload.single('file'),
  ctrl.uploadAttachment
);

router.get('/:id/attachment',
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.downloadAttachment
);

router.get('/:id/preview',
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.previewAttachment
);

router.post('/:id/regenerate-pdf',
  requirePermission('documents:create'),
  param('id').isInt({ min: 1 }),
  validate,
  ctrl.regeneratePDF
);

module.exports = router;
