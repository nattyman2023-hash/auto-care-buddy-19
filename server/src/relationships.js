// Explicit registry of every embedded/nested `select()` shape actually used
// across src/**/*.tsx (see the survey referenced in the migration task) —
// this is deliberately NOT a generic PostgREST embed parser. Only the exact
// (table -> alias) pairs below are recognized by the select-string parser in
// server/src/routes/query.js; anything else is rejected with an error rather
// than guessed at.
//
// Each entry is keyed by [baseTable][embedAlias] and describes a single
// to-one LEFT JOIN:
//   { table: <table being joined in>, localColumn: <FK column on baseTable>,
//     foreignColumn: <column on `table` the FK points at, almost always 'id'> }
//
// `embedAlias` is what ends up as the key in the shaped JSON response - i.e.
// the alias in `alias:table(cols)`, or the bare table name when no alias is
// given (e.g. `service_catalog(duration_minutes)`).
//
// Two rows have no real FK constraint in database-schema-mysql.sql
// (`job_addons.addon_service_id`, `service_addons.addon_id`/`service_id`,
// `waitlist.service_catalog_id`) - see AUTHZ_REFERENCE.md / schema REVIEW
// notes. Of those, only `service_addons` is ever embedded from the frontend
// (ServiceAddonsPicker.tsx, via the `service_catalog!service_addons_addon_id_fkey`
// FK-hint alias - the select-string parser strips the `!hintName` suffix off
// both the alias and the table spec, so the effective lookup key is plain
// `service_catalog`). The join column is confirmed by the JS-side fallback
// code in the same component, which manually joins
// `service_addons.addon_id -> service_catalog.id` when the embed comes back
// empty. `job_addons` and `waitlist` never attempt a server-side embed
// anywhere in the app (both are always resolved with a second flat query and
// an in-memory `Map`/`find` join), so they intentionally have no entries here.

module.exports = {
  jobs: {
    customer: { table: 'customers', localColumn: 'customer_id', foreignColumn: 'id' },
    hair_profile: { table: 'hair_profiles', localColumn: 'hair_profile_id', foreignColumn: 'id' },
    // Covers both call-site spellings: bare `service_catalog(cols)` and the
    // explicit-column-hint form `service_catalog:service_catalog_id(cols)`
    // (the parser resolves both to this same alias key - see query.js).
    service_catalog: { table: 'service_catalog', localColumn: 'service_catalog_id', foreignColumn: 'id' },
  },

  quotes: {
    lead: { table: 'leads', localColumn: 'lead_id', foreignColumn: 'id' },
  },

  invoices: {
    // Nested further at the call site as `job:jobs(*, customer:customers(name),
    // hair_profile:hair_profiles(preference))` - the inner `customer`/
    // `hair_profile` embeds are resolved via the `jobs` entries above once
    // the parser recurses into this relation's target table.
    job: { table: 'jobs', localColumn: 'job_id', foreignColumn: 'id' },
  },

  messages: {
    customer: { table: 'customers', localColumn: 'customer_id', foreignColumn: 'id' },
  },

  hair_profiles: {
    customer: { table: 'customers', localColumn: 'customer_id', foreignColumn: 'id' },
  },

  // No real FK (service_id/addon_id both reference service_catalog.id without
  // a declared constraint - see database-schema-mysql.sql). Only the
  // addon-side embed is ever attempted by the frontend
  // (ServiceAddonsPicker.tsx), so only that direction is registered.
  service_addons: {
    service_catalog: { table: 'service_catalog', localColumn: 'addon_id', foreignColumn: 'id' },
  },
};
