const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/userController');
const { requireAuth, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(requireAuth);

router.post('/',
  requirePermission('users:create'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').notEmpty(),
  body('last_name').notEmpty(),
  body('role_id').isInt({ min: 1 }),
  body('department_code').optional().isAlphanumeric().isLength({ max: 10 }),
  validate,
  ctrl.create
);

router.get('/',
  requirePermission('users:read'),
  ctrl.list
);

// Picker — accessible to anyone with MOC viewing rights for assignment dropdowns
router.get('/picker',
  requirePermission('moc:view'),
  ctrl.picker
);

router.patch('/:id',
  requirePermission('users:create'),
  ctrl.update
);

router.patch('/:id/deactivate',
  requirePermission('users:deactivate'),
  ctrl.deactivate
);

module.exports = router;
