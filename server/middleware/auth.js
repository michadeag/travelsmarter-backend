const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const protect = async (req, res, next) => {
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

    // Fetch user's current subscription tier from database
    const userResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.subscription_tier, s.tier as subscription_tier_from_table
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Determine tier: prefer subscription table, but fall back to users table for manually upgraded users
    let tier = user.subscription_tier_from_table || user.subscription_tier || 'free';

    req.user = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      subscription_tier: tier
    };

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

      // Fetch user's current subscription tier from database
      const userResult = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.subscription_tier, s.tier as subscription_tier_from_table
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id
         WHERE u.id = $1`,
        [decoded.id]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];

        // Determine tier: prefer subscription table, but fall back to users table for manually upgraded users
        let tier = user.subscription_tier_from_table || user.subscription_tier || 'free';

        req.user = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          subscription_tier: tier
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

/**
 * Middleware that accepts both user and admin tokens
 * Used for endpoints that should be accessible by both authenticated users and admins
 */
const protectWithAdminFallback = async (req, res, next) => {
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

    // Check if it's an admin token
    if (decoded.type === 'admin') {
      // Admin token - create a minimal user object for compatibility
      req.user = {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        role: decoded.role,
        isAdmin: true
      };
      next();
      return;
    }

    // Regular user token - fetch from database
    const userResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.subscription_tier, s.tier as subscription_tier_from_table
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    let tier = user.subscription_tier_from_table || user.subscription_tier || 'free';

    req.user = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      subscription_tier: tier
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

module.exports = {
  protect,
  optionalAuth,
  protectWithAdminFallback,
  generateToken,
};
