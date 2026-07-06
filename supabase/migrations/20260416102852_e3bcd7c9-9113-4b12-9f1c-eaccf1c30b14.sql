INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), email
FROM auth.users WHERE email = 'natalinog2002@yahoo.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users WHERE email = 'natalinog2002@yahoo.com'
ON CONFLICT DO NOTHING;