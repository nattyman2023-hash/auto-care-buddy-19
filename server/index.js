const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'auto_care_buddy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    release();
  }
});

// Database API endpoints
app.post('/api/db/:table/select', async (req, res) => {
  const { table } = req.params;
  const { columns = '*', order_by, order_dir = 'asc', limit } = req.body;
  
  try {
    let query = `SELECT ${columns} FROM ${table}`;
    if (order_by) {
      query += ` ORDER BY ${order_by} ${order_dir.toUpperCase()}`;
    }
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    const result = await pool.query(query);
    res.json({ data: result.rows, error: null });
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
    const placeholders = items.map((_, i) => 
      `(${keys.map((_, j) => `$${i * keys.length + j + 1}`).join(', ')})`
    ).join(', ');
    const allValues = items.flatMap(item => keys.map(k => item[k]));
    
    const result = await pool.query(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders} RETURNING *`,
      allValues
    );
    res.json({ data: result.rows, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/update', async (req, res) => {
  const { table } = req.params;
  const { values, where } = req.body;
  
  try {
    const keys = Object.keys(values).filter(k => k !== 'id');
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const allValues = [...keys.map(k => values[k]), values.id];
    
    const result = await pool.query(
      `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      allValues
    );
    res.json({ data: result.rows[0], error: null });
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
      result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
    } else {
      result = await pool.query(`DELETE FROM ${table} RETURNING *`);
    }
    res.json({ data: result.rows, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/eq', async (req, res) => {
  const { table } = req.params;
  const { column, value } = req.body;
  
  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE "${column}" = $1`, [value]);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

app.post('/api/db/:table/single', async (req, res) => {
  const { table } = req.params;
  
  try {
    const result = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
    res.json({ data: result.rows[0] || null, error: null });
  } catch (error) {
    res.status(500).json({ data: null, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});