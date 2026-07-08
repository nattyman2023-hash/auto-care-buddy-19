// Ports supabase/functions/send-transactional-email/index.ts. Exposed both as
// a route (server/src/routes/functions.js) and as this exported function so
// other in-process routes (create-booking, invite-employee, send-portal-invite)
// can call it directly without a route-to-route HTTP round trip.
//
// Skips React-Email rendering entirely (see server/src/lib/emailTemplates.js)
// and, unlike the original, doesn't send synchronously - it logs to
// email_send_log and enqueues into email_queue for server/src/jobs/emailWorker.js
// to actually dispatch via server/src/lib/email.js.

const crypto = require('crypto');
const { pool } = require('../db');
const { generateOpaqueToken } = require('./tokens');
const { TEMPLATES } = require('./emailTemplates');

async function logSend({ messageId, templateName, recipientEmail, status, errorMessage }) {
  try {
    await pool.query(
      'INSERT INTO email_send_log (id, message_id, template_name, recipient_email, status, error_message) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), messageId, templateName, recipientEmail, status, errorMessage || null]
    );
  } catch (err) {
    console.error('[transactionalEmail] failed to write email_send_log:', err.message);
  }
}

// Returns { data, error, status } - callers (the route handler, or in-process
// callers like create-booking) decide how to surface `status`.
async function sendTransactionalEmail({ templateName, recipientEmail, idempotencyKey, templateData } = {}) {
  const template = TEMPLATES[templateName];
  if (!template) {
    return {
      data: null,
      error: { message: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}` },
      status: 404,
    };
  }

  const effectiveRecipient = template.to || recipientEmail;
  if (!effectiveRecipient) {
    return {
      data: null,
      error: { message: 'recipientEmail is required (unless the template defines a fixed recipient)' },
      status: 400,
    };
  }

  const data = templateData && typeof templateData === 'object' ? templateData : {};
  const messageId = crypto.randomUUID();
  const finalIdempotencyKey = idempotencyKey || messageId;
  const normalizedEmail = String(effectiveRecipient).trim().toLowerCase();

  // 1. Suppression check - fail closed (a DB error here means we do NOT send).
  let suppressedRows;
  try {
    [suppressedRows] = await pool.query('SELECT id FROM suppressed_emails WHERE email = ?', [normalizedEmail]);
  } catch (err) {
    console.error('[transactionalEmail] suppression check failed:', err.message);
    return { data: null, error: { message: 'Failed to verify suppression status' }, status: 500 };
  }

  if (suppressedRows.length > 0) {
    await logSend({ messageId, templateName, recipientEmail: effectiveRecipient, status: 'suppressed' });
    return { data: { success: false, reason: 'email_suppressed' }, error: null, status: 200 };
  }

  // 2. Get-or-create the one unsubscribe token per email address.
  let unsubscribeToken;
  try {
    const [existingRows] = await pool.query(
      'SELECT token, used_at FROM email_unsubscribe_tokens WHERE email = ?',
      [normalizedEmail]
    );
    const existing = existingRows[0];

    if (existing && !existing.used_at) {
      unsubscribeToken = existing.token;
    } else if (!existing) {
      const candidateToken = generateOpaqueToken();
      try {
        await pool.query(
          'INSERT INTO email_unsubscribe_tokens (id, token, email) VALUES (?, ?, ?)',
          [crypto.randomUUID(), candidateToken, normalizedEmail]
        );
        unsubscribeToken = candidateToken;
      } catch (insertErr) {
        // Unique-key race: another concurrent request created the row first -
        // re-read to get the token that actually got stored.
        const [reReadRows] = await pool.query(
          'SELECT token FROM email_unsubscribe_tokens WHERE email = ?',
          [normalizedEmail]
        );
        if (!reReadRows[0]) throw insertErr;
        unsubscribeToken = reReadRows[0].token;
      }
    } else {
      // Token exists but is already used - should have been caught by the
      // suppression check above. Safety fallback: log and skip sending.
      console.warn('[transactionalEmail] unsubscribe token already used but email not suppressed:', normalizedEmail);
      await logSend({
        messageId,
        templateName,
        recipientEmail: effectiveRecipient,
        status: 'suppressed',
        errorMessage: 'Unsubscribe token used but email missing from suppressed list',
      });
      return { data: { success: false, reason: 'email_suppressed' }, error: null, status: 200 };
    }
  } catch (err) {
    console.error('[transactionalEmail] token lookup/creation failed:', err.message);
    await logSend({
      messageId,
      templateName,
      recipientEmail: effectiveRecipient,
      status: 'failed',
      errorMessage: 'Failed to look up/create unsubscribe token',
    });
    return { data: null, error: { message: 'Failed to prepare email' }, status: 500 };
  }

  // 3. Render.
  const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject;
  const html = template.render({ ...data, unsubscribeToken });

  // 4. Log pending BEFORE enqueue, so a crash mid-enqueue still leaves a record.
  await logSend({ messageId, templateName, recipientEmail: effectiveRecipient, status: 'pending' });

  try {
    await pool.query('INSERT INTO email_queue (queue_name, payload, status) VALUES (?, ?, ?)', [
      'transactional_emails',
      JSON.stringify({
        to: effectiveRecipient,
        subject,
        html,
        message_id: messageId,
        template_name: templateName,
        idempotency_key: finalIdempotencyKey,
        unsubscribe_token: unsubscribeToken,
      }),
      'pending',
    ]);
  } catch (err) {
    console.error('[transactionalEmail] enqueue failed:', err.message);
    await pool.query('UPDATE email_send_log SET status = ? WHERE message_id = ?', ['failed', messageId]).catch(() => {});
    return { data: null, error: { message: 'Failed to enqueue email' }, status: 500 };
  }

  return { data: { success: true, queued: true }, error: null, status: 200 };
}

module.exports = { sendTransactionalEmail };
