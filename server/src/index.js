require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');
const storageRoutes = require('./routes/storage');
const functionsRoutes = require('./routes/functions');
const { pool } = require('./db');
const { processEmailQueueOnce } = require('./jobs/emailWorker');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow the configured production frontend plus any localhost dev port (Vite
// picks a free port starting at 5173/8080 depending on what's already in use)
// so a single FRONTEND_URL value doesn't lock out local development.
const allowedOrigins = [process.env.FRONTEND_URL, /^http:\/\/localhost:\d+$/].filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin / non-browser requests
      const ok = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );
      callback(null, ok);
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/functions', functionsRoutes);

// Safety net: Express 5 forwards rejected promises from async route handlers
// here instead of crashing the process (e.g. a DB call that throws before its
// own try/catch, or any route that forgets one). Always keep prefer specific
// try/catch in routes for good error messages - this is the backstop, not the
// primary error handling.
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ data: null, error: 'Internal server error' });
});

pool
  .getConnection()
  .then((connection) => {
    console.log('Connected to MySQL database');
    connection.release();
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL database:', err.message);
  });

// Drains the transactional_emails queue (see server/src/jobs/emailWorker.js).
// Guarded so a cron-setup problem never crashes the whole server - worst case
// is queued emails wait until the process restarts.
try {
  const cron = require('node-cron');
  cron.schedule('*/10 * * * * *', () => {
    processEmailQueueOnce().catch((err) => console.error('[emailWorker] tick failed:', err));
  });
} catch (err) {
  console.error('Failed to set up email queue cron job:', err.message);
}

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
