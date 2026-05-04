const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/mocController');
const { requireAuth, requirePermission } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(requireAuth);

router.get('/kpi', requirePermission('moc:view'), ctrl.kpi);
router.get('/my-actions', requirePermission('moc:view'), ctrl.myActions);
router.get('/audit',         requirePermission('moc:view'), ctrl.audit);
router.get('/audit/pdf',     requirePermission('moc:view'), ctrl.auditPdf);
router.get('/delegatees',    requirePermission('moc:view'), ctrl.delegatees);
router.get('/:id/minute-sheet', requirePermission('moc:view'), ctrl.minuteSheet);
router.get('/', requirePermission('moc:view'), ctrl.list);
router.get('/:id', requirePermission('moc:view'), ctrl.get);

router.post('/',
  requirePermission('moc:create'),
  body('title').notEmpty().isLength({ max: 500 }),
  body('department_code').notEmpty().isLength({ max: 20 }),
  body('field_name').notEmpty().isLength({ max: 120 }),
  body('duration').isIn(['permanent', 'temporary']),
  body('type_subcategory').isIn([
    'facility', 'technology', 'operations', 'analytical_method',
    'document_psi', 'subtle', 'emergency', 'approved_project'
  ]),
  body('category').isIn(['A', 'B', 'C', 'D']),
  body('priority').isIn(['1', '2', '3']),
  body('doc_kind').optional().isIn(['moc', 'dispensation']),
  validate,
  ctrl.create
);

router.patch('/:id', requirePermission('moc:update'), ctrl.update);
router.post('/:id/submit', requirePermission('moc:update'), ctrl.submit);

router.get('/:id/steps',                 requirePermission('moc:view'),   ctrl.getSteps);
router.post('/:id/steps/:stepId/act',    requirePermission('moc:update'), ctrl.actOnStep);

router.get('/:id/forms',                            requirePermission('moc:view'),   ctrl.listForms);
router.put('/:id/forms/:formType',                  requirePermission('moc:update'), ctrl.saveForm);
router.post('/:id/forms/:formType/submit',          requirePermission('moc:update'), ctrl.submitForm);
router.post('/:id/forms/:formType/reopen',          requirePermission('moc:update'), ctrl.reopenForm);
router.post('/:id/forms/:formType/approve',         requirePermission('moc:update'), ctrl.approveForm);

module.exports = router;
