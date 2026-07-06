ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'Unisex',
  ADD COLUMN IF NOT EXISTS featured_style boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;