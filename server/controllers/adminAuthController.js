const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const pool = require('../config/database');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required — refusing to sign admin tokens with a hardcoded fallback');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h'; // Admin tokens expire in 24 hours
const APP_URL = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com';

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
 * Request an admin password reset — always responds success so we don't leak
 * which emails have an admin account; the actual email only sends if found.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const result = await pool.query(
      'SELECT id, first_name FROM admin_users WHERE email = $1',
      [email.toLowerCase()]
    );

    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link is on its way.',
    });

    if (result.rows.length === 0) return;

    const admin = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE admin_users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [token, expires, admin.id]
    );

    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️ SENDGRID_API_KEY not set — admin password reset email not sent');
      return;
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const resetUrl = `${APP_URL}/admin/reset-password.html?token=${token}`;
    await sgMail.send({
      to: email.toLowerCase(),
      from: FROM_EMAIL,
      subject: '🔑 Reset your TravelSmarter admin password',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#1a2744;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <span style="color:#ff6b4a;font-size:1.5em;font-weight:800;">🛂 TravelSmarter Admin</span>
          </div>
          <div style="padding:32px 24px;background:#fff;border:1px solid #e5e7eb;">
            <h2 style="margin:0 0 16px;color:#1a2744;">Hi ${admin.first_name || 'there'},</h2>
            <p style="color:#374151;line-height:1.6;">You requested a password reset for the admin dashboard. Click the button below — the link is valid for 1 hour.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="background:#ff6b4a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.05em;">Reset Admin Password →</a>
            </div>
            <p style="color:#6b7280;font-size:0.88em;">If you didn't request this, ignore this email — your password won't change.</p>
          </div>
        </div>`,
    });
  } catch (error) {
    console.error('❌ Admin forgot-password error:', error);
  }
}

/**
 * Complete an admin password reset with a valid, unexpired token.
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const result = await pool.query(
      `SELECT id FROM admin_users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE admin_users
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('❌ Admin reset-password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
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
  forgotPassword,
  resetPassword,
  logout
};
