const userService = require('./user.service');

async function list(req, res, next) {
  try {
    const { page, limit, role, search } = req.query;
    const data = await userService.listUsers({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      role,
      search,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const data = await userService.getAdminStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, update, changePassword, stats };
