const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { query } = require('../config/database');
const logger = require('../utils/logger');

function authenticate(required = true) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        if (required) {
          return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        return next();
      }

      const token = header.slice(7);
      const payload = jwt.verify(token, env.jwt.accessSecret);

      const result = await query(
        'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
        [payload.sub]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return res.status(401).json({ success: false, message: 'User not found or inactive' });
      }

      req.user = result.rows[0];
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      logger.error('Auth middleware error', { error: err.message });
      return res.status(500).json({ success: false, message: 'Authentication error' });
    }
  };
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
