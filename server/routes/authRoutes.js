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
} = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

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

module.exports = router;
