const seatService = require('./seat.service');

async function getShowSeats(req, res, next) {
  try {
    const data = await seatService.getShowSeats(req.params.showId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getShowSeats };
