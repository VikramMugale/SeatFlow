const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate } = require('../../middleware/auth');
const env = require('../../config/environment');

function developmentOnly(req, res, next) {
	if (env.nodeEnv !== 'development') {
		return res.status(503).json({
			success: false,
			message: 'Online payments are not configured for this environment.',
		});
	}
	next();
}

router.post('/webhook', controller.webhook); // public — verified by signature
router.post('/create', authenticate(), developmentOnly, validate(schemas.createPayment), controller.create);
router.get('/:id', authenticate(), controller.get);
router.post('/simulate-success', authenticate(), developmentOnly, controller.simulateSuccess);

module.exports = router;
