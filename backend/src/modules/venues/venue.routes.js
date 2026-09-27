const express = require('express');
const router = express.Router();
const controller = require('./venue.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.get);

router.post('/', authenticate(), authorize('ADMIN'), validate(schemas.createVenue), controller.create);
router.post('/:id/screens', authenticate(), authorize('ADMIN'), controller.createScreen);
router.put('/:id', authenticate(), authorize('ADMIN'), controller.update);

module.exports = router;
