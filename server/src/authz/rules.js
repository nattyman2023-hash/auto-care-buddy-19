// Per-table authorization rules, replacing Postgres RLS (see server/AUTHZ_REFERENCE.md
// for the source policies this was translated from).
//
// Each table maps to { select, insert, update, delete }. Each action is a function:
//   (user) => { allow: boolean, where?: string, params?: any[] }
// `where`/`params` (when present) is a SQL fragment ANDed into SELECT queries to scope
// rows to what this user may see (e.g. "customer_id IN (SELECT id FROM customers WHERE
// user_id = ?)"). For insert/update/delete, `allow` gates the whole request; row-level
// ownership for update/delete is re-checked by the data layer via `rowFilter`, a second
// function (user) => { where, params } applied when fetching the row to mutate — if it
// matches zero rows the request 404s rather than leaking whether the row exists.
//
// Where the source RLS policy was not found verbatim in tracked migrations
// (see AUTHZ_REFERENCE.md "[INFERRED - REVIEW]" items), this defaults to the more
// restrictive reading rather than guessing open.

const { hasRole } = require('../middleware/auth');

const deny = () => ({ allow: false });
const allowAll = () => ({ allow: true });

function rolesOnly(...roles) {
  return (user) => (user && roles.some((r) => hasRole(user, r)) ? allowAll() : deny());
}

// Scopes rows to ones belonging to the caller's own `customers` row, via a direct
// `customer_id` column on the target table.
function ownCustomerRow(column = 'customer_id') {
  return (user) => {
    if (!user) return deny();
    return {
      allow: true,
      where: `${column} IN (SELECT id FROM customers WHERE user_id = ?)`,
      params: [user.id],
    };
  };
}

// Scopes rows via a one-hop join through `jobs` to the caller's own customer record.
function ownCustomerViaJob(jobIdColumn = 'job_id') {
  return (user) => {
    if (!user) return deny();
    return {
      allow: true,
      where: `${jobIdColumn} IN (SELECT id FROM jobs WHERE customer_id IN (SELECT id FROM customers WHERE user_id = ?))`,
      params: [user.id],
    };
  };
}

function ownRow(column) {
  return (user) => {
    if (!user) return deny();
    return { allow: true, where: `${column} = ?`, params: [user.id] };
  };
}

function anyOf(...checks) {
  return (user) => {
    for (const check of checks) {
      const result = check(user);
      if (result.allow) return result;
    }
    return deny();
  };
}

function or(...fragments) {
  // Combine multiple {where, params} scoping results into "(a) OR (b)".
  return (user) => {
    const parts = [];
    const params = [];
    let anyAllowedWithoutWhere = false;
    for (const fragment of fragments) {
      const result = fragment(user);
      if (!result.allow) continue;
      if (!result.where) {
        anyAllowedWithoutWhere = true;
        break;
      }
      parts.push(`(${result.where})`);
      params.push(...(result.params || []));
    }
    if (anyAllowedWithoutWhere) return allowAll();
    if (parts.length === 0) return deny();
    return { allow: true, where: parts.join(' OR '), params };
  };
}

const TABLE_RULES = {
  // ---- Auth-adjacent (never exposed through the generic data API) ----
  app_users: { select: deny, insert: deny, update: deny, delete: deny },
  auth_sessions: { select: deny, insert: deny, update: deny, delete: deny },
  password_reset_tokens: { select: deny, insert: deny, update: deny, delete: deny },

  // ---- Identity ----
  profiles: {
    select: or(rolesOnly('admin'), ownRow('user_id')),
    insert: (user, data) => (data && data.user_id === user?.id) || hasRole(user, 'admin') ? allowAll() : deny(),
    update: rolesOnly('admin'), // self-update goes through /api/auth/update-password + a dedicated profile-fields route, not generic CRUD
    delete: rolesOnly('admin'),
  },
  user_roles: {
    select: or(rolesOnly('admin'), ownRow('user_id')),
    insert: rolesOnly('admin'),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  customers: {
    select: or(rolesOnly('admin'), ownRow('user_id')),
    insert: (user) => allowAll(), // anon booking creates guest customers; app layer enforces user_id null-or-own
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },

  // ---- Hair profiles ----
  hair_profiles: {
    select: or(rolesOnly('admin', 'mechanic'), ownCustomerRow()),
    insert: or(rolesOnly('admin'), ownCustomerRow()),
    update: or(rolesOnly('admin'), ownCustomerRow()),
    delete: rolesOnly('admin'),
  },

  // ---- Salon config (broadly readable) ----
  chairs: { select: (user) => (user ? allowAll() : deny()), insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  service_catalog: { select: allowAll, insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  service_addons: { select: allowAll, insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  products: { select: allowAll, insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  settings: { select: allowAll, insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  inventory: { select: (user) => (user ? allowAll() : deny()), insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },

  // ---- Jobs & related ----
  jobs: {
    select: or(rolesOnly('admin'), rolesOnly('mechanic'), ownCustomerRow()),
    insert: rolesOnly('admin', 'mechanic'),
    update: or(rolesOnly('admin'), (user) => (hasRole(user, 'mechanic') ? { allow: true, where: 'assigned_to = ?', params: [user.id] } : deny())),
    delete: rolesOnly('admin'),
  },
  job_notes: {
    select: or(rolesOnly('admin'), ownRow('author_id')),
    insert: or(rolesOnly('admin'), (user) => (hasRole(user, 'mechanic') ? allowAll() : deny())),
    update: or(rolesOnly('admin'), ownRow('author_id')),
    delete: or(rolesOnly('admin'), ownRow('author_id')),
  },
  job_photos: {
    select: or(
      rolesOnly('admin', 'mechanic'),
      (user) => ({
        allow: true,
        where: `visible_to_customer = 1 AND job_id IN (SELECT id FROM jobs WHERE customer_id IN (SELECT id FROM customers WHERE user_id = ?))`,
        params: [user?.id],
      })
    ),
    insert: rolesOnly('admin', 'mechanic'),
    update: rolesOnly('admin', 'mechanic'),
    delete: rolesOnly('admin', 'mechanic'),
  },
  job_addons: {
    select: or(rolesOnly('admin'), ownCustomerViaJob(), (user) => (hasRole(user, 'mechanic') ? { allow: true, where: 'job_id IN (SELECT id FROM jobs WHERE assigned_to = ?)', params: [user.id] } : deny())),
    insert: rolesOnly('admin', 'mechanic'),
    update: rolesOnly('admin', 'mechanic'),
    delete: rolesOnly('admin'),
  },
  time_entries: {
    select: or(rolesOnly('admin'), ownRow('mechanic_id')),
    insert: or(rolesOnly('admin'), ownRow('mechanic_id')),
    update: or(rolesOnly('admin'), ownRow('mechanic_id')),
    delete: or(rolesOnly('admin'), ownRow('mechanic_id')),
  },
  swap_requests: {
    select: or(rolesOnly('admin'), (user) => ({ allow: true, where: '(from_mechanic_id = ? OR to_mechanic_id = ?)', params: [user?.id, user?.id] })),
    insert: or(rolesOnly('admin'), ownRow('from_mechanic_id')),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  estimates: {
    select: or(rolesOnly('admin'), ownCustomerRow()),
    insert: rolesOnly('admin'),
    update: or(rolesOnly('admin'), ownCustomerRow()),
    delete: rolesOnly('admin'),
  },
  invoices: {
    select: or(rolesOnly('admin'), ownCustomerViaJob()),
    insert: rolesOnly('admin'),
    update: or(rolesOnly('admin'), ownCustomerViaJob()), // customers may only touch the signature field - enforced in the route handler, not here
    delete: rolesOnly('admin'),
  },
  invoice_items: {
    select: or(
      rolesOnly('admin'),
      (user) => ({
        allow: true,
        where: `invoice_id IN (SELECT id FROM invoices WHERE job_id IN (SELECT id FROM jobs WHERE customer_id IN (SELECT id FROM customers WHERE user_id = ?)))`,
        params: [user?.id],
      })
    ),
    insert: rolesOnly('admin'),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },

  // ---- Leads / quotes (staff-facing) ----
  leads: {
    select: or(rolesOnly('admin'), (user) => (hasRole(user, 'mechanic') ? { allow: true, where: 'assigned_to = ?', params: [user.id] } : deny())),
    insert: allowAll, // public contact form; app layer enforces safe defaults (status='New', assigned_to=null, ai_score=0)
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  quotes: { select: rolesOnly('admin'), insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  quote_items: { select: rolesOnly('admin'), insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },
  lead_interactions: { select: rolesOnly('admin'), insert: rolesOnly('admin'), update: rolesOnly('admin'), delete: rolesOnly('admin') },

  // ---- Messaging ----
  messages: {
    select: or(rolesOnly('admin'), ownCustomerRow()),
    insert: rolesOnly('admin'), // inbound anon messages are created by a dedicated backend route, not generic CRUD
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },

  // ---- Customer-submitted issues ----
  issue_submissions: {
    select: or(rolesOnly('admin'), ownCustomerRow()),
    insert: or(rolesOnly('admin'), ownCustomerRow()),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  issue_photos: {
    select: or(
      rolesOnly('admin'),
      (user) => ({ allow: true, where: `issue_id IN (SELECT id FROM issue_submissions WHERE customer_id IN (SELECT id FROM customers WHERE user_id = ?))`, params: [user?.id] })
    ),
    insert: or(rolesOnly('admin'), (user) => ({ allow: true, where: `issue_id IN (SELECT id FROM issue_submissions WHERE customer_id IN (SELECT id FROM customers WHERE user_id = ?))`, params: [user?.id] })),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },

  // ---- Shop / orders ----
  orders: {
    select: or(rolesOnly('admin'), ownRow('user_id')),
    insert: (user, data) => (user && data && data.user_id === user.id) || hasRole(user, 'admin') ? allowAll() : deny(),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  order_items: {
    select: or(rolesOnly('admin'), (user) => ({ allow: true, where: 'order_id IN (SELECT id FROM orders WHERE user_id = ?)', params: [user?.id] })),
    insert: or(rolesOnly('admin'), (user) => ({ allow: true, where: 'order_id IN (SELECT id FROM orders WHERE user_id = ?)', params: [user?.id] })),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  cart_items: { select: allowAll, insert: allowAll, update: allowAll, delete: allowAll }, // session_id-keyed, no user account required (matches original anon-friendly cart policy)
  cart_sessions: { select: rolesOnly('admin'), insert: allowAll, update: allowAll, delete: rolesOnly('admin') },
  booking_drafts: { select: rolesOnly('admin'), insert: allowAll, update: deny, delete: rolesOnly('admin') }, // updates must go through the dedicated booking-draft route which validates session_token

  // ---- Staff ops ----
  expenses: {
    select: or(rolesOnly('admin'), ownRow('employee_id')),
    insert: or(rolesOnly('admin'), ownRow('employee_id')),
    update: or(rolesOnly('admin'), ownRow('employee_id')),
    delete: or(rolesOnly('admin'), ownRow('employee_id')),
  },
  leave_requests: {
    select: or(rolesOnly('admin'), ownRow('staff_id')),
    insert: or(rolesOnly('admin'), ownRow('staff_id')),
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },
  waitlist: {
    select: rolesOnly('admin', 'mechanic'),
    insert: allowAll,
    update: rolesOnly('admin'),
    delete: rolesOnly('admin'),
  },

  // ---- Email infrastructure (service-only, never exposed to any client role) ----
  email_send_log: { select: deny, insert: deny, update: deny, delete: deny },
  email_send_state: { select: deny, insert: deny, update: deny, delete: deny },
  suppressed_emails: { select: deny, insert: deny, update: deny, delete: deny },
  email_unsubscribe_tokens: { select: deny, insert: deny, update: deny, delete: deny },
  email_dispatch_log: { select: rolesOnly('admin'), insert: deny, update: deny, delete: deny },
  email_queue: { select: deny, insert: deny, update: deny, delete: deny },
};

function getRules(table) {
  return TABLE_RULES[table] || null;
}

module.exports = { getRules, TABLE_RULES, rolesOnly, ownCustomerRow, ownCustomerViaJob, ownRow, or, anyOf, allowAll, deny };
