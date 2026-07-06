
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
