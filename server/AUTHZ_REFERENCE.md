# Authorization Reference

Extracted from `CREATE POLICY` / `DROP POLICY` statements across all 47 files in
`supabase/migrations/`, applied in filename order to determine the **final**
RLS state for each table and storage bucket. This is meant to drive an
Express authorization-middleware config, so role names and ownership
conditions are quoted as close to the original SQL as practical.

## Roles

`app_role` enum: `admin`, `mechanic`, `customer`, `super_admin`.

`has_role(_user_id, _role)` (final version, migration `20260511223740`) returns
true if the user has the exact role **or** the role `super_admin`. In other
words: **`super_admin` implicitly passes every `has_role(..., 'admin')` and
every `has_role(..., 'mechanic')` check.** Any rule below written as
"admin-only" is therefore actually "admin or super_admin", and any rule
written as "mechanic" also passes for super_admin.

Ownership patterns used throughout:
- **Own customer record**: `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`
- **Own profile**: `user_id = auth.uid()`
- **Assigned mechanic**: `assigned_to = auth.uid()` (on `jobs`) or `mechanic_id = auth.uid()` (on `time_entries`)

## REVIEW note on baseline tables

The following tables predate the tracked migration history (no `CREATE TABLE`
for them exists in `supabase/migrations/`, only later `ALTER TABLE` /
`CREATE POLICY` statements referencing them): `jobs`, `profiles`, `customers`,
`invoices`, `invoice_items`, `messages`, `user_roles`, `job_photos`,
`hair_profiles` (as `vehicles`, pre-rename). Their **baseline** admin/mechanic
access rules are not present as literal `CREATE POLICY` text anywhere in this
repo. Rules marked `[INFERRED — REVIEW]` below are reconstructed from (a) the
partial/refinement policies that *are* present in tracked migrations, and (b)
app code behavior (`src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`,
page-level queries). Verify these against the live Supabase project's
`pg_policies` table before finalizing the Express middleware.

---

## profiles
- SELECT: `[INFERRED — REVIEW]` admin/super_admin (all rows); every authenticated user can read their own row (`user_id = auth.uid()`) — required by `AuthContext.fetchProfileAndRoles`, which every logged-in user calls.
- INSERT: `auth.uid() = user_id OR has_role(auth.uid(), 'admin')` (final form, migration `20260317013531`, which replaced an earlier "own profile only" policy).
- UPDATE: `has_role(auth.uid(), 'admin')` ("Admins can update all profiles", migration `20260317011232`). `[INFERRED — REVIEW]` users likely can also update their own row, but no explicit self-UPDATE policy was found in tracked migrations.
- DELETE: `has_role(auth.uid(), 'admin')` ("Admins can delete profiles", migration `20260317013531`).

## user_roles
- SELECT: `[INFERRED — REVIEW]` admin/super_admin (all rows); a user can read their own role rows (`user_id = auth.uid()`) — required by `AuthContext.fetchProfileAndRoles`/`hasRole`.
- INSERT/UPDATE/DELETE: `[INFERRED — REVIEW]` admin/super_admin only. Row insertion also happens via the `handle_new_user` trigger (SECURITY DEFINER, bypasses RLS) and via the super_admin promotion block in migration `20260511131632` (also SECURITY DEFINER/direct SQL).

## customers
- SELECT: `has_role(auth.uid(), 'admin')` `[INFERRED — REVIEW, admin-all-rows policy itself not found but implied by admin dashboards]`; own record via `"Customers can view own record"`: `user_id = auth.uid()` (migration `20260318200815`).
- INSERT: `"Authenticated can insert own customer"`: `auth.uid() = user_id`, TO authenticated (migration `20260318200815`). Also `"Anon can insert customers"` (final form, migration `20260626091529`): `TO public WITH CHECK (user_id IS NULL AND name IS NOT NULL AND length(name) BETWEEN 1 AND 200)` — anonymous booking flows can create a customer row only with no `user_id` (server attaches it later).
- UPDATE/DELETE: `[INFERRED — REVIEW]` admin/super_admin only; no customer self-update policy found.
- Unique constraint: at most one customer row per non-null `user_id` (`idx_customers_user_id_unique`).

## hair_profiles (originally `vehicles`, renamed in migration `20260511212229`)
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access hair_profiles" / previously "Admins full access vehicles").
- ALL (own): `"Customers can manage own hair_profiles"`: `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`, both USING and WITH CHECK.
- SELECT: `"Staff can view hair_profiles"`: `has_role(auth.uid(), 'mechanic')`.
- INSERT (anon): existed briefly as `"Anyone can insert hair_profiles"` (`WITH CHECK (customer_id IS NOT NULL)`, tightened in migration `20260626091529`) but was **dropped** in migration `20260626091554` ("edge function uses service_role now"). **Final state: no anonymous/public INSERT path** — only admin, own-customer, or service-role/backend inserts.

## chairs
- ALL: `has_role(auth.uid(), 'admin')`, TO authenticated ("Admins full access chairs").
- SELECT: `"Staff can view chairs"`, TO authenticated, `USING (true)` — any logged-in user (any role) can read chairs.

## service_catalog
- ALL: `has_role(auth.uid(), 'admin')`.
- SELECT: `"All authenticated can read service_catalog"` (TO authenticated, `true`) **and** `"Public can read service_catalog"` (no role restriction, `true`, migration `20260415231520`) — effectively public read, including anonymous visitors (public services page).

## service_addons
- ALL: `has_role(auth.uid(), 'admin')` ("Admins manage service_addons").
- SELECT: `"Public can read service_addons"`, `USING (true)` — fully public.

## jobs
- SELECT: `[INFERRED — REVIEW]` admin/super_admin (all rows); mechanic — `[INFERRED — REVIEW]` likely `assigned_to = auth.uid()` (no explicit tracked-migration policy found, but the mechanic job board depends on this); customer — `"Customers can view own jobs"`: `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`.
- INSERT: `[INFERRED — REVIEW]` admin/mechanic. A public/anon insert path existed (`"Anon can insert jobs"`, `WITH CHECK (customer_id IS NOT NULL AND status = 'pending' AND assigned_to IS NULL AND deposit_paid_amount = 0)`, added in migration `20260626091529`) but was **dropped** in migration `20260626091554` — booking now goes through a backend/service-role path, not direct anon RLS insert.
- UPDATE: `[INFERRED — REVIEW]` admin/super_admin (all rows); mechanic likely limited to their own assigned jobs (`assigned_to = auth.uid()`) — not confirmed by an explicit tracked policy.
- DELETE: `[INFERRED — REVIEW]` admin/super_admin only.
- Notes: `type`, `status`, `service_type` are enum-constrained (`job_type`, `job_status`, `service_type`).

## job_notes
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access job_notes").
- ALL (own): `"Mechanics can manage own job_notes"`: `has_role(auth.uid(), 'mechanic') AND author_id = auth.uid()`.

## job_photos
- SELECT: `[INFERRED — REVIEW]` admin/mechanic (all rows, for internal documentation photos); customer — `"Customers can view own job_photos"`: `visible_to_customer = true AND job_id IN (SELECT id FROM jobs WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))` — customers only ever see photos explicitly flagged `visible_to_customer`.
- INSERT/UPDATE/DELETE: `[INFERRED — REVIEW]` admin/mechanic only (uploader is presumably the assigned mechanic or an admin); no explicit tracked-migration table-level policy found (only the `job-photos` **storage bucket** policies below are explicit).

## job_addons
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access job_addons").
- SELECT (customer): `"Customers can view own job_addons"`: job belongs to a job whose customer's `user_id = auth.uid()` (via join through `jobs`/`customers`).
- SELECT (mechanic): `"Mechanics can view assigned job_addons"`: `has_role(auth.uid(), 'mechanic') AND job_id IN (SELECT id FROM jobs WHERE assigned_to = auth.uid())`.
- INSERT (anon): `"Anon can insert job_addons"` (`WITH CHECK (true)`) existed briefly but was **dropped** in migration `20260626091529` ("only edge function/service role writes"). **Final state: no anon INSERT.**

## time_entries
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access time_entries").
- ALL (own): `"Mechanics can manage own time_entries"`: `mechanic_id = auth.uid()`.

## swap_requests
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access swap_requests").
- SELECT (own): `"Mechanics can view own swap_requests"`: `from_mechanic_id = auth.uid() OR to_mechanic_id = auth.uid()`.
- INSERT (own): `"Mechanics can insert swap_requests"`: `from_mechanic_id = auth.uid()`.
- UPDATE/DELETE: admin only (covered by the ALL policy above; no separate mechanic UPDATE policy found, e.g. for accepting a swap — `[INFERRED — REVIEW]`, likely handled via a backend function).

## waitlist
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access waitlist").
- INSERT: `"Anyone can join waitlist"` (final form, migration `20260626091529`): `WITH CHECK (client_name IS NOT NULL AND length(client_name) BETWEEN 1 AND 200 AND status = 'waiting')` — public/anonymous.
- SELECT: `"Staff and admins can view waitlist"` (final form, migration `20260511223740`, replacing the earlier "Authenticated can view waitlist"): `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'mechanic')` — **not** open to arbitrary authenticated users (e.g. plain customers) anymore.

## estimates
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access estimates").
- SELECT (own): `"Customers can view own estimates"`: `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`.
- UPDATE (own): `"Customers can update own estimates"`: same ownership condition (for customer approval flow, migration `20260317013531`).

## invoices
- SELECT: `[INFERRED — REVIEW]` admin/super_admin (all rows); customer — `"Customers can view own invoices"`: `job_id IN (SELECT id FROM jobs WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))`.
- UPDATE: `[INFERRED — REVIEW]` admin (all rows, e.g. marking paid); customer — `"Customers can update own invoice signature"`: same job/customer ownership chain as above, USING and WITH CHECK (added specifically to allow customers to attach a signature, migration `20260324230552`).
- INSERT/DELETE: `[INFERRED — REVIEW]` admin/super_admin only (invoices are generated from jobs, likely server-side).
- `status` values: `draft`, `sent`, `paid`, `archived` (enum `invoice_status`; `archived` added in migration `20260325002405`). A trigger (`on_invoice_status_change`) syncs `jobs.status` to `'paid'` whenever `invoices.status` transitions to `'paid'` — this business rule must be reimplemented in the Express layer.

## invoice_items
- `[INFERRED — REVIEW]` No explicit tracked-migration policy found for this table at all. Given it is a child of `invoices`, treat identically to `invoices`: admin full access; customer read-only via the same job/customer ownership chain (join through `invoice_id -> invoices.job_id -> jobs.customer_id -> customers.user_id`).
- `type` is constrained to `('labor','parts','misc','Labour','Parts','Misc')` (CHECK constraint, migration `20260324232159` — note the mixed casing, both are legitimately in use).

## leads
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access leads").
- SELECT (assigned): `"Mechanics can view assigned leads"`: `has_role(auth.uid(), 'mechanic') AND assigned_to = auth.uid()`.
- INSERT (anon): `"Anon can insert leads"` (final form, migration `20260626091529`): `WITH CHECK (name IS NOT NULL AND length(name) BETWEEN 1 AND 200 AND status = 'New' AND assigned_to IS NULL AND ai_score = 0)` — public contact-form submissions, but only with safe/neutral defaults.

## quotes
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access quotes").
- SELECT: `"Public can view quotes by id"` (`TO public, USING (true)`, added migration `20260324215415`) — was **dropped** in migration `20260511223740` ("remove public SELECT"). **Final state: no public/customer SELECT policy remains** — quotes are admin-only for direct table reads (shareable quote links must be served through a backend endpoint that uses elevated privileges, not client-side RLS).

## quote_items
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access quote_items").
- SELECT: `"Public can view quote_items"` (`TO public, USING (true)`) — **dropped** in migration `20260511223740`, same as `quotes`. **Final state: admin-only.**

## lead_interactions
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access lead_interactions"). No other role has any access (mechanics are not granted SELECT even though they can view their assigned lead itself).

## messages
- SELECT: `[INFERRED — REVIEW]` admin/super_admin (all rows); customer — `"Customers can view own messages"`: `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`.
- INSERT: `"Anon can insert messages"` (`WITH CHECK (true)`, migration `20260319183051`) was tightened to `"Anon can insert inbound messages"` (`WITH CHECK (customer_id IS NOT NULL AND direction = 'inbound' AND length(content) BETWEEN 1 AND 5000)`, migration `20260626091529`), then **dropped entirely** in migration `20260626091554`. **Final state: no anonymous INSERT path** — inbound messages must be created server-side.
- UPDATE/DELETE: `[INFERRED — REVIEW]` admin only.

## issue_submissions
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access issue_submissions").
- SELECT (own): `"Customers can view own issues"`: `customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())`.
- INSERT (own): `"Customers can insert own issues"`: same ownership condition.

## issue_photos
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access issue_photos").
- SELECT (own): `"Customers can view own issue_photos"`: `issue_id IN (SELECT id FROM issue_submissions WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))`.
- INSERT (own): `"Customers can insert own issue_photos"`: same ownership chain.

## products
- SELECT: `"Public can read active products"`, `USING (true)` — fully public (despite the name, the policy condition itself is unconditional `true`, not filtered to `is_active = true`; filtering by active/inactive is left to the application query).
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access products").

## orders
- SELECT (own): `"Users can view own orders"`: `auth.uid() = user_id`.
- INSERT (own): `"Users can insert own orders"`: `auth.uid() = user_id`.
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access orders").
- Note: ownership here is `user_id` directly (the Supabase auth user id), not the `customers` table indirection used elsewhere.

## order_items
- SELECT (own): `"Users can view own order items"`: `order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())`.
- INSERT (own): `"Users can insert own order items"`: same ownership chain.
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access order_items").

## cart_items
- ALL (final form, migration `20260626091529`, replacing the original unconditional `"Anyone can manage cart by session"`): `"Cart items by session"`: `USING (session_id IS NOT NULL AND length(session_id) > 0)`, `WITH CHECK (... AND quantity > 0 AND quantity <= 50)` — effectively public/anonymous, keyed by client-supplied `session_id` (no server-side session validation at the DB layer beyond basic shape checks).

## cart_sessions
- INSERT: `"Cart sessions insert by id"` (final form, migration `20260511223740`): `TO anon, authenticated`, `WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 16 AND email IS NOT NULL AND length(email) <= 255)`.
- UPDATE: `"Cart sessions update by id"`: `TO anon, authenticated`, `USING/WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 16)`.
- No SELECT or DELETE policy found — `[INFERRED — REVIEW]` likely admin-only or service-role-only for reads (used for abandoned-cart email reminders).

## inventory
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access inventory").
- SELECT: `"Authenticated can read inventory"`, TO authenticated, `USING (true)` — any logged-in user, any role.

## booking_drafts
- INSERT: `"Anyone can insert booking drafts"` (final form, migration `20260626091529`): `TO public`, `WITH CHECK (completed = false AND email IS NOT NULL AND length(email) <= 255)`.
- UPDATE: `"Anyone can update active booking drafts"` (`USING (completed = false AND last_seen_at > now() - interval '24 hours')`, added migration `20260626091529`) was **dropped** in migration `20260626091554` after `session_token` was introduced. **Final state: no public UPDATE policy** — updates must go through a backend endpoint that validates `session_token` itself (RLS alone no longer scopes UPDATE by anything, so app-layer must check `session_token`).
- SELECT: `"Admins read booking drafts"`: `has_role(auth.uid(), 'admin')`.

## expenses
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access expenses").
- ALL (own): `"Users can manage own expenses"`: `employee_id = auth.uid()`, both USING and WITH CHECK.

## leave_requests
- SELECT (own): `"Staff can view own leave requests"`: `staff_id = auth.uid()`, TO authenticated.
- INSERT (own): `"Staff can insert own leave requests"`: `staff_id = auth.uid()`, TO authenticated.
- ALL: `"Admins full access leave_requests"`: `has_role(auth.uid(), 'admin')`, TO authenticated.
- Note: no explicit staff UPDATE/DELETE policy — staff cannot edit/withdraw their own leave request once submitted except through admin action, `[INFERRED — REVIEW]`.

## settings
- ALL: `has_role(auth.uid(), 'admin')` ("Admins full access settings").
- SELECT: `"All authenticated can read settings"` (TO authenticated, `true`) **and** `"Public can read settings"` (TO public, `true`, migration `20260318200815`, added "for site images") — effectively fully public read, including anonymous visitors.

## email_send_log
- SELECT/INSERT/UPDATE: `auth.role() = 'service_role'` only, for all three. No `authenticated`/`anon`/customer/admin access at all — this table is backend/service-role only. `status` is CHECK-constrained to `('pending','sent','suppressed','failed','bounced','complained','dlq')`.

## email_send_state
- ALL: `auth.role() = 'service_role'` only.

## suppressed_emails
- SELECT/INSERT: `auth.role() = 'service_role'` only. Deliberately **append-only**: no UPDATE or DELETE policy exists at all (by design, "to prevent bypassing suppression").

## email_unsubscribe_tokens
- SELECT/INSERT: `auth.role() = 'service_role'` only.
- UPDATE: `auth.role() = 'service_role'` only ("Service role can mark tokens as used" — i.e. setting `used_at`).
- No DELETE policy exists at all (by design, "to prevent removing tokens").

## email_dispatch_log
- SELECT: `has_role(auth.uid(), 'admin')` ("Admins read dispatch_log"). No INSERT/UPDATE/DELETE policy found for any role — writes happen exclusively via service-role/backend code that bypasses RLS.

## email_queue (new table — MySQL replacement for pgmq queues)
- No RLS equivalent existed in Postgres either (pgmq tables live outside `public` schema and were locked down via `REVOKE EXECUTE` on the wrapper functions rather than RLS: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` were revoked from `PUBLIC, anon, authenticated`, service_role only). In Express: restrict all reads/writes to the internal email-worker process only; do not expose this table through any customer- or admin-facing API route.

---

## Storage Buckets

### job-photos
- INSERT: `"Users can upload job photos to own folder"`: `TO authenticated`, `WITH CHECK (bucket_id = 'job-photos' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)` — i.e. the first path segment of the uploaded object key must equal the uploader's user id. **OR** `"Staff and admins can upload job photos"`: `WITH CHECK (bucket_id = 'job-photos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'mechanic')))` — admins/mechanics may upload to any folder.
- DELETE: `"Users can delete own job photos"`: `USING (bucket_id = 'job-photos' AND owner = auth.uid())` (Postgres storage `owner` column, i.e. the uploader) **OR** `"Admins can delete job photos"`: `USING (bucket_id = 'job-photos' AND has_role(auth.uid(), 'admin'))`.
- SELECT: the original `"Anyone can view job photos"` policy was **dropped** in migration `20260626091554` and never replaced. **Final state: no explicit SELECT policy on `storage.objects` for this bucket.** If the bucket's `public` flag is `true`, files remain fetchable via the public object URL regardless (Supabase serves public-bucket objects through a path that bypasses RLS); if the bucket was flipped to private, reads must go through a signed URL issued by a backend/service-role endpoint. **REVIEW**: confirm the bucket's public/private flag in the live project before deciding the Express equivalent (signed-URL proxy vs. static public path).

### site-images
- ALL (manage): `"Admins can manage site-images"`: `TO authenticated`, `USING/WITH CHECK (bucket_id = 'site-images' AND has_role(auth.uid(), 'admin'))`.
- SELECT: `"Public read site-images"` (`TO public`, `USING (bucket_id = 'site-images')`) was **dropped** in migration `20260626091554`. **Final state: no explicit SELECT policy** — same public-bucket caveat as `job-photos` above applies (bucket was created with `public = true` in migration `20260318193127` and no migration flips it back to private).

### expense-receipts
- ALL: `"Admins full access expense receipts"`: `USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'))`.
- INSERT: `"Users can upload own expense receipts"`: `WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid() IS NOT NULL)` — any authenticated user may upload (not folder-scoped).
- SELECT (final form, migration `20260626091529`, replacing the original public `"Anyone can view expense receipts"` which was dropped): `"Admins can view expense receipts"`: `has_role(auth.uid(), 'admin')`, **OR** `"Employees can view own expense receipts"`: `(storage.foldername(name))[1] = auth.uid()::text` — an employee can only view receipts in their own folder. **This bucket is private** — no public-bucket fallback applies here (contrast with job-photos/site-images above).

### issue-photos (bonus — referenced by `issue_photos` table, not in the "3 buckets" list but present in the schema)
- INSERT: originally `"Anyone can upload issue photos"` (`WITH CHECK (bucket_id = 'issue-photos')`, fully public), tightened in migration `20260626091529` to `"Authenticated users can upload issue photos to own folder"`: `TO authenticated`, `WITH CHECK (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)`. **Final state: authenticated + own-folder only, no more anonymous uploads.**
- SELECT: `"Anyone can view issue photos"` was **dropped** in migration `20260626091554`, no replacement. Same public-bucket caveat as job-photos applies (bucket created `public = true`).

### vehicle-photos (bonus — created migration `20260324230552`, not in the "3 buckets" list but present in the schema)
- INSERT: `"Authenticated users can upload vehicle photos"`: `TO authenticated`, `WITH CHECK (bucket_id = 'vehicle-photos')` — any authenticated user, not folder-scoped.
- DELETE: `"Admins can delete vehicle photos"`: `USING (bucket_id = 'vehicle-photos' AND has_role(auth.uid(), 'admin'))`.
- SELECT: `"Anyone can view vehicle photos"` was **dropped** in migration `20260626091554`, no replacement. Same public-bucket caveat applies (bucket created `public = true`).
