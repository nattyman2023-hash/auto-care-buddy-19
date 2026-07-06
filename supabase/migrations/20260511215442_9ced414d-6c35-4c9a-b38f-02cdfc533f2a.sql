-- 1) Link appointments to a service for proper duration/price/name display
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS service_catalog_id uuid REFERENCES public.service_catalog(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_service_catalog_id ON public.jobs(service_catalog_id);

-- 2) Booking progress marker (in-chair, halfway, done) without disturbing main status enum
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS progress text;
-- nullable on purpose; valid values handled in app code: 'in_chair' | 'halfway' | 'done'

-- 3) Allow admins to deliberately overlap chair bookings (e.g. squeeze-in)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS allow_overlap boolean NOT NULL DEFAULT false;

-- 4) Make 10% default deposit easier to enforce: per-service flag default true
ALTER TABLE public.service_catalog
  ALTER COLUMN deposit_required SET DEFAULT true;
UPDATE public.service_catalog SET deposit_required = true WHERE deposit_required = false;

-- 5) Site-wide settings row for deposit policy (admins can flip)
INSERT INTO public.settings(key, value)
VALUES ('deposit_default_percent', '10')
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings(key, value)
VALUES ('deposit_default_enabled', 'true')
ON CONFLICT (key) DO NOTHING;