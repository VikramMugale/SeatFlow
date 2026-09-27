const reservationService = require('./reservation.service');

async function create(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || null;
    const result = await reservationService.createReservation(
      req.user.id,
      req.body,
      idempotencyKey
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const result = await reservationService.getReservation(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    await reservationService.cancelReservation(req.params.id, req.user.id);
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, get, cancel };
