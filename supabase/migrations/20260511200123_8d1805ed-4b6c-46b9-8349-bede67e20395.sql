
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
