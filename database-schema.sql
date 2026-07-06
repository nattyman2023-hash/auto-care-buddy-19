-- Consolidated database schema from Supabase migrations
-- Generated for Hostinger migration
-- Number of migration files: 47

-- Migration 1: 20260316235820_cd4256cc-813f-474e-b0d7-4012f912929c.sql
-- ==================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  END IF;
  RETURN NEW;
END;
$function$;

-- Migration 2: 20260317003542_ac8768d4-78cd-49f8-8acc-2f11421601db.sql
-- ==================================================
-- Add started_at and completed_at to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add pay_rate and is_active to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pay_rate numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create job_notes table
CREATE TABLE IF NOT EXISTS public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access job_notes" ON public.job_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Mechanics can manage own job_notes" ON public.job_notes FOR ALL USING (has_role(auth.uid(), 'mechanic'::app_role) AND author_id = auth.uid());

-- Create trigger: when invoice status changes to 'paid', sync job status to 'paid'
CREATE OR REPLACE FUNCTION public.on_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.jobs SET status = 'paid' WHERE id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_status_sync
AFTER UPDATE ON public.invoices
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.on_invoice_status_change();

-- Migration 3: 20260317010416_a7873304-ddcf-4e28-8609-a034d6085f2f.sql
-- ==================================================
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

-- Migration 4: 20260317011232_44ce268a-985c-4590-82e9-76de1d3c2b6a.sql
-- ==================================================
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

-- Migration 5: 20260317013531_3d8b51fa-ede9-4989-ac74-71cc636f8736.sql
-- ==================================================
-- 1. Vehicle MOT & service tracking columns
ALTER TABLE public.vehicles ADD COLUMN mot_expiry date;
ALTER TABLE public.vehicles ADD COLUMN last_service_date date;
ALTER TABLE public.vehicles ADD COLUMN annual_service_required boolean DEFAULT false;

-- 2. Profile phone column
ALTER TABLE public.profiles ADD COLUMN phone text DEFAULT '';

-- 3. Customer vehicle management RLS (for portal)
CREATE POLICY "Customers can manage own vehicles" ON public.vehicles
FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- 4. Customer estimate update RLS (for approval)
CREATE POLICY "Customers can update own estimates" ON public.estimates
FOR UPDATE USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- 5. Admin delete profiles RLS
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Admin insert profiles RLS  - drop existing then recreate to include admin
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Migration 6: 20260317015149_7cf33286-44c7-4923-89f3-867004745a73.sql
-- ==================================================
-- Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  receipt_path text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS: Admins full access
CREATE POLICY "Admins full access expenses" ON public.expenses
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Employees can manage own expenses
CREATE POLICY "Users can manage own expenses" ON public.expenses
FOR ALL USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', true);

-- Storage RLS
CREATE POLICY "Admins full access expense receipts" ON storage.objects
FOR ALL USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can upload own expense receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view expense receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'expense-receipts');

-- Migration 7: 20260317075731_a3873325-eff8-4fd5-85f8-0f4db1a24299.sql
-- ==================================================
ALTER TABLE public.jobs ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly';
ALTER TABLE public.jobs ADD COLUMN pay_amount numeric DEFAULT NULL;

-- Migration 8: 20260317081041_d89039fe-aa9d-4515-97f6-bb465a6d3f48.sql
-- ==================================================
ALTER TABLE public.time_entries ALTER COLUMN job_id DROP NOT NULL;

-- Migration 9: 20260317090530_3d8fe661-b530-4855-8154-06695d8bfe74.sql
-- ==================================================
ALTER TABLE public.time_entries ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Migration 10: 20260318181531_297d1952-3d42-4849-a10e-953bb3cf10ee.sql
-- ==================================================
ALTER TABLE vehicles ADD COLUMN mileage integer;
ALTER TABLE jobs ADD COLUMN urgency text NOT NULL DEFAULT 'flexible';

-- Migration 11: 20260318193127_3c41db32-719d-4702-9e02-d5de1b799bfc.sql
-- ==================================================
ALTER TABLE public.jobs ADD COLUMN source text;

-- Migration 12: 20260318193652_1dfdf96d-1c9b-404c-9ad4-55a21cb8e3d0.sql
-- ==================================================
ALTER TABLE public.profiles ADD COLUMN skills text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN postcode text DEFAULT '';

-- Migration 13: 20260318195658_c39d9bed-0646-4f30-a36c-fb3dc71b95da.sql
-- ==================================================
-- Create site-images public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true);

-- Allow admins to upload/manage files
CREATE POLICY "Admins can manage site-images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- Allow public read access
CREATE POLICY "Public read site-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-images');

-- Migration 14: 20260318200815_0319ff50-08a1-491b-af3f-2497349a80bc.sql
-- ==================================================
-- Attach the handle_new_user trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile for existing user if missing
INSERT INTO public.profiles (user_id, full_name, email)
VALUES ('b8298e0a-8533-4299-8b8a-5a6743194ad9', '', 'natalinog2002@yahoo.com')
ON CONFLICT (user_id) DO NOTHING;

-- Insert admin role for existing user if missing
INSERT INTO public.user_roles (user_id, role)
VALUES ('b8298e0a-8533-4299-8b8a-5a6743194ad9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Allow public (unauthenticated) read on settings for site images
CREATE POLICY "Public can read settings"
ON public.settings
FOR SELECT
TO public
USING (true);

-- Migration 15: 20260318201431_8aad8126-7822-48fb-8005-f4c5ae228338.sql
-- ==================================================
-- Re-create trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Customers: authenticated users can SELECT their own row
CREATE POLICY "Customers can view own record"
ON public.customers FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Customers: authenticated users can INSERT with their own user_id
CREATE POLICY "Authenticated can insert own customer"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Migration 16: 20260318202107_138667c7-ffd3-49d4-8d0d-765cc30b1e7b.sql
-- ==================================================
-- Re-attach the signup trigger (the function already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Unique partial index: one customer record per signed-in user
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id_unique
  ON public.customers (user_id)
  WHERE user_id IS NOT NULL;

-- Migration 17: 20260319183051_bc839ca6-f46c-4b38-b21a-ded6855c0d80.sql
-- ==================================================
CREATE POLICY "Anon can insert messages"
ON public.messages
FOR INSERT
TO public
WITH CHECK (true);

-- Migration 18: 20260324215415_30853384-3071-436a-86a3-0a6605a13812.sql
-- ==================================================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  vrm text DEFAULT '',
  service_requested text DEFAULT '',
  source text NOT NULL DEFAULT 'Web',
  status text NOT NULL DEFAULT 'New',
  priority text NOT NULL DEFAULT 'Medium',
  ai_score integer NOT NULL DEFAULT 0,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  estimated_price numeric NOT NULL DEFAULT 0,
  parts_cost_estimate numeric NOT NULL DEFAULT 0,
  labor_estimate numeric NOT NULL DEFAULT 0,
  valid_until date,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Note',
  content text NOT NULL DEFAULT '',
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access leads" ON public.leads FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Mechanics can view assigned leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'mechanic') AND assigned_to = auth.uid());

CREATE POLICY "Admins full access quotes" ON public.quotes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can view quotes by id" ON public.quotes FOR SELECT TO public USING (true);

CREATE POLICY "Admins full access lead_interactions" ON public.lead_interactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Migration 19: 20260324221448_10cd5e82-0168-4dac-9342-60fc83df0be1.sql
-- ==================================================
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

-- Migration 20: 20260324230552_3903da18-3794-41d4-9d12-e7ab5c7f0c89.sql
-- ==================================================
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

-- Migration 21: 20260324232159_c5e04042-e10e-47d0-ba70-6eef08bc22e6.sql
-- ==================================================
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text;

-- Migration 22: 20260324234553_10e2d533-78d3-4cac-8c22-4802261d06a0.sql
-- ==================================================
ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_type_check;
ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_type_check CHECK (type IN ('labor', 'parts', 'misc', 'Labour', 'Parts', 'Misc'));

-- Migration 23: 20260325000445_86892259-afae-4845-a3b3-906ea401ef09.sql
-- ==================================================
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'archived';

-- Migration 24: 20260325002405_4c8ddc90-2a0f-499b-9d14-c20fc560dff7.sql
-- ==================================================
CREATE POLICY "Anon can insert leads"
ON public.leads FOR INSERT
WITH CHECK (true);

-- Migration 25: 20260325011758_134f0449-ca58-4edd-bcfa-05a63b3f8644.sql
-- ==================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Migration 26: 20260325143239_089b48b1-08fb-4aba-83ce-890feea571c3.sql
-- ==================================================
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 45;

-- Migration 27: 20260415231520_47453a81-59a5-4036-a0f4-aea096ffbaf7.sql
-- ==================================================
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

-- Migration 28: 20260415232210_36391952-5f8a-43ba-9e30-a0977d5ff82e.sql
-- ==================================================
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  quantity integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  image_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access inventory" ON public.inventory FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'waiting',
  estimated_wait_minutes integer DEFAULT 15,
  assigned_chair_id uuid REFERENCES public.chairs(id) ON DELETE SET NULL,
  notes text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access waitlist" ON public.waitlist FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can view waitlist" ON public.waitlist FOR SELECT TO authenticated USING (true);

-- Migration 29: 20260415233450_9547659a-5f3e-4010-8090-866179d483a7.sql
-- ==================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Migration 30: 20260415233510_683bf083-b714-4a68-b1be-1dffea52bbfb.sql
-- ==================================================
-- Update has_role to let super_admin pass all admin checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'super_admin'::app_role)
  )
$$;

-- Ensure leave_requests table exists (may have been created in prior attempt)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL DEFAULT 'Holiday',
  reason text,
  status text NOT NULL DEFAULT 'pending',
  decline_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies (IF NOT EXISTS not supported for policies, so use DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view own leave requests' AND tablename = 'leave_requests') THEN
    CREATE POLICY "Staff can view own leave requests" ON public.leave_requests FOR SELECT TO authenticated USING (staff_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can insert own leave requests' AND tablename = 'leave_requests') THEN
    CREATE POLICY "Staff can insert own leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (staff_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins full access leave_requests' AND tablename = 'leave_requests') THEN
    CREATE POLICY "Admins full access leave_requests" ON public.leave_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leave_requests_updated_at') THEN
    CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Migration 31: 20260416075505_3e4d8dda-b408-424a-b074-68e7f1cc2f60.sql
-- ==================================================
ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'Unisex',
  ADD COLUMN IF NOT EXISTS featured_style boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Migration 32: 20260416082837_b3d14000-2b32-45ab-982d-ea8de6892374.sql
-- ==================================================
ALTER TABLE public.service_catalog
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upsell_product_id uuid DEFAULT NULL;

-- Migration 33: 20260416100416_1c7f7362-6f35-4f61-9326-34c6b8fe305c.sql
-- ==================================================
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  compare_at_price NUMERIC,
  category TEXT NOT NULL DEFAULT 'Hair Care',
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admins full access products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  customer_id UUID REFERENCES public.customers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC NOT NULL DEFAULT 0,
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access orders" ON public.orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins full access order_items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Migration 34: 20260416102852_e3bcd7c9-9113-4b12-9f1c-eaccf1c30b14.sql
-- ==================================================
INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), email
FROM auth.users WHERE email = 'natalinog2002@yahoo.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users WHERE email = 'natalinog2002@yahoo.com'
ON CONFLICT DO NOTHING;

-- Migration 35: 20260511120451_9b2d53a7-fb86-4049-9a9f-cba16e903bc7.sql
-- ==================================================
UPDATE public.products SET image_url='/product-placeholder.jpg' WHERE image_url='/src/assets/product-placeholder.jpg';

-- Migration 36: 20260511131632_d8d5cb94-4b0e-4880-8d52-40c4c38179a9.sql
-- ==================================================
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

-- Migration 37: 20260511200123_8d1805ed-4b6c-46b9-8349-bede67e20395.sql
-- ==================================================
-- Add bookable column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bookable boolean NOT NULL DEFAULT true;

-- Promote natalinog2002@yahoo.com to super_admin
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT user_id INTO uid FROM public.profiles WHERE email = 'natalinog2002@yahoo.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'super_admin');
  END IF;
END $$;

-- Function to recompute bookable: super_admins are not bookable
CREATE OR REPLACE FUNCTION public.recompute_profile_bookable(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET bookable = NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
  WHERE user_id = _user_id;
END;
$$;

-- Trigger on user_roles
CREATE OR REPLACE FUNCTION public.trg_user_roles_bookable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_profile_bookable(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_profile_bookable(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_bookable_trigger ON public.user_roles;
CREATE TRIGGER user_roles_bookable_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.trg_user_roles_bookable();

-- Backfill all existing profiles
UPDATE public.profiles p
SET bookable = NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role = 'super_admin'
);

-- Migration 38: 20260511200510_654faa6d-7cd3-4811-8f2a-967378f1a4e6.sql
-- ==================================================
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS chair_id uuid REFERENCES public.chairs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_chair_id ON public.jobs(chair_id);

-- Migration 39: 20260511201518_email_infra.sql
-- ==================================================
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');

-- Migration 40: 20260511201846_1e579f56-96c4-4fa9-a1d1-1456077afe32.sql
-- ==================================================
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

-- Migration 41: 20260511212229_4028275c-fb2f-459f-b588-fe7a8a9134c4.sql
-- ==================================================
-- Rename table
ALTER TABLE public.vehicles RENAME TO hair_profiles;

-- Rename columns
ALTER TABLE public.hair_profiles RENAME COLUMN vrm TO preference;
ALTER TABLE public.hair_profiles RENAME COLUMN make TO texture;
ALTER TABLE public.hair_profiles RENAME COLUMN model TO goal;

-- Drop unused car-only columns
ALTER TABLE public.hair_profiles
  DROP COLUMN IF EXISTS mot_expiry,
  DROP COLUMN IF EXISTS last_mot,
  DROP COLUMN IF EXISTS mileage,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS annual_service_required,
  DROP COLUMN IF EXISTS last_service_date;

-- Rename FK columns on dependent tables
ALTER TABLE public.jobs RENAME COLUMN vehicle_id TO hair_profile_id;
ALTER TABLE public.issue_submissions RENAME COLUMN vehicle_id TO hair_profile_id;

-- Drop leads.vrm
ALTER TABLE public.leads DROP COLUMN IF EXISTS vrm;

-- Recreate RLS policies on renamed table (drop old, create new with cleaner names)
DROP POLICY IF EXISTS "Admins full access vehicles" ON public.hair_profiles;
DROP POLICY IF EXISTS "Anon can insert vehicles" ON public.hair_profiles;
DROP POLICY IF EXISTS "Customers can manage own vehicles" ON public.hair_profiles;
DROP POLICY IF EXISTS "Customers can view own vehicles" ON public.hair_profiles;
DROP POLICY IF EXISTS "Mechanics can view vehicles" ON public.hair_profiles;

CREATE POLICY "Admins full access hair_profiles"
  ON public.hair_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert hair_profiles"
  ON public.hair_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Customers can manage own hair_profiles"
  ON public.hair_profiles FOR ALL
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Staff can view hair_profiles"
  ON public.hair_profiles FOR SELECT
  USING (has_role(auth.uid(), 'mechanic'::app_role));

-- Migration 42: 20260511213445_9a953f94-46b8-4c8d-80e9-8cf4ac0936f0.sql
-- ==================================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS jobs_stripe_session_idx ON public.jobs(stripe_checkout_session_id);

-- Migration 43: 20260511215442_9ced414d-6c35-4c9a-b38f-02cdfc533f2a.sql
-- ==================================================
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

-- Migration 44: 20260511222642_d6ff7dcc-ee83-4720-866c-8452283aa986.sql
-- ==================================================
CREATE TABLE public.service_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  addon_id uuid NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, addon_id),
  CHECK (service_id <> addon_id)
);

CREATE INDEX idx_service_addons_service ON public.service_addons(service_id);

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read service_addons"
  ON public.service_addons FOR SELECT USING (true);

CREATE POLICY "Admins manage service_addons"
  ON public.service_addons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.job_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  addon_service_id uuid NOT NULL,
  price_snapshot numeric NOT NULL DEFAULT 0,
  duration_minutes_snapshot int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_addons_job ON public.job_addons(job_id);

ALTER TABLE public.job_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access job_addons"
  ON public.job_addons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can insert job_addons"
  ON public.job_addons FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view own job_addons"
  ON public.job_addons FOR SELECT
  USING (job_id IN (
    SELECT j.id FROM public.jobs j
    JOIN public.customers c ON c.id = j.customer_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Mechanics can view assigned job_addons"
  ON public.job_addons FOR SELECT
  USING (has_role(auth.uid(), 'mechanic'::app_role) AND job_id IN (
    SELECT id FROM public.jobs WHERE assigned_to = auth.uid()
  ));

-- Migration 45: 20260511223740_65637bf2-1d65-47d6-82d7-bc0bfc47f620.sql
-- ==================================================
-- 1. Fix search_path on email queue functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END;
$$;

-- 2. Revoke EXECUTE from anon/authenticated on queue helpers (service role keeps it)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 3. Tighten overly permissive RLS policies

-- booking_drafts: only allow updates to drafts that are not completed and recent
DROP POLICY IF EXISTS "Anyone can update booking drafts" ON public.booking_drafts;
CREATE POLICY "Anyone can update active booking drafts" ON public.booking_drafts
FOR UPDATE TO public
USING (completed = false AND last_seen_at > now() - interval '24 hours')
WITH CHECK (completed = false);

DROP POLICY IF EXISTS "Anyone can insert booking drafts" ON public.booking_drafts;
CREATE POLICY "Anyone can insert booking drafts" ON public.booking_drafts
FOR INSERT TO public
WITH CHECK (completed = false AND email IS NOT NULL AND length(email) <= 255);

-- cart_items / cart_sessions: require non-empty session_id
DROP POLICY IF EXISTS "Anyone can manage cart by session" ON public.cart_items;
CREATE POLICY "Cart items by session" ON public.cart_items
FOR ALL TO public
USING (session_id IS NOT NULL AND length(session_id) > 0)
WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0 AND quantity > 0 AND quantity <= 50);

DROP POLICY IF EXISTS "Anyone manage cart_sessions" ON public.cart_sessions;
CREATE POLICY "Cart sessions by id" ON public.cart_sessions
FOR ALL TO public
USING (session_id IS NOT NULL AND length(session_id) > 0)
WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0 AND email IS NOT NULL AND length(email) <= 255);

-- customers: anon insert only when no user_id (server attaches it later)
DROP POLICY IF EXISTS "Anon can insert customers" ON public.customers;
CREATE POLICY "Anon can insert customers" ON public.customers
FOR INSERT TO public
WITH CHECK (user_id IS NULL AND name IS NOT NULL AND length(name) BETWEEN 1 AND 200);

-- hair_profiles: anon insert only with required fields
DROP POLICY IF EXISTS "Anyone can insert hair_profiles" ON public.hair_profiles;
CREATE POLICY "Anyone can insert hair_profiles" ON public.hair_profiles
FOR INSERT TO public
WITH CHECK (customer_id IS NOT NULL);

-- jobs: anon insert only with safe defaults
DROP POLICY IF EXISTS "Anon can insert jobs" ON public.jobs;
CREATE POLICY "Anon can insert jobs" ON public.jobs
FOR INSERT TO public
WITH CHECK (
  customer_id IS NOT NULL
  AND status = 'pending'::job_status
  AND assigned_to IS NULL
  AND deposit_paid_amount = 0
);

-- leads: anon insert only with safe defaults
DROP POLICY IF EXISTS "Anon can insert leads" ON public.leads;
CREATE POLICY "Anon can insert leads" ON public.leads
FOR INSERT TO public
WITH CHECK (
  name IS NOT NULL AND length(name) BETWEEN 1 AND 200
  AND status = 'New'
  AND assigned_to IS NULL
  AND ai_score = 0
);

-- messages: only inbound from anon, or admin
DROP POLICY IF EXISTS "Anon can insert messages" ON public.messages;
CREATE POLICY "Anon can insert inbound messages" ON public.messages
FOR INSERT TO public
WITH CHECK (
  customer_id IS NOT NULL
  AND direction = 'inbound'::message_direction
  AND length(content) BETWEEN 1 AND 5000
);

-- waitlist
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
FOR INSERT TO public
WITH CHECK (
  client_name IS NOT NULL AND length(client_name) BETWEEN 1 AND 200
  AND status = 'waiting'
);

-- job_addons: drop anon insert; only edge function (service role) writes
DROP POLICY IF EXISTS "Anon can insert job_addons" ON public.job_addons;

-- 4. Multi-zone chairs
ALTER TABLE public.chairs ADD COLUMN IF NOT EXISTS zones text[] NOT NULL DEFAULT ARRAY['Barbershop']::text[];
UPDATE public.chairs SET zones = ARRAY[zone] WHERE zones = ARRAY['Barbershop']::text[] AND zone IS NOT NULL AND zone <> 'Barbershop';
CREATE INDEX IF NOT EXISTS chairs_zones_gin ON public.chairs USING GIN (zones);

-- 5. Make sure super_admin profiles are not bookable (board cleanup)
UPDATE public.profiles p
SET bookable = false
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role = 'super_admin'::app_role
);

-- Migration 46: 20260626091529_0269420a-1b4c-4137-99ba-1e1fefbadcf9.sql
-- ==================================================
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

-- Migration 47: 20260626091554_cf97d5bf-ac78-4813-8c82-c19e2d464f32.sql
-- ==================================================
DROP POLICY IF EXISTS "Anyone can view issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read site-images" ON storage.objects;

