-- 1. Fix search_path on email queue functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END;
$$;

-- 2. Revoke EXECUTE from anon/authenticated on queue helpers (service role keeps it)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 3. Tighten overly permissive RLS policies

-- booking_drafts: only allow updates to drafts that are not completed and recent
DROP POLICY IF EXISTS "Anyone can update booking drafts" ON public.booking_drafts;
CREATE POLICY "Anyone can update active booking drafts" ON public.booking_drafts
FOR UPDATE TO public
USING (completed = false AND last_seen_at > now() - interval '24 hours')
WITH CHECK (completed = false);

DROP POLICY IF EXISTS "Anyone can insert booking drafts" ON public.booking_drafts;
CREATE POLICY "Anyone can insert booking drafts" ON public.booking_drafts
FOR INSERT TO public
WITH CHECK (completed = false AND email IS NOT NULL AND length(email) <= 255);

-- cart_items / cart_sessions: require non-empty session_id
DROP POLICY IF EXISTS "Anyone can manage cart by session" ON public.cart_items;
CREATE POLICY "Cart items by session" ON public.cart_items
FOR ALL TO public
USING (session_id IS NOT NULL AND length(session_id) > 0)
WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0 AND quantity > 0 AND quantity <= 50);

DROP POLICY IF EXISTS "Anyone manage cart_sessions" ON public.cart_sessions;
CREATE POLICY "Cart sessions by id" ON public.cart_sessions
FOR ALL TO public
USING (session_id IS NOT NULL AND length(session_id) > 0)
WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0 AND email IS NOT NULL AND length(email) <= 255);

-- customers: anon insert only when no user_id (server attaches it later)
DROP POLICY IF EXISTS "Anon can insert customers" ON public.customers;
CREATE POLICY "Anon can insert customers" ON public.customers
FOR INSERT TO public
WITH CHECK (user_id IS NULL AND name IS NOT NULL AND length(name) BETWEEN 1 AND 200);

-- hair_profiles: anon insert only with required fields
DROP POLICY IF EXISTS "Anyone can insert hair_profiles" ON public.hair_profiles;
CREATE POLICY "Anyone can insert hair_profiles" ON public.hair_profiles
FOR INSERT TO public
WITH CHECK (customer_id IS NOT NULL);

-- jobs: anon insert only with safe defaults
DROP POLICY IF EXISTS "Anon can insert jobs" ON public.jobs;
CREATE POLICY "Anon can insert jobs" ON public.jobs
FOR INSERT TO public
WITH CHECK (
  customer_id IS NOT NULL
  AND status = 'pending'::job_status
  AND assigned_to IS NULL
  AND deposit_paid_amount = 0
);

-- leads: anon insert only with safe defaults
DROP POLICY IF EXISTS "Anon can insert leads" ON public.leads;
CREATE POLICY "Anon can insert leads" ON public.leads
FOR INSERT TO public
WITH CHECK (
  name IS NOT NULL AND length(name) BETWEEN 1 AND 200
  AND status = 'New'
  AND assigned_to IS NULL
  AND ai_score = 0
);

-- messages: only inbound from anon, or admin
DROP POLICY IF EXISTS "Anon can insert messages" ON public.messages;
CREATE POLICY "Anon can insert inbound messages" ON public.messages
FOR INSERT TO public
WITH CHECK (
  customer_id IS NOT NULL
  AND direction = 'inbound'::message_direction
  AND length(content) BETWEEN 1 AND 5000
);

-- waitlist
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
FOR INSERT TO public
WITH CHECK (
  client_name IS NOT NULL AND length(client_name) BETWEEN 1 AND 200
  AND status = 'waiting'
);

-- job_addons: drop anon insert; only edge function (service role) writes
DROP POLICY IF EXISTS "Anon can insert job_addons" ON public.job_addons;

-- 4. Multi-zone chairs
ALTER TABLE public.chairs ADD COLUMN IF NOT EXISTS zones text[] NOT NULL DEFAULT ARRAY['Barbershop']::text[];
UPDATE public.chairs SET zones = ARRAY[zone] WHERE zones = ARRAY['Barbershop']::text[] AND zone IS NOT NULL AND zone <> 'Barbershop';
CREATE INDEX IF NOT EXISTS chairs_zones_gin ON public.chairs USING GIN (zones);

-- 5. Make sure super_admin profiles are not bookable (board cleanup)
UPDATE public.profiles p
SET bookable = false
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role = 'super_admin'::app_role
);