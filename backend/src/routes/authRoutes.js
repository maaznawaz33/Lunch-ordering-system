const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  login,
  refresh,
  logout,
  me,
  register,
  verifyEmail,
  resendVerification,
  changePassword,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

router.post('/register', registerLimiter, register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', registerLimiter, resendVerification);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, changePassword);

module.exports = router;
