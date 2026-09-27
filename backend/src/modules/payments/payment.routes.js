const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate } = require('../../middleware/auth');

router.post('/webhook', controller.webhook); // public — verified by signature
router.post('/create', authenticate(), validate(schemas.createPayment), controller.create);
router.get('/:id', authenticate(), controller.get);
router.post('/simulate-success', authenticate(), controller.simulateSuccess); // dev only

module.exports = router;
