const venueService = require('./venue.service');

async function list(req, res, next) {
  try {
    const venues = await venueService.listVenues(req.query);
    res.json({ success: true, data: venues });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const venue = await venueService.getVenue(req.params.id);
    res.json({ success: true, data: venue });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const venue = await venueService.createVenue(req.body);
    res.status(201).json({ success: true, data: venue });
  } catch (err) {
    next(err);
  }
}

async function createScreen(req, res, next) {
  try {
    const screen = await venueService.createScreen(req.params.id, req.body);
    res.status(201).json({ success: true, data: screen });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body);
    res.json({ success: true, data: venue });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, createScreen, update };
