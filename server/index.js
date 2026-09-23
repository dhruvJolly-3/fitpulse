require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ---- Boot-time env guard ----
// Fail fast with a named error instead of crashing later on the first
// DB query or login. MONGO_URI is still accepted for older local .env files.
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const missing = [];
if (!MONGODB_URI) missing.push('MONGODB_URI');
if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
if (missing.length) {
  console.error(`FATAL: missing required environment variable(s): ${missing.join(', ')}. See server/.env.example.`);
  process.exit(1);
}

const app = express();

// ---- CORS allowlist ----
// Local dev origins are always allowed; deployed frontends come from
// CORS_ORIGINS, e.g. "https://fitpulse.vercel.app,https://fitpulse.com".
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = [
  ...DEV_ORIGINS,
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, '')) // tolerate spaces and trailing slashes
    .filter(Boolean),
];

app.use(cors({
  origin(origin, callback) {
    // No Origin header = not a browser cross-origin request (curl, Render health check)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const err = new Error(`Origin ${origin} is not allowed by CORS`);
    err.status = 403;
    callback(err);
  },
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/training', require('./routes/training'));
app.use('/api/water', require('./routes/water'));
app.use('/api/sleep', require('./routes/sleep'));
app.use('/api/steps', require('./routes/steps'));
app.use('/api/goals', require('./routes/goals'));

// Used by Render's health check. 503 tells Render the instance isn't ready.
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
  });
});

// Error handling — must be registered after all routes
app.use(notFound);
app.use(errorHandler);

// DB + Start
const PORT = process.env.PORT || 5001; // Render injects PORT; 5001 for local dev
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('FATAL: MongoDB connection failed:', err.message);
    process.exit(1); // let the platform restart the service
  });
