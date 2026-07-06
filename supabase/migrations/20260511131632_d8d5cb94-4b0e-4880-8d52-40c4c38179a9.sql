
-- Promo fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_on_promo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric;

-- Promo fields on service_catalog
ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS is_on_promo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric;

-- Waitlist enhancements
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS service_catalog_id uuid,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Guest manage-booking token on jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS manage_token text;

CREATE INDEX IF NOT EXISTS idx_jobs_manage_token ON public.jobs (manage_token);

-- Enable realtime
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.waitlist REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'waitlist'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist';
  END IF;
END $$;
