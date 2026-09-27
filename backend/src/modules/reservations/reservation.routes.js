const express = require('express');
const router = express.Router();
const controller = require('./reservation.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate());

router.post('/', validate(schemas.createReservation), controller.create);
router.get('/:id', controller.get);
router.delete('/:id', controller.cancel);

module.exports = router;
