// Generic data-query engine mounted at POST /api/query. Implements the exact
// wire contract expected by src/lib/apiClient.ts's QueryBuilder.execute():
//   { table, action, select, selectOpts, payload, filters, order, limit, range, single }
// -> { data, error, count }
//
// This is a small, purpose-built interpreter for the *specific* set of
// select/filter/order shapes actually used across src/**/*.tsx (see the
// call-site survey referenced in the migration task) - it is NOT a general
// PostgREST clone. Unsupported shapes are rejected with a clear error rather
// than silently mishandled.
//
// Security: table and column names are never string-interpolated without
// first being checked against an allowlist (TABLE_RULES keys for tables,
// TABLE_COLUMNS for columns). All values go through parameterized `?`
// placeholders.

const crypto = require('crypto');
const express = require('express');

const { pool } = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { TABLE_RULES } = require('../authz/rules');
const relationships = require('../relationships');
const { getColumnSet, getPrimaryKey } = require('../schema/columns');

const router = express.Router();

const COLUMN_NAME_RE = /^[a-zA-Z0-9_]+$/;

// ---------------------------------------------------------------------------
// Error helpers - thrown errors carry an HTTP status; the router's catch-all
// turns them into { data: null, error: { message }, count: null }.
// ---------------------------------------------------------------------------

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
const badRequest = (msg) => httpError(400, msg);
const forbidden = (msg) => httpError(403, msg);
const notFound = (msg) => httpError(404, msg);

function assertValidTable(table) {
  if (typeof table !== 'string' || !Object.prototype.hasOwnProperty.call(TABLE_RULES, table)) {
    throw badRequest(`Unknown table: ${table}`);
  }
}

function assertValidColumn(table, col) {
  if (typeof col !== 'string' || !COLUMN_NAME_RE.test(col)) {
    throw badRequest(`Invalid column name: ${col}`);
  }
  const cols = getColumnSet(table);
  if (!cols || !cols.has(col)) {
    throw badRequest(`Unknown column '${col}' on table '${table}'`);
  }
}

function quoteIdent(name) {
  return `\`${name}\``;
}

// ---------------------------------------------------------------------------
// select("...") parsing - only handles the shapes registered in
// relationships.js (alias:table(cols) / table(cols), recursively).
// ---------------------------------------------------------------------------

// Splits a select/filter-group string on top-level commas, respecting
// parenthesis nesting (so `foo(a,b),bar` -> ["foo(a,b)", "bar"]).
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// Parses a select string into { columns: string[] (may include '*'), embeds: [...] }
// where each embed is { alias, relation, columns, embeds } (recursive).
function parseSelect(table, selectStr) {
  const tokens = splitTopLevel(selectStr && selectStr.trim() ? selectStr : '*');
  const columns = [];
  const embeds = [];

  for (const token of tokens) {
    const openIdx = token.indexOf('(');
    if (openIdx === -1) {
      const col = token.trim();
      if (col === '*') {
        columns.push('*');
      } else {
        assertValidColumn(table, col);
        columns.push(col);
      }
      continue;
    }

    if (token[token.length - 1] !== ')') {
      throw badRequest(`Malformed select token: ${token}`);
    }
    const head = token.slice(0, openIdx);
    const inner = token.slice(openIdx + 1, -1);

    let aliasSpec = null;
    let tableSpec = head;
    const colonIdx = head.indexOf(':');
    if (colonIdx !== -1) {
      aliasSpec = head.slice(0, colonIdx);
      tableSpec = head.slice(colonIdx + 1);
    }
    // Strip PostgREST `!hint` (fk-name/column-name disambiguation) suffixes -
    // we resolve the actual join purely from relationships.js, never from
    // this hint text, so it's safe to just discard it.
    const alias = (aliasSpec !== null ? aliasSpec : tableSpec).split('!')[0].trim();

    const rel = relationships[table] && relationships[table][alias];
    if (!rel) {
      throw badRequest(`Unsupported embed '${alias}' on table '${table}'`);
    }
    const nested = parseSelect(rel.table, inner);
    embeds.push({ alias, relation: rel, columns: nested.columns, embeds: nested.embeds });
  }

  if (columns.length === 0 && embeds.length === 0) columns.push('*');
  return { columns, embeds };
}

// Recursively builds LEFT JOIN clauses + SELECT column expressions for a
// parsed select tree. `sqlAlias` is the SQL table alias for `table` at this
// level; `prefix` is the dotted-with-`__` path used to namespace embedded
// column aliases so they can be un-flattened afterwards.
function buildQueryParts(table, parsed, sqlAlias, prefix) {
  let joinSql = '';
  const selectExprs = [];

  for (const col of parsed.columns) {
    if (col === '*') {
      const cols = getColumnSet(table);
      for (const c of cols) {
        selectExprs.push(`${quoteIdent(sqlAlias)}.${quoteIdent(c)} AS ${quoteIdent(prefix + c)}`);
      }
    } else {
      selectExprs.push(`${quoteIdent(sqlAlias)}.${quoteIdent(col)} AS ${quoteIdent(prefix + col)}`);
    }
  }

  for (const embed of parsed.embeds) {
    const childAlias = `${sqlAlias}_${embed.alias}`;
    const childPrefix = `${prefix}${embed.alias}__`;
    joinSql += ` LEFT JOIN ${quoteIdent(embed.relation.table)} AS ${quoteIdent(childAlias)}` +
      ` ON ${quoteIdent(sqlAlias)}.${quoteIdent(embed.relation.localColumn)}` +
      ` = ${quoteIdent(childAlias)}.${quoteIdent(embed.relation.foreignColumn)}`;
    const child = buildQueryParts(embed.relation.table, embed, childAlias, childPrefix);
    joinSql += child.joinSql;
    selectExprs.push(...child.selectExprs);
  }

  return { joinSql, selectExprs };
}

// Un-flattens a single SQL result row (keys like `job__customer__name`) back
// into a nested object ({ job: { customer: { name: ... } } }).
function unshapeRow(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    const parts = key.split('__');
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!obj[p] || typeof obj[p] !== 'object') obj[p] = {};
      obj = obj[p];
    }
    obj[parts[parts.length - 1]] = val;
  }
  return result;
}

// A LEFT JOIN with no match yields an embedded object whose fields are all
// NULL - Supabase/PostgREST represents that as `null`, not `{ ... : null }`.
function collapseNulls(obj) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      collapseNulls(val);
      if (Object.values(val).every((v) => v === null)) {
        obj[key] = null;
      }
    }
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Filter translation (eq/neq/gt/gte/lt/lte/like/ilike/is/in/contains/not.*/or)
// ---------------------------------------------------------------------------

function coerceOrValue(raw) {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function translateSimpleOp(table, sqlAlias, col, op, val) {
  assertValidColumn(table, col);
  const colSql = `${quoteIdent(sqlAlias)}.${quoteIdent(col)}`;
  switch (op) {
    case 'eq':
      return { sql: `${colSql} = ?`, params: [val] };
    case 'neq':
      return { sql: `${colSql} <> ?`, params: [val] };
    case 'gt':
      return { sql: `${colSql} > ?`, params: [val] };
    case 'gte':
      return { sql: `${colSql} >= ?`, params: [val] };
    case 'lt':
      return { sql: `${colSql} < ?`, params: [val] };
    case 'lte':
      return { sql: `${colSql} <= ?`, params: [val] };
    case 'like':
      return { sql: `${colSql} LIKE ?`, params: [val] };
    case 'ilike':
      // The schema is utf8mb4_unicode_ci throughout, so plain LIKE is already
      // case-insensitive - no need for LOWER()/UPPER() wrapping.
      return { sql: `${colSql} LIKE ?`, params: [val] };
    case 'is':
      return val === null ? { sql: `${colSql} IS NULL`, params: [] } : { sql: `${colSql} = ?`, params: [val] };
    case 'in': {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) return { sql: '1=0', params: [] };
      return { sql: `${colSql} IN (${arr.map(() => '?').join(', ')})`, params: arr };
    }
    case 'contains':
      return { sql: `${colSql} LIKE ?`, params: [`%${val}%`] };
    default:
      throw badRequest(`Unsupported filter operator: ${op}`);
  }
}

// Handles a single { col, op, val } filter, including `not.<op>` negation and
// the special `or` op (col is unused/empty for `or`).
function translateFilter(table, sqlAlias, filter) {
  const { col, op, val } = filter;
  if (op === 'or') {
    return translateOrExpr(table, sqlAlias, val);
  }
  let realOp = op;
  let negate = false;
  if (typeof op === 'string' && op.startsWith('not.')) {
    negate = true;
    realOp = op.slice(4);
  }
  const { sql, params } = translateSimpleOp(table, sqlAlias, col, realOp, val);
  return negate ? { sql: `NOT (${sql})`, params } : { sql, params };
}

// Parses one token inside an or()/and() expression: either a nested
// `and(...)`/`or(...)` group, or a plain `col.op.val` triple.
function parseCondToken(table, sqlAlias, token) {
  const trimmed = token.trim();
  const groupMatch = trimmed.match(/^(and|or)\(([\s\S]*)\)$/i);
  if (groupMatch) {
    const kind = groupMatch[1].toLowerCase();
    const parts = splitTopLevel(groupMatch[2]);
    const subs = parts.map((p) => parseCondToken(table, sqlAlias, p));
    return {
      sql: `(${subs.map((s) => s.sql).join(kind === 'and' ? ' AND ' : ' OR ')})`,
      params: subs.flatMap((s) => s.params),
    };
  }
  const parts = trimmed.split('.');
  if (parts.length < 3) throw badRequest(`Malformed or() condition: ${trimmed}`);
  const col = parts[0];
  const op = parts[1];
  const val = coerceOrValue(parts.slice(2).join('.'));
  return translateFilter(table, sqlAlias, { col, op, val });
}

// Parses a PostgREST-style `.or("col.op.val,col2.op2.val2")` expression
// string into a single parenthesized SQL OR expression.
function translateOrExpr(table, sqlAlias, expr) {
  const tokens = splitTopLevel(expr);
  const subs = tokens.map((t) => parseCondToken(table, sqlAlias, t));
  return { sql: `(${subs.map((s) => s.sql).join(' OR ')})`, params: subs.flatMap((s) => s.params) };
}

function buildWhereFromFilters(table, sqlAlias, filters) {
  const clauses = [];
  const params = [];
  for (const f of filters || []) {
    const { sql, params: p } = translateFilter(table, sqlAlias, f);
    clauses.push(sql);
    params.push(...p);
  }
  return { sql: clauses.length ? clauses.join(' AND ') : null, params };
}

function combineWhere(accessResult, filterResult) {
  const clauses = [];
  const params = [];
  if (accessResult && accessResult.where) {
    clauses.push(`(${accessResult.where})`);
    params.push(...(accessResult.params || []));
  }
  if (filterResult && filterResult.sql) {
    clauses.push(`(${filterResult.sql})`);
    params.push(...filterResult.params);
  }
  return { sql: clauses.length ? clauses.join(' AND ') : null, params };
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleSelect(req, res, { table, select, selectOpts, filters, order, limit, range, single }) {
  const rules = TABLE_RULES[table];
  const access = rules.select(req.user);
  if (!access || !access.allow) throw forbidden('Not allowed');

  const parsed = parseSelect(table, select);
  const { joinSql, selectExprs } = buildQueryParts(table, parsed, 't0', '');

  const filterResult = buildWhereFromFilters(table, 't0', filters);
  const where = combineWhere(access, filterResult);
  const whereSql = where.sql ? `WHERE ${where.sql}` : '';

  let count = null;
  if (selectOpts && selectOpts.count === 'exact') {
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM ${quoteIdent(table)} AS t0${joinSql} ${whereSql}`,
      where.params
    );
    count = Number(countRows[0].cnt);
  }

  if (selectOpts && selectOpts.head) {
    return res.json({ data: null, error: null, count });
  }

  let orderSql = '';
  if (Array.isArray(order) && order.length) {
    const parts = [];
    for (const o of order) {
      const cols = String(o.col).split(',').map((c) => c.trim()).filter(Boolean);
      for (const c of cols) {
        assertValidColumn(table, c);
        parts.push(`${quoteIdent('t0')}.${quoteIdent(c)} ${o.asc === false ? 'DESC' : 'ASC'}`);
      }
    }
    if (parts.length) orderSql = `ORDER BY ${parts.join(', ')}`;
  }

  let limitSql = '';
  const limitParams = [];
  if (Array.isArray(range) && range.length === 2) {
    const [from, to] = range;
    limitSql = 'LIMIT ? OFFSET ?';
    limitParams.push(Math.max(0, to - from + 1), from);
  } else if (typeof limit === 'number') {
    limitSql = 'LIMIT ?';
    limitParams.push(limit);
  }

  const sql = `SELECT ${selectExprs.join(', ')} FROM ${quoteIdent(table)} AS t0${joinSql} ${whereSql} ${orderSql} ${limitSql}`.trim();
  const [rows] = await pool.query(sql, [...where.params, ...limitParams]);
  const shaped = rows.map((r) => collapseNulls(unshapeRow(r)));

  if (single === 'single') {
    if (shaped.length === 0) throw notFound('No rows found');
    if (shaped.length > 1) throw badRequest('Multiple rows returned for single()');
    return res.json({ data: shaped[0], error: null, count });
  }
  if (single === 'maybeSingle') {
    if (shaped.length > 1) throw badRequest('Multiple rows returned for maybeSingle()');
    return res.json({ data: shaped[0] || null, error: null, count });
  }
  return res.json({ data: shaped, error: null, count });
}

async function handleInsert(req, res, { table, payload, single }) {
  const rules = TABLE_RULES[table];
  const wasArray = Array.isArray(payload);
  const rows = wasArray ? payload : [payload];
  if (!rows.length || rows.some((r) => !r || typeof r !== 'object')) {
    throw badRequest('Insert payload must be an object or array of objects');
  }

  for (const row of rows) {
    const access = rules.insert(req.user, row);
    if (!access || !access.allow) throw forbidden('Not allowed');
  }

  const pk = getPrimaryKey(table);
  const preparedRows = rows.map((row) => {
    const copy = { ...row };
    if (pk === 'id' && !copy.id) copy.id = crypto.randomUUID();
    return copy;
  });

  // Validate every column referenced before writing anything, so a bad
  // column in row N doesn't leave rows 0..N-1 committed.
  const perRowCols = preparedRows.map((row) => Object.keys(row));
  perRowCols.forEach((cols) => cols.forEach((c) => assertValidColumn(table, c)));

  for (let i = 0; i < preparedRows.length; i++) {
    const row = preparedRows[i];
    const cols = perRowCols[i];
    const colSql = cols.map(quoteIdent).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => row[c]);
    await pool.query(`INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES (${placeholders})`, values);
  }

  const ids = preparedRows.map((r) => r[pk]);
  const [resultRows] = await pool.query(
    `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(pk)} IN (${ids.map(() => '?').join(', ')})`,
    ids
  );

  const data = wasArray ? resultRows : resultRows[0] || null;
  if (!wasArray && single === 'single' && !data) throw notFound('No row returned');
  return res.json({ data, error: null, count: null });
}

async function handleUpdate(req, res, { table, payload, filters, single }) {
  const rules = TABLE_RULES[table];
  const access = rules.update(req.user);
  if (!access || !access.allow) throw forbidden('Not allowed');

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw badRequest('Update payload must be a single object');
  }
  const cols = Object.keys(payload);
  if (!cols.length) throw badRequest('Empty update payload');
  cols.forEach((c) => assertValidColumn(table, c));

  const filterResult = buildWhereFromFilters(table, 't0', filters);
  const where = combineWhere(access, filterResult);
  if (!where.sql) throw badRequest('Refusing to update without any filter/scope');

  const pk = getPrimaryKey(table);
  const [idRows] = await pool.query(
    `SELECT ${quoteIdent(pk)} FROM ${quoteIdent(table)} AS t0 WHERE ${where.sql}`,
    where.params
  );
  if (!idRows.length) throw notFound('No matching row to update');
  const ids = idRows.map((r) => r[pk]);

  const setSql = cols.map((c) => `${quoteIdent(c)} = ?`).join(', ');
  const setParams = cols.map((c) => payload[c]);
  await pool.query(
    `UPDATE ${quoteIdent(table)} SET ${setSql} WHERE ${quoteIdent(pk)} IN (${ids.map(() => '?').join(', ')})`,
    [...setParams, ...ids]
  );

  const [resultRows] = await pool.query(
    `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(pk)} IN (${ids.map(() => '?').join(', ')})`,
    ids
  );

  if (single === 'single') {
    if (resultRows.length !== 1) throw badRequest('Multiple rows updated for single()');
    return res.json({ data: resultRows[0], error: null, count: null });
  }
  if (single === 'maybeSingle') {
    return res.json({ data: resultRows[0] || null, error: null, count: null });
  }
  return res.json({ data: resultRows, error: null, count: null });
}

async function handleUpsert(req, res, { table, payload, selectOpts, single }) {
  const rules = TABLE_RULES[table];
  const wasArray = Array.isArray(payload);
  const rows = wasArray ? payload : [payload];
  if (!rows.length || rows.some((r) => !r || typeof r !== 'object')) {
    throw badRequest('Upsert payload must be an object or array of objects');
  }

  for (const row of rows) {
    // No dedicated upsert authz rule exists - insert's rule is the natural
    // stand-in since both call sites (cart_sessions, settings) allow anon
    // insert already.
    const access = rules.insert(req.user, row);
    if (!access || !access.allow) throw forbidden('Not allowed');
  }

  const pk = getPrimaryKey(table);
  const conflictCol = (selectOpts && selectOpts.upsertOpts && selectOpts.upsertOpts.onConflict) || pk;
  assertValidColumn(table, conflictCol);

  const preparedRows = rows.map((row) => {
    const copy = { ...row };
    if (pk === 'id' && !copy[pk]) copy[pk] = crypto.randomUUID();
    return copy;
  });

  const perRowCols = preparedRows.map((row) => Object.keys(row));
  perRowCols.forEach((cols) => cols.forEach((c) => assertValidColumn(table, c)));

  for (let i = 0; i < preparedRows.length; i++) {
    const row = preparedRows[i];
    const cols = perRowCols[i];
    const colSql = cols.map(quoteIdent).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => row[c]);
    const updateCols = cols.filter((c) => c !== conflictCol);
    const updateSql = updateCols.length
      ? updateCols.map((c) => `${quoteIdent(c)} = VALUES(${quoteIdent(c)})`).join(', ')
      : `${quoteIdent(conflictCol)} = ${quoteIdent(conflictCol)}`;
    await pool.query(
      `INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateSql}`,
      values
    );
  }

  const keyVals = preparedRows.map((r) => r[conflictCol]);
  const [resultRows] = await pool.query(
    `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(conflictCol)} IN (${keyVals.map(() => '?').join(', ')})`,
    keyVals
  );

  const data = wasArray ? resultRows : resultRows[0] || null;
  if (!wasArray && single === 'single' && !data) throw notFound('No row returned');
  return res.json({ data, error: null, count: null });
}

async function handleDelete(req, res, { table, filters }) {
  const rules = TABLE_RULES[table];
  const access = rules.delete(req.user);
  if (!access || !access.allow) throw forbidden('Not allowed');

  const filterResult = buildWhereFromFilters(table, 't0', filters);
  const where = combineWhere(access, filterResult);
  if (!where.sql) throw badRequest('Refusing to delete without any filter/scope');

  const pk = getPrimaryKey(table);
  const [idRows] = await pool.query(
    `SELECT ${quoteIdent(pk)} FROM ${quoteIdent(table)} AS t0 WHERE ${where.sql}`,
    where.params
  );
  if (idRows.length) {
    const ids = idRows.map((r) => r[pk]);
    await pool.query(
      `DELETE FROM ${quoteIdent(table)} WHERE ${quoteIdent(pk)} IN (${ids.map(() => '?').join(', ')})`,
      ids
    );
  }
  return res.json({ data: { success: true }, error: null, count: null });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

router.post('/', optionalAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const table = body.table;
    const action = body.action || 'select';
    assertValidTable(table);

    const args = {
      table,
      select: body.select,
      selectOpts: body.selectOpts || null,
      payload: body.payload,
      filters: Array.isArray(body.filters) ? body.filters : [],
      order: Array.isArray(body.order) ? body.order : [],
      limit: body.limit,
      range: body.range,
      single: body.single || null,
    };

    switch (action) {
      case 'select':
        return await handleSelect(req, res, args);
      case 'insert':
        return await handleInsert(req, res, args);
      case 'update':
        return await handleUpdate(req, res, args);
      case 'upsert':
        return await handleUpsert(req, res, args);
      case 'delete':
        return await handleDelete(req, res, args);
      default:
        throw badRequest(`Unknown action: ${action}`);
    }
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) {
      // eslint-disable-next-line no-console
      console.error('[/api/query] unexpected error:', err);
    }
    return res.status(status).json({ data: null, error: { message: err.message || 'Internal error' }, count: null });
  }
});

module.exports = router;
