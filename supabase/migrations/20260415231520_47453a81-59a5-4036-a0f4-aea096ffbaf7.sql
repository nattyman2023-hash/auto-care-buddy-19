
-- 1. Chairs table
CREATE TABLE public.chairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone text NOT NULL DEFAULT 'Barbershop',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access chairs" ON public.chairs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view chairs" ON public.chairs FOR SELECT TO authenticated USING (true);

-- 2. Cart items table
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  service_catalog_id uuid REFERENCES public.service_catalog(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage cart by session" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

-- 3. Add columns to service_catalog
ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_seasonal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text;

-- 4. Allow anonymous users to read service_catalog (for public services page)
CREATE POLICY "Public can read service_catalog" ON public.service_catalog FOR SELECT USING (true);
