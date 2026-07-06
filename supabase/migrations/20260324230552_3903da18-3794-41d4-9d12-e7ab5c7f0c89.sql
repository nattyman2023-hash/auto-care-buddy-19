-- Add signature column to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS signature text;

-- Create vehicle-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vehicle-photos bucket
CREATE POLICY "Anyone can view vehicle photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Authenticated users can upload vehicle photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-photos');

CREATE POLICY "Admins can delete vehicle photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'vehicle-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow customers to update their own invoices (for signature)
CREATE POLICY "Customers can update own invoice signature" ON public.invoices
  FOR UPDATE TO authenticated
  USING (job_id IN (SELECT jobs.id FROM jobs WHERE jobs.customer_id IN (SELECT customers.id FROM customers WHERE customers.user_id = auth.uid())))
  WITH CHECK (job_id IN (SELECT jobs.id FROM jobs WHERE jobs.customer_id IN (SELECT customers.id FROM customers WHERE customers.user_id = auth.uid())));