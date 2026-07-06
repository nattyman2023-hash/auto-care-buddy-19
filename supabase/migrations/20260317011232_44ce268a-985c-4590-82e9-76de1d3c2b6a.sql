
-- Add user_id to customers to link customer accounts
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Issue submissions table
CREATE TABLE IF NOT EXISTS public.issue_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.issue_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access issue_submissions" ON public.issue_submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers can view own issues" ON public.issue_submissions FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can insert own issues" ON public.issue_submissions FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

-- Issue photos table
CREATE TABLE IF NOT EXISTS public.issue_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issue_submissions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.issue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access issue_photos" ON public.issue_photos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers can view own issue_photos" ON public.issue_photos FOR SELECT USING (
  issue_id IN (SELECT id FROM public.issue_submissions WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
);
CREATE POLICY "Customers can insert own issue_photos" ON public.issue_photos FOR INSERT WITH CHECK (
  issue_id IN (SELECT id FROM public.issue_submissions WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
);

-- Time entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  mechanic_id uuid NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access time_entries" ON public.time_entries FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mechanics can manage own time_entries" ON public.time_entries FOR ALL USING (mechanic_id = auth.uid());

-- Swap requests table
CREATE TABLE IF NOT EXISTS public.swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  from_mechanic_id uuid NOT NULL,
  to_mechanic_id uuid,
  status text NOT NULL DEFAULT 'pending',
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access swap_requests" ON public.swap_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mechanics can view own swap_requests" ON public.swap_requests FOR SELECT USING (from_mechanic_id = auth.uid() OR to_mechanic_id = auth.uid());
CREATE POLICY "Mechanics can insert swap_requests" ON public.swap_requests FOR INSERT WITH CHECK (from_mechanic_id = auth.uid());

-- Service catalog table
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0,
  estimated_hours numeric DEFAULT 1,
  category text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access service_catalog" ON public.service_catalog FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "All authenticated can read service_catalog" ON public.service_catalog FOR SELECT TO authenticated USING (true);

-- Estimates table
CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  labor_hours numeric DEFAULT 0,
  labor_rate numeric DEFAULT 0,
  travel_cost numeric DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  vat numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access estimates" ON public.estimates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customers can view own estimates" ON public.estimates FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

-- Customer RLS for jobs, invoices, messages
CREATE POLICY "Customers can view own jobs" ON public.jobs FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can view own invoices" ON public.invoices FOR SELECT USING (
  job_id IN (SELECT id FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
);
CREATE POLICY "Customers can view own messages" ON public.messages FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can view own vehicles" ON public.vehicles FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can view own job_photos" ON public.job_photos FOR SELECT USING (
  visible_to_customer = true AND job_id IN (SELECT id FROM public.jobs WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
);

-- Issue photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-photos', 'issue-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS for issue-photos bucket
CREATE POLICY "Anyone can upload issue photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-photos');
CREATE POLICY "Anyone can view issue photos" ON storage.objects FOR SELECT USING (bucket_id = 'issue-photos');

-- Admin can update profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
