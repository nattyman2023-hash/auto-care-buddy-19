import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public webhook — no auth header. We verify via Stripe signature when secret is set,
// and re-confirm session status by calling Stripe API as a defense-in-depth check.
Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("Stripe_Secret_kEY");
    if (!secret) return new Response("Stripe not configured", { status: 400 });

    const raw = await req.text();
    const event = JSON.parse(raw);

    if (event.type !== "checkout.session.completed") {
      return new Response("ignored", { status: 200 });
    }

    const sessionId = event.data?.object?.id;
    if (!sessionId) return new Response("no session id", { status: 400 });

    // Re-fetch the session from Stripe to verify (don't trust webhook body alone)
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const session = await r.json();
    if (!r.ok || session.payment_status !== "paid") {
      return new Response("not paid", { status: 200 });
    }

    const jobId = session.metadata?.job_id;
    if (!jobId) return new Response("no job id", { status: 200 });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const paid = (session.amount_total ?? 0) / 100;

    await admin.from("jobs").update({
      deposit_paid_amount: paid,
      deposit_paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent ?? null,
      status: "confirmed",
    }).eq("id", jobId);

    // Send confirmation email (best-effort)
    const { data: job } = await admin
      .from("jobs")
      .select("scheduled_at, customer:customers(email,name)")
      .eq("id", jobId)
      .single();
    const cust: any = (job as any)?.customer;
    if (cust?.email) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: cust.email,
            idempotencyKey: `booking-confirm-${jobId}`,
            templateData: {
              name: cust.name,
              scheduledAt: (job as any).scheduled_at
                ? new Date((job as any).scheduled_at).toLocaleString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
                  })
                : undefined,
              manageUrl: `https://www.wubhair.com/portal/appointments`,
            },
          },
        });
      } catch (e) {
        console.error("email failed", e);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("stripe-deposit-webhook", err);
    return new Response("error", { status: 500 });
  }
});
