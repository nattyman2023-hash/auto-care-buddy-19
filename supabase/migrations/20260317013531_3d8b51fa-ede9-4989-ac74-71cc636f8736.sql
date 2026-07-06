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