const express = require('express');
const router = express.Router();
const controller = require('./show.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.get);

router.post('/', authenticate(), authorize('ADMIN'), validate(schemas.createShow), controller.create);
router.post('/:id/cancel', authenticate(), authorize('ADMIN'), controller.cancel);

module.exports = router;
