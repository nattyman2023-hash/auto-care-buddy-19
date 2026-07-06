-- Settings table for VAT toggle and other config
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access settings" ON public.settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "All authenticated can read settings" ON public.settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.settings (key, value) VALUES ('vat_registered', 'false') ON CONFLICT (key) DO NOTHING;

-- Add photo_type and visible_to_customer to job_photos
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS photo_type text DEFAULT 'documentation';
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS visible_to_customer boolean DEFAULT false;