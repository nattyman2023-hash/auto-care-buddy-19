
-- Re-attach the signup trigger (the function already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Unique partial index: one customer record per signed-in user
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id_unique
  ON public.customers (user_id)
  WHERE user_id IS NOT NULL;
