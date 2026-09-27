const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { validate, schemas } = require('../../middleware/validation');
const { authenticate } = require('../../middleware/auth');

router.post('/register', validate(schemas.register), controller.register);
router.post('/login', validate(schemas.login), controller.login);
router.post('/refresh', validate(schemas.refresh), controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate(), controller.me);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

module.exports = router;
