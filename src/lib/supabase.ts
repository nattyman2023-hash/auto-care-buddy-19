// Untyped Supabase helper - bypasses auto-generated types until they sync
import { supabase } from "@/integrations/supabase/client";

// Use `db` for all .from() / .storage / .channel() calls to avoid type errors
// Use `supabase` (re-exported) for .auth calls which are always typed
export const db = supabase as any;
export { supabase };