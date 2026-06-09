const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-12345';
const JWT_EXPIRY = '24h'; // Admin tokens expire in 24 hours

/**
 * Admin Login - Validates credentials and returns JWT token
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`🔐 Admin login attempt: ${email}`);

    // Find admin user
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, password_hash, role, is_active
       FROM admin_users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Admin not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const admin = result.rows[0];

    // Check if admin is active
    if (!admin.is_active) {
      console.log(`❌ Admin account disabled: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Admin account is disabled'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      console.log(`❌ Wrong password for admin: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Update last login
    await pool.query(
      `UPDATE admin_users SET last_login = NOW() WHERE id = $1`,
      [admin.id]
    );

    console.log(`✅ Admin logged in: ${email} (${admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
}

/**
 * Verify JWT token and get admin info
 */
async function verifyToken(req, res) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify admin still exists and is active
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_active
       FROM admin_users
       WHERE id = $1 AND is_active = true`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found or disabled'
      });
    }

    const admin = result.rows[0];

    res.status(200).json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
}

/**
 * Create a new admin user (only for initial setup)
 * In production, this should require authentication
 */
async function createAdmin(req, res) {
  try {
    const { email, password, firstName, lastName, role = 'moderator' } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`📝 Creating new admin: ${email}`);

    // Check if admin already exists
    const existingResult = await pool.query(
      `SELECT id FROM admin_users WHERE email = $1`,
      [email]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, first_name, last_name, role`,
      [email, passwordHash, firstName || '', lastName || '', role]
    );

    const newAdmin = result.rows[0];

    console.log(`✅ Admin created: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        firstName: newAdmin.first_name,
        lastName: newAdmin.last_name,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message
    });
  }
}

/**
 * Logout (client-side action, but we can use this for token blacklisting if needed)
 */
async function logout(req, res) {
  // In a production system, you might want to blacklist tokens here
  // For now, this is a simple endpoint that confirms logout
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

module.exports = {
  login,
  verifyToken,
  createAdmin,
  logout
};
