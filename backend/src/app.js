const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// If deployed behind Cloudflare/a reverse proxy, this ensures req.ip and
// rate limiting see the real client IP rather than the proxy's IP.
app.set('trust proxy', 1);

// --- Security middleware ---
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate limit as a baseline (auth routes have their own stricter limit)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Routes ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
