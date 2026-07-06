
CREATE TABLE IF NOT EXISTS public.booking_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  service_catalog_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  step int NOT NULL DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  reminder_sent_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert booking drafts" ON public.booking_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update booking drafts" ON public.booking_drafts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins read booking drafts" ON public.booking_drafts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_booking_drafts_lastseen ON public.booking_drafts(last_seen_at) WHERE completed = false AND reminder_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS public.cart_sessions (
  session_id text PRIMARY KEY,
  email text NOT NULL,
  name text,
  reminder_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone manage cart_sessions" ON public.cart_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_updated ON public.cart_sessions(updated_at);

CREATE TABLE IF NOT EXISTS public.email_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read dispatch_log" ON public.email_dispatch_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
