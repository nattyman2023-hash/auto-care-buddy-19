const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'auto_care_buddy',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err.stack);
  });

// Database API endpoints
app.post('/api/db/:table/select', async (req, res) => {
  const { table } = req.params;
  const { columns = '*', order_by, order_dir = 'asc', limit } = req.body;
  
  try {
    let query = `SELECT ${columns} FROM \`${table}\``;
    if (order_by) {
      query += ` ORDER BY \`${order_by}\` ${order_dir.toUpperCase()}`;
    }
    if (limit) {
      query += ` LIMIT ${parseInt(limit)}`;
    }
    const [rows] = await pool.query(query);
    res.json({ data: rows, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/insert', async (req, res) => {
  const { table } = req.params;
  const { values } = req.body;
  
  try {
    const items = Array.isArray(values) ? values : [values];
    const keys = Object.keys(items[0]);
    const placeholders = items.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
    const allValues = items.flatMap(item => keys.map(k => item[k]));
    
    const [result] = await pool.query(
      `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES ${placeholders}`,
      allValues
    );
    res.json({ data: { id: result.insertId, ...items[0] }, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/update', async (req, res) => {
  const { table } = req.params;
  const { values } = req.body;
  
  try {
    const keys = Object.keys(values).filter(k => k !== 'id');
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const allValues = [...keys.map(k => values[k]), values.id];
    
    const [result] = await pool.query(
      `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`,
      allValues
    );
    res.json({ data: result.affectedRows > 0 ? values : null, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/delete', async (req, res) => {
  const { table } = req.params;
  const { id } = req.body;
  
  try {
    let result;
    if (id) {
      [result] = await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    } else {
      [result] = await pool.query(`DELETE FROM \`${table}\``);
    }
    res.json({ data: result, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/eq', async (req, res) => {
  const { table } = req.params;
  const { column, value } = req.body;
  
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`${column}\` = ?`, [value]);
    res.json({ data: rows, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/single', async (req, res) => {
  const { table } = req.params;
  
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` LIMIT 1`);
    res.json({ data: rows[0] || null, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});