const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const emailSequenceService = require('../services/emailSequenceService');

const APP_URL = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com';

// @desc Magic link login
// @route GET /api/auth/magic-login
// @access Public
exports.magicLogin = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token missing' });

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, subscription_tier, subscription_status
       FROM users
       WHERE magic_login_token = $1 AND magic_login_expires > NOW()`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: 'Link is invalid or has expired.' });
    }

    const user = result.rows[0];

    // Consume token — one-time use
    await pool.query(
      `UPDATE users SET magic_login_token = NULL, magic_login_expires = NULL, last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    const jwtToken = generateToken(user.id);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status
      }
    });
  } catch (error) {
    console.error('Magic login error:', error);
    res.status(500).json({ success: false, message: 'Error processing login link' });
  }
};

// @desc Request password reset
// @route POST /api/auth/forgot-password
// @access Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const result = await pool.query('SELECT id, first_name FROM users WHERE email = $1', [email.toLowerCase()]);

    // Always respond OK — don't leak whether email exists
    res.json({ success: true, message: 'If that email is registered you will receive a reset link.' });

    if (!result.rows.length) return;

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [token, expires, user.id]
    );

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const resetUrl = `${APP_URL}/reset-password.html?token=${token}`;
    await sgMail.send({
      to: email.toLowerCase(),
      from: FROM_EMAIL,
      subject: '🔑 Reset your TravelSmarter password',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#1a2744;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <span style="color:#ff6b4a;font-size:1.5em;font-weight:800;">✈️ TravelSmarter</span>
          </div>
          <div style="padding:32px 24px;background:#fff;border:1px solid #e5e7eb;">
            <h2 style="margin:0 0 16px;color:#1a2744;">Hi ${user.first_name || 'there'},</h2>
            <p style="color:#374151;line-height:1.6;">You requested a password reset. Click the button below — the link is valid for 1 hour.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="background:#ff6b4a;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1.05em;">Reset My Password →</a>
            </div>
            <p style="color:#6b7280;font-size:0.88em;">If you didn't request this, ignore this email — your password won't change.</p>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;border-radius:0 0 12px 12px;font-size:0.8em;color:#9ca3af;">
            © 2026 TravelSmarter · <a href="${APP_URL}/auth.html" style="color:#9ca3af;">Sign in</a>
          </div>
        </div>`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
  }
};

// @desc Reset password with token
// @route POST /api/auth/reset-password
// @access Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const result = await pool.query(
      `SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, result.rows[0].id]
    );

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
};

// @desc Register user
// @route POST /api/auth/signup
// @access Public
exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier, last_login)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, email, first_name, last_name, subscription_tier, created_at`,
      [email.toLowerCase(), hashedPassword, firstName || '', lastName || '', 'free']
    );

    const user = newUser.rows[0];

    // Create JWT token
    const token = generateToken(user.id);

    // Create user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)`,
      [user.id]
    );

    // Initialize 10-day email sequence and send Day-0 immediately (non-blocking)
    console.log(`🎉 User registered: ${user.email}`);
    emailSequenceService.initializeEmailSequence(
      user.id,
      user.email,
      user.first_name
    ).then(() => {
      emailSequenceService.sendDay0Email(user.id, user.email, user.first_name)
        .catch(err => console.error('Failed to send Day-0 email:', err.message));
    }).catch(err => {
      console.error('Failed to initialize email sequence:', err.message || err);
    });

    // Enroll in the Feature Spotlight (free->paid nurture) sequence, days 11-20.
    // Automatically stops sending once the user upgrades — see sendPendingEmails().
    emailSequenceService.initializeFeatureSpotlightSequence(user.id, user.email).catch(err => {
      console.error('Failed to initialize Feature Spotlight sequence:', err.message || err);
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc Create user (admin only)
// @route POST /api/auth/users
// @access Private
exports.createUser = async (req, res) => {
  try {
    const { email, firstName, lastName, subscriptionTier = 'free' } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create a temporary password (user can change it later)
    const tempPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, subscription_tier, created_at`,
      [email.toLowerCase(), hashedPassword, firstName || '', lastName || '', subscriptionTier]
    );

    const user = newUser.rows[0];

    // Create user preferences
    await pool.query(
      `INSERT INTO user_preferences (user_id)
       VALUES ($1)`,
      [user.id]
    );

    // Initialize email sequence and send welcome email (non-blocking)
    console.log(`📬 Initializing email sequence for admin-created user ${user.email}...`);
    emailSequenceService.initializeEmailSequence(
      user.id,
      user.email,
      user.first_name
    ).catch(err => {
      console.error('Failed to initialize email sequence:', err.message || err);
    });

    // Enroll in the Feature Spotlight (free->paid nurture) sequence, days 11-20.
    emailSequenceService.initializeFeatureSpotlightSequence(user.id, user.email).catch(err => {
      console.error('Failed to initialize Feature Spotlight sequence:', err.message || err);
    });

    // Also send welcome email
    emailService.sendWelcomeEmail({
      email: user.email,
      firstName: user.first_name
    }).catch(err => {
      console.error('Failed to send welcome email:', err.message || err);
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @desc Login user
// @route POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
// @access Private
exports.getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, subscription_tier, subscription_status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        subscriptionStatus: user.subscription_status,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc Update user profile
// @route PUT /api/auth/update-profile
// @access Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const updatedUser = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, first_name, last_name, subscription_tier`,
      [firstName, lastName, req.user.id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = updatedUser.rows[0];

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc Change password
// @route POST /api/auth/change-password
// @access Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// @desc Get all users (admin only)
// @route GET /api/auth/users
// @access Private
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, subscription_tier, created_at, last_login
       FROM users
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at,
        last_login: user.last_login
      }))
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc Get user count (admin only)
// @route GET /api/auth/users/count
// @access Private
exports.getUserCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(result.rows[0].count);

    res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Get user count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user count',
      error: error.message
    });
  }
};

// @desc Update user (admin only)
// @route PUT /api/auth/users/:id
// @access Private
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, subscriptionTier } = req.body;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           subscription_tier = COALESCE($3, subscription_tier),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, subscription_tier, created_at`,
      [firstName, lastName, subscriptionTier, id]
    );

    const user = updatedUser.rows[0];

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionTier: user.subscription_tier,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc Delete user (admin only)
// @route DELETE /api/auth/users/:id
// @access Private
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user (cascade deletes related data due to FK constraints)
    const deletedUser = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, first_name, last_name',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      user: {
        id: deletedUser.rows[0].id,
        email: deletedUser.rows[0].email,
        firstName: deletedUser.rows[0].first_name,
        lastName: deletedUser.rows[0].last_name
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};
