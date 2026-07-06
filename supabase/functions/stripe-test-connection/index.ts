import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const secret = Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("Stripe_Secret_kEY");
    if (!secret) return json({ ok: false, error: "STRIPE_SECRET_KEY not set" }, 200);

    const r = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const acc = await r.json();
    if (!r.ok) return json({ ok: false, error: acc?.error?.message || "Stripe rejected key" }, 200);
    return json({
      ok: true,
      accountName: acc.business_profile?.name || acc.settings?.dashboard?.display_name || acc.email || acc.id,
      livemode: !secret.startsWith("sk_test_"),
    });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 200);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
