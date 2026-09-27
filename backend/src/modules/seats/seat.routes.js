const express = require('express');
const router = express.Router();
const controller = require('./seat.controller');

// Mounted at /api/shows so path is /api/shows/:showId/seats
router.get('/:showId/seats', controller.getShowSeats);

module.exports = router;
