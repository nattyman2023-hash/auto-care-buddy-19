import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { job_id, amount, service_name } = await req.json();
    if (!job_id || !amount || amount <= 0) return j({ error: "Invalid payload" }, 400);

    const secret = Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("Stripe_Secret_kEY");
    if (!secret) return j({ error: "Stripe not configured. Ask admin to set STRIPE_SECRET_KEY." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: job } = await admin
      .from("jobs")
      .select("id, customer:customers(email,name)")
      .eq("id", job_id)
      .single();
    if (!job) return j({ error: "Job not found" }, 404);

    const origin = req.headers.get("origin") || "https://www.wubhair.com";
    const customerEmail = (job as any).customer?.email || undefined;
    const amountPence = Math.round(Number(amount) * 100);

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/booking?deposit=success&job=${job_id}`);
    params.append("cancel_url", `${origin}/booking?deposit=cancelled&job=${job_id}`);
    params.append("line_items[0][price_data][currency]", "gbp");
    params.append("line_items[0][price_data][product_data][name]", `Deposit — ${service_name || "Appointment"}`);
    params.append("line_items[0][price_data][unit_amount]", String(amountPence));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[job_id]", job_id);
    params.append("payment_intent_data[metadata][job_id]", job_id);
    if (customerEmail) params.append("customer_email", customerEmail);

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const session = await r.json();
    if (!r.ok) {
      console.error("Stripe error", session);
      return j({ error: session?.error?.message || "Stripe checkout failed" }, 400);
    }

    await admin.from("jobs").update({
      stripe_checkout_session_id: session.id,
    }).eq("id", job_id);

    return j({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("create-deposit-checkout", err);
    return j({ error: (err as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
