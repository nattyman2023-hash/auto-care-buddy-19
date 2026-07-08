// Migrated off Supabase to a self-hosted Express + MySQL API (see server/).
// `apiClient` implements the same call shape (`.from().select().eq()...`,
// `.auth.*`, `.storage.*`, `.functions.invoke()`, `.channel()`) so every
// existing call site keeps working unchanged - see src/lib/apiClient.ts.
//
// Import the client like this (unchanged from before the migration):
// import { supabase } from "@/integrations/supabase/client";

import { apiClient } from '@/lib/apiClient';

export const supabase = apiClient as any;
