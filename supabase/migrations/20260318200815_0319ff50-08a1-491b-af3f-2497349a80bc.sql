
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
