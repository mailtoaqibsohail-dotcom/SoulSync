const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/projectController');
const { requireAuth, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(requireAuth);

router.post('/',
  requirePermission('projects:create'),
  body('code').notEmpty().isLength({ max: 30 }),
  body('name').notEmpty().isLength({ max: 300 }),
  body('client_id').isInt({ min: 1 }),
  body('start_date').optional().isDate(),
  body('end_date').optional().isDate(),
  validate,
  ctrl.create
);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);

router.put('/:id',
  requirePermission('projects:update'),
  ctrl.update
);

module.exports = router;
