// Column allowlists + primary-key map for every table exposed through the
// generic /api/query engine (server/src/routes/query.js). Hand-derived from
// database-schema-mysql.sql — used to validate every column name that gets
// string-interpolated into SQL (table/column identifiers can never be `?`
// placeholders in mysql2, so they must be checked against a known-good list
// instead). Keep this in sync with database-schema-mysql.sql when the schema
// changes.

const TABLE_COLUMNS = {
  app_users: ['id', 'email', 'password_hash', 'created_at', 'updated_at'],
  auth_sessions: ['id', 'user_id', 'refresh_token_hash', 'expires_at', 'created_at'],
  password_reset_tokens: ['id', 'user_id', 'token_hash', 'expires_at', 'used_at', 'created_at'],

  profiles: [
    'id', 'user_id', 'full_name', 'email', 'phone', 'pay_rate', 'is_active',
    'skills', 'postcode', 'bookable', 'created_at', 'updated_at',
  ],
  user_roles: ['id', 'user_id', 'role'],
  customers: [
    'id', 'user_id', 'name', 'email', 'phone', 'address', 'postcode', 'lat', 'lng',
    'created_at', 'updated_at',
  ],

  hair_profiles: ['id', 'customer_id', 'texture', 'preference', 'goal', 'created_at', 'updated_at'],

  chairs: ['id', 'name', 'zone', 'zones', 'is_active', 'notes', 'created_at'],
  service_catalog: [
    'id', 'name', 'base_price', 'estimated_hours', 'category', 'duration_minutes',
    'is_active', 'is_seasonal', 'description', 'icon', 'target_audience',
    'featured_style', 'image_url', 'deposit_required', 'deposit_amount',
    'upsell_product_id', 'is_on_promo', 'sale_price', 'created_at',
  ],
  service_addons: ['id', 'service_id', 'addon_id', 'sort_order', 'discount_pct', 'created_at'],

  jobs: [
    'id', 'customer_id', 'hair_profile_id', 'service_catalog_id', 'chair_id', 'assigned_to',
    'status', 'type', 'service_type', 'urgency', 'progress', 'source', 'notes',
    'pay_type', 'pay_amount', 'deposit_required', 'deposit_amount', 'deposit_paid_amount',
    'deposit_paid_at', 'stripe_checkout_session_id', 'stripe_payment_intent_id',
    'allow_overlap', 'manage_token', 'scheduled_at', 'started_at', 'completed_at',
    'created_at', 'updated_at',
  ],
  job_notes: ['id', 'job_id', 'author_id', 'content', 'created_at'],
  job_photos: [
    'id', 'job_id', 'storage_path', 'caption', 'photo_type', 'visible_to_customer',
    'uploaded_by', 'created_at',
  ],
  job_addons: ['id', 'job_id', 'addon_service_id', 'price_snapshot', 'duration_minutes_snapshot', 'created_at'],
  time_entries: [
    'id', 'job_id', 'mechanic_id', 'start_time', 'end_time', 'duration_seconds',
    'notes', 'archived', 'created_at',
  ],
  swap_requests: [
    'id', 'job_id', 'from_mechanic_id', 'to_mechanic_id', 'status', 'reason',
    'created_at', 'resolved_at',
  ],
  waitlist: [
    'id', 'client_name', 'phone', 'status', 'estimated_wait_minutes', 'assigned_chair_id',
    'notes', 'customer_id', 'service_catalog_id', 'position', 'created_at',
  ],

  estimates: [
    'id', 'job_id', 'customer_id', 'items', 'labor_hours', 'labor_rate', 'travel_cost',
    'subtotal', 'vat', 'total', 'status', 'created_at',
  ],
  invoices: [
    'id', 'job_id', 'total', 'vat', 'status', 'payment_method', 'signature', 'stripe_id',
    'created_at', 'updated_at',
  ],
  invoice_items: ['id', 'invoice_id', 'description', 'type', 'quantity', 'unit_price', 'created_at'],

  leads: [
    'id', 'name', 'phone', 'email', 'service_requested', 'source', 'status', 'priority',
    'ai_score', 'assigned_to', 'created_at', 'updated_at',
  ],
  quotes: [
    'id', 'lead_id', 'estimated_price', 'parts_cost_estimate', 'labor_estimate',
    'valid_until', 'status', 'location_type', 'estimated_date', 'signature', 'created_at',
  ],
  quote_items: ['id', 'quote_id', 'description', 'category', 'price', 'created_at'],
  lead_interactions: ['id', 'lead_id', 'type', 'content', 'author_id', 'created_at'],

  messages: ['id', 'customer_id', 'content', 'direction', 'created_at'],
  issue_submissions: ['id', 'customer_id', 'hair_profile_id', 'description', 'status', 'created_at'],
  issue_photos: ['id', 'issue_id', 'storage_path', 'created_at'],

  products: [
    'id', 'name', 'description', 'price', 'compare_at_price', 'category', 'tags',
    'image_url', 'is_active', 'is_featured', 'is_on_promo', 'sale_price',
    'stock_quantity', 'sku', 'created_at', 'updated_at',
  ],
  orders: [
    'id', 'user_id', 'customer_id', 'status', 'total', 'shipping_name', 'shipping_address',
    'shipping_phone', 'notes', 'created_at', 'updated_at',
  ],
  order_items: ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'created_at'],
  cart_items: ['id', 'session_id', 'service_catalog_id', 'quantity', 'created_at'],
  cart_sessions: ['session_id', 'email', 'name', 'reminder_sent_at', 'updated_at', 'created_at'],
  inventory: [
    'id', 'name', 'category', 'quantity', 'price', 'low_stock_threshold', 'image_path',
    'created_at', 'updated_at',
  ],

  booking_drafts: [
    'id', 'email', 'name', 'service_catalog_id', 'scheduled_at', 'step', 'completed',
    'reminder_sent_at', 'last_seen_at', 'session_token', 'created_at',
  ],

  expenses: [
    'id', 'employee_id', 'description', 'amount', 'category', 'receipt_path', 'date', 'created_at',
  ],
  leave_requests: [
    'id', 'staff_id', 'start_date', 'end_date', 'type', 'reason', 'status',
    'decline_reason', 'created_at', 'updated_at',
  ],

  settings: ['key', 'value', 'updated_at'],

  email_send_log: [
    'id', 'message_id', 'template_name', 'recipient_email', 'status', 'error_message',
    'metadata', 'created_at',
  ],
  email_send_state: [
    'id', 'retry_after_until', 'batch_size', 'send_delay_ms', 'auth_email_ttl_minutes',
    'transactional_email_ttl_minutes', 'updated_at',
  ],
  suppressed_emails: ['id', 'email', 'reason', 'metadata', 'created_at'],
  email_unsubscribe_tokens: ['id', 'token', 'email', 'created_at', 'used_at'],
  email_dispatch_log: ['id', 'dedupe_key', 'template_name', 'recipient_email', 'created_at'],
  // Always denied by TABLE_RULES (internal email-worker table, never exposed
  // through this API) - listed here anyway for completeness/defense-in-depth.
  email_queue: ['id', 'queue_name', 'payload', 'status', 'visible_until', 'attempts', 'created_at'],
};

// Every table above defaults to primary key `id` except these.
const PRIMARY_KEYS = {
  cart_sessions: 'session_id',
  settings: 'key',
};

function getPrimaryKey(table) {
  return PRIMARY_KEYS[table] || 'id';
}

function getColumnSet(table) {
  const cols = TABLE_COLUMNS[table];
  return cols ? new Set(cols) : null;
}

module.exports = { TABLE_COLUMNS, PRIMARY_KEYS, getPrimaryKey, getColumnSet };
