const express = require('express');
const router = express.Router();
const { protect, protectWithAdminFallback } = require('../middleware/auth');
const {
  signup,
  login,
  createUser,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  getUserCount,
  updateUser,
  deleteUser,
  forgotPassword,
  resetPassword,
  magicLogin,
} = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/magic-login', magicLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin routes - Works with both user and admin tokens
router.get('/users', protectWithAdminFallback, getAllUsers);
router.get('/users/count', protectWithAdminFallback, getUserCount);
router.post('/users', protectWithAdminFallback, createUser);
router.put('/users/:id', protectWithAdminFallback, updateUser);
router.delete('/users/:id', protectWithAdminFallback, deleteUser);

// Private routes
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

// Unsubscribe (public — no auth needed)
router.get('/unsubscribe', async (req, res) => {
  const pool = require('../config/database');
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, error: 'Token missing' });
  try {
    const r = await pool.query(
      `UPDATE users SET email_marketing_opt_out = true WHERE unsubscribe_token = $1 RETURNING email`,
      [token]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Invalid token' });
    res.json({ success: true, email: r.rows[0].email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unsubscribe from the free-tool-leads drip sequence (public — no auth
// needed). Separate from /unsubscribe above since leads have no `users`
// row — they're tracked in tool_leads with their own unsubscribe_token.
router.get('/unsubscribe-lead', async (req, res) => {
  const pool = require('../config/database');
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, error: 'Token missing' });
  try {
    const r = await pool.query(
      `UPDATE tool_leads SET email_opt_out = true WHERE unsubscribe_token = $1 RETURNING email`,
      [token]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Invalid token' });
    res.json({ success: true, email: r.rows[0].email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unsubscribe from the post-purchase Trip Brief buyer sequence (public —
// no auth needed). Same reasoning as /unsubscribe-lead — buyers have no
// `users` row unless they separately sign up.
router.get('/unsubscribe-trip-brief', async (req, res) => {
  const pool = require('../config/database');
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, error: 'Token missing' });
  try {
    const r = await pool.query(
      `UPDATE trip_briefs SET email_opt_out = true WHERE unsubscribe_token = $1 RETURNING email`,
      [token]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Invalid token' });
    res.json({ success: true, email: r.rows[0].email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
