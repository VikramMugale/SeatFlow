const express = require('express');
const router = express.Router();
const controller = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth');

// Admin only
router.get('/', authenticate(), authorize('ADMIN'), controller.list);
router.get('/stats', authenticate(), authorize('ADMIN'), controller.stats);
router.get('/:id', authenticate(), authorize('ADMIN'), controller.getById);
router.patch('/:id', authenticate(), authorize('ADMIN'), controller.update);

// Authenticated user — change own password
router.post('/me/change-password', authenticate(), controller.changePassword);

module.exports = router;
