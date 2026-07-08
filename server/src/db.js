const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// The frontend sends timestamps as JS `.toISOString()` strings
// ("2026-07-15T10:00:00.000Z"), but MySQL's DATETIME literal parser rejects
// the 'T'/'Z'/milliseconds ISO 8601 formatting - it wants "YYYY-MM-DD
// HH:MM:SS". Rather than hunting down every INSERT/UPDATE call site across
// query.js/functions.js/auth.js, normalize any ISO-datetime-shaped string
// parameter at the query layer itself (schema assumes UTC everywhere, so this
// is a lossless reformat, not a timezone conversion).
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

function toMySQLDateTime(iso) {
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeParams(params) {
  if (!Array.isArray(params)) return params;
  return params.map((p) => (typeof p === 'string' && ISO_DATETIME_RE.test(p) ? toMySQLDateTime(p) : p));
}

function wrapQueryable(target) {
  const originalQuery = target.query.bind(target);
  target.query = (sql, params) => originalQuery(sql, normalizeParams(params));
  return target;
}

wrapQueryable(pool);

const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async (...args) => wrapQueryable(await originalGetConnection(...args));

module.exports = { pool };
