const express = require('express');
const router = express.Router();
const controller = require('./event.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', controller.list);
router.get('/manage', authenticate(), authorize('ADMIN'), controller.manage);
router.get('/:id', controller.get);

router.post('/', authenticate(), authorize('ADMIN'), validate(schemas.createEvent), controller.create);
router.put('/:id', authenticate(), authorize('ADMIN'), controller.update);
router.delete('/:id', authenticate(), authorize('ADMIN'), controller.remove);

module.exports = router;
