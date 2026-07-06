
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
