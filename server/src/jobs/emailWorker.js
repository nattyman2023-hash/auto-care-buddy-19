// Replaces the Supabase pg_cron worker that used to drain the pgmq-backed
// transactional_emails queue. Polled on a short interval by node-cron (see
// server/src/index.js) instead of running inside Postgres.

const { pool } = require('../db');
const { sendEmail } = require('../lib/email');

const BATCH_SIZE = 10;
const LEASE_SECONDS = 30;
const MAX_ATTEMPTS = 5;

async function updateSendLog(messageId, status) {
  if (!messageId) return;
  try {
    await pool.query('UPDATE email_send_log SET status = ? WHERE message_id = ?', [status, messageId]);
  } catch (err) {
    console.error('[emailWorker] failed to update email_send_log:', err.message);
  }
}

// On failure: bump attempts; past MAX_ATTEMPTS, move to the 'dlq' terminal
// state and keep the row (dead-letter, not deleted); otherwise reset to
// 'pending' with a linear backoff so the row is retried later.
async function handleFailure(row, messageId) {
  const attempts = (row.attempts || 0) + 1;
  try {
    if (attempts >= MAX_ATTEMPTS) {
      await pool.query('UPDATE email_queue SET status = ?, attempts = ? WHERE id = ?', ['dlq', attempts, row.id]);
      await updateSendLog(messageId, 'dlq');
    } else {
      await pool.query(
        "UPDATE email_queue SET status = 'pending', attempts = ?, visible_until = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id = ?",
        [attempts, attempts * 10, row.id]
      );
      await updateSendLog(messageId, 'failed');
    }
  } catch (err) {
    console.error('[emailWorker] failed to record send failure for queue row', row.id, err.message);
  }
}

async function processRow(row) {
  // Lease the row so a crash mid-send doesn't lose it forever - another
  // worker/tick can pick it back up once visible_until elapses.
  const [leaseResult] = await pool.query(
    "UPDATE email_queue SET status = 'processing', visible_until = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id = ? AND status = 'pending'",
    [LEASE_SECONDS, row.id]
  );
  if (leaseResult.affectedRows === 0) return; // raced by another worker tick

  let payload;
  try {
    payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  } catch (err) {
    console.error('[emailWorker] invalid payload JSON for queue row', row.id, err.message);
    await pool.query('DELETE FROM email_queue WHERE id = ?', [row.id]);
    return;
  }

  const { to, subject, html, message_id: messageId } = payload || {};

  try {
    const result = await sendEmail({ to, subject, html });
    if (result.success) {
      await pool.query('DELETE FROM email_queue WHERE id = ?', [row.id]);
      await updateSendLog(messageId, 'sent');
    } else {
      await handleFailure(row, messageId);
    }
  } catch (err) {
    console.error('[emailWorker] sendEmail threw for queue row', row.id, err.message);
    await handleFailure(row, messageId);
  }
}

async function processEmailQueueOnce() {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM email_queue
       WHERE queue_name = 'transactional_emails' AND status = 'pending'
         AND (visible_until IS NULL OR visible_until <= NOW())
       ORDER BY id ASC
       LIMIT ?`,
      [BATCH_SIZE]
    );

    for (const row of rows) {
      await processRow(row);
    }
  } catch (err) {
    // Never let a bug here kill the cron schedule.
    console.error('[emailWorker] processEmailQueueOnce failed:', err);
  }
}

module.exports = { processEmailQueueOnce };
