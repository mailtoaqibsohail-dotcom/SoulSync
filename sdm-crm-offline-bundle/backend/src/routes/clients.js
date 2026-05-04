const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/clientController');
const { requireAuth, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(requireAuth);

router.post('/',
  requirePermission('clients:create'),
  body('code').notEmpty().isLength({ max: 20 }).isAlphanumeric(),
  body('company_name').notEmpty().isLength({ max: 200 }),
  body('contact_email').optional().isEmail(),
  validate,
  ctrl.create
);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

router.put('/:id',
  requirePermission('clients:update'),
  ctrl.update
);

router.post('/:id/login',
  requirePermission('users:create'),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').notEmpty(),
  body('last_name').notEmpty(),
  validate,
  ctrl.createLogin
);

router.get('/:id/logins',
  requirePermission('users:create'),
  ctrl.listLogins
);

module.exports = router;
