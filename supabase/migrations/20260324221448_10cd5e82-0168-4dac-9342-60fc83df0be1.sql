-- Create quote_items table for line-item granularity
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'labor',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access quote_items" ON public.quote_items
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view quote_items by quote (for shareable quote links)
CREATE POLICY "Public can view quote_items" ON public.quote_items
  FOR SELECT TO public USING (true);

-- Add location_type and estimated_date to quotes
ALTER TABLE public.quotes ADD COLUMN location_type text NOT NULL DEFAULT 'garage';
ALTER TABLE public.quotes ADD COLUMN estimated_date date;

-- Add signature column to invoices
ALTER TABLE public.invoices ADD COLUMN signature text;