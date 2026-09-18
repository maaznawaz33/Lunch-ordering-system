const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/tokens');
const { recordAudit } = require('../utils/auditLog');
const { generateToken, hashToken } = require('../utils/secureToken');
const { sendVerificationEmail } = require('../utils/email');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const VERIFICATION_HOURS = 24;
const MIN_PASSWORD_LENGTH = 8;

function isCompanyEmail(email) {
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || '').toLowerCase().trim();
  if (!allowedDomain) return true;
  return email.toLowerCase().endsWith('@' + allowedDomain);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
  };
}

async function register(req, res, next) {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ error: 'Full name, phone number, email, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isCompanyEmail(normalizedEmail)) {
      return res.status(400).json({
        error: `Registration is restricted to @${process.env.ALLOWED_EMAIL_DOMAIN} email addresses.`,
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(200).json({
        message: 'If that email is eligible, a verification link has been sent.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { raw, hash } = generateToken();

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName,
        phone,
        role: 'EMPLOYEE',
        emailVerified: false,
        verificationTokenHash: hash,
        verificationExpiresAt: new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${raw}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendVerificationEmail(normalizedEmail, verifyUrl);

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account before logging in.',
    });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.verificationTokenHash || !user.verificationExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    if (user.verificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This verification link has expired. Please request a new one.' });
    }

    const suppliedHash = hashToken(token);
    if (suppliedHash !== user.verificationTokenHash) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationTokenHash: null, verificationExpiresAt: null },
    });

    res.json({ message: 'Email verified. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    const genericResponse = { message: 'If that account exists and is unverified, a new link has been sent.' };

    if (!user || user.emailVerified) {
      return res.json(genericResponse);
    }

    const { raw, hash } = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash: hash,
        verificationExpiresAt: new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${raw}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendVerificationEmail(normalizedEmail, verifyUrl);

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    const genericError = { error: 'Invalid email or password.' };
    if (!user || !user.isActive) {
      return res.status(401).json(genericError);
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        error: `Account temporarily locked due to repeated failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString()}.`,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null,
        },
      });

      return res.status(401).json(genericError);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res
      .cookie('accessToken', accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 })
      .cookie('refreshToken', refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json({
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token provided.' });

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid session.' });

    const accessToken = signAccessToken(user);
    res
      .cookie('accessToken', accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 })
      .json({ ok: true });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
}

async function logout(req, res) {
  res
    .clearCookie('accessToken', cookieOptions())
    .clearCookie('refreshToken', cookieOptions())
    .json({ ok: true });
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, fullName: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from your current password.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await recordAudit({
      actorId: user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
    });

    res
      .clearCookie('accessToken', cookieOptions())
      .clearCookie('refreshToken', cookieOptions())
      .json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  register,
  verifyEmail,
  resendVerification,
  changePassword,
};
