
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
