const express = require('express');
const router = express.Router();
const controller = require('./booking.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate());

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/:id/cancel', controller.cancel);

module.exports = router;
