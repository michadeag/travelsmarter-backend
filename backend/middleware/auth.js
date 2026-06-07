const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user's subscription tier from database
      const userResult = await pool.query(
        'SELECT id, subscription_tier FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length > 0) {
        req.user = {
          id: decoded.id,
          subscription_tier: userResult.rows[0].subscription_tier
        };
      } else {
        req.user = null;
      }
    } catch (error) {
      // Token is invalid, but we'll continue without auth
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

module.exports = {
  protect,
  optionalAuth,
  generateToken,
};
