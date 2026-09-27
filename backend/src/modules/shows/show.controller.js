const showService = require('./show.service');

async function list(req, res, next) {
  try {
    const shows = await showService.listShows(req.query);
    res.json({ success: true, data: shows });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const show = await showService.getShow(req.params.id);
    res.json({ success: true, data: show });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const show = await showService.createShow(req.body);
    res.status(201).json({ success: true, data: show });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const show = await showService.cancelShow(req.params.id);
    res.json({ success: true, data: show });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, cancel };
