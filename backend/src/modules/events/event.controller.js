const eventService = require('./event.service');

async function list(req, res, next) {
  try {
    const { type, city, search, page, limit } = req.query;
    const result = await eventService.listEvents({
      type,
      city,
      search,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const event = await eventService.getEvent(req.params.id);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

async function manage(req, res, next) {
  try {
    const events = await eventService.listManageEvents();
    res.json({ success: true, data: { events } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const event = await eventService.createEvent(req.body, req.user.id);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await eventService.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, manage, get, create, update, remove };
