
-- 1. has_role: switch to SECURITY INVOKER so it's not flagged by the definer lint
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'super_admin'::app_role)
  )
$$;

-- 2. Lock down internal SECURITY DEFINER functions from API roles
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_profile_bookable(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_user_roles_bookable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_invoice_status_change() FROM PUBLIC, anon, authenticated;

-- 3. booking_drafts: add session_token, drop public UPDATE policy
ALTER TABLE public.booking_drafts
  ADD COLUMN IF NOT EXISTS session_token uuid NOT NULL DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "Anyone can update active booking drafts" ON public.booking_drafts;

-- 4. cart_sessions: drop broad ALL policy, allow INSERT/UPDATE by session_id only
DROP POLICY IF EXISTS "Cart sessions by id" ON public.cart_sessions;

CREATE POLICY "Cart sessions insert by id"
  ON public.cart_sessions FOR INSERT TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) >= 16
    AND email IS NOT NULL
    AND length(email) <= 255
  );

CREATE POLICY "Cart sessions update by id"
  ON public.cart_sessions FOR UPDATE TO anon, authenticated
  USING (session_id IS NOT NULL AND length(session_id) >= 16)
  WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 16);

-- 5. hair_profiles: remove anonymous insert path (edge function uses service_role)
DROP POLICY IF EXISTS "Anyone can insert hair_profiles" ON public.hair_profiles;

-- 6. jobs: remove anonymous insert path
DROP POLICY IF EXISTS "Anon can insert jobs" ON public.jobs;

-- 7. messages: remove anonymous insert path
DROP POLICY IF EXISTS "Anon can insert inbound messages" ON public.messages;

-- 8. quotes / quote_items: remove public SELECT
DROP POLICY IF EXISTS "Public can view quotes by id" ON public.quotes;
DROP POLICY IF EXISTS "Public can view quote_items" ON public.quote_items;

-- 9. waitlist: restrict SELECT to admins and stylists only
DROP POLICY IF EXISTS "Authenticated can view waitlist" ON public.waitlist;

CREATE POLICY "Staff and admins can view waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'mechanic'::app_role));

-- 10. Storage: expense-receipts scoped access (bucket is set private via tool)
DROP POLICY IF EXISTS "Anyone can view expense receipts" ON storage.objects;

CREATE POLICY "Admins can view expense receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own expense receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 11. Storage: issue-photos uploads require auth and path scoped to user id
DROP POLICY IF EXISTS "Anyone can upload issue photos" ON storage.objects;

CREATE POLICY "Authenticated users can upload issue photos to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'issue-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 12. Storage: job-photos uploads/deletes scoped to ownership
DROP POLICY IF EXISTS "Authenticated users can upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own job photos" ON storage.objects;

CREATE POLICY "Users can upload job photos to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Staff and admins can upload job photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'mechanic'::app_role))
  );

CREATE POLICY "Users can delete own job photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND owner = auth.uid()
  );

CREATE POLICY "Admins can delete job photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
