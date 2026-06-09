const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-12345';

/**
 * Middleware to verify admin JWT token
 */
function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if it's an admin token
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not an admin token'
      });
    }

    // Attach admin info to request
    req.admin = decoded;

    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
}

/**
 * Middleware to check admin role
 */
function requireAdminRole(allowedRoles = ['admin']) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  verifyAdminToken,
  requireAdminRole
};
