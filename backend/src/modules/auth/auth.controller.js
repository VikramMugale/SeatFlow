const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.body.refreshToken;
    await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
}

/**
 * Forgot password — issues a reset token (demo: logged, not emailed)
 * In production: store hashed token, send email with link.
 */
async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, message: 'If the email exists, a reset link has been sent', data: result });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Password has been reset' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me, forgotPassword, resetPassword };
