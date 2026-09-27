const bookingService = require('./booking.service');

async function list(req, res, next) {
  try {
    const bookings = await bookingService.listBookings(req.user.id, req.query);
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const booking = await bookingService.getBooking(req.params.id, req.user.id);
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const result = await bookingService.cancelBooking(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, cancel };
