import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer: customerInput,
      // accept both new and old keys for one release
      hair_profile,
      vehicle,
      job: jobInput,
      issue,
      fulfillment,
      deposit,
      addons,
    } = body;

    const hairProfileInput = hair_profile ?? vehicle ?? {};

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // 1. Customer
    let customerId: string;
    if (userId) {
      const { data: existing } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin.from("customers").update({
          name: customerInput.name,
          phone: customerInput.phone,
          email: customerInput.email,
          address: customerInput.address,
          postcode: customerInput.postcode,
        }).eq("id", existing.id);
        customerId = existing.id;
      } else {
        const { data: newCust, error: custErr } = await supabaseAdmin
          .from("customers").insert({ ...customerInput, user_id: userId })
          .select("id").single();
        if (custErr) { console.error("customer insert", custErr); throw new Error(custErr.message); }
        customerId = newCust.id;
      }
    } else {
      const { data: newCust, error: custErr } = await supabaseAdmin
        .from("customers").insert(customerInput).select("id").single();
      if (custErr) { console.error("customer insert", custErr); throw new Error(custErr.message); }
      customerId = newCust.id;
    }

    // 2. Hair profile (only if any field provided)
    let hairProfileId: string | null = null;
    const hasHairData = hairProfileInput.preference || hairProfileInput.texture || hairProfileInput.goal;
    if (hasHairData) {
      const { data: hp, error: hpErr } = await supabaseAdmin
        .from("hair_profiles")
        .insert({
          customer_id: customerId,
          preference: hairProfileInput.preference || "",
          texture: hairProfileInput.texture || "",
          goal: hairProfileInput.goal || "",
        })
        .select("id").single();
      if (hpErr) { console.error("hair_profile insert", hpErr); throw new Error(hpErr.message); }
      hairProfileId = hp.id;
    }

    // 3. Job
    const jobType = fulfillment?.method === "garage" ? "garage" : "mobile";
    const depositRequired = !!deposit?.required;
    const depositAmount = Number(deposit?.amount ?? 0);

    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .insert({
        customer_id: customerId,
        hair_profile_id: hairProfileId,
        type: jobType,
        service_type: jobInput.service_type,
        service_catalog_id: jobInput.service_catalog_id ?? null,
        scheduled_at: jobInput.scheduled_at,
        notes: jobInput.notes,
        urgency: jobInput.urgency,
        source: jobInput.source,
        deposit_required: depositRequired,
        deposit_amount: depositAmount,
      })
      .select("id").single();
    if (jobErr) { console.error("job insert", jobErr); throw new Error(jobErr.message); }

    // 3b. Persist selected service add-ons (server-side validated)
    if (Array.isArray(addons) && addons.length > 0 && jobInput.service_catalog_id) {
      const requestedIds = Array.from(
        new Set(
          addons
            .map((a: any) => a?.addon_service_id)
            .filter((id: any) => typeof id === "string" && id.length > 0),
        ),
      );

      if (requestedIds.length > 0) {
        // 1. Only addons explicitly linked to the chosen parent service are allowed
        const { data: linkRows } = await supabaseAdmin
          .from("service_addons")
          .select("addon_id, discount_pct")
          .eq("service_id", jobInput.service_catalog_id)
          .in("addon_id", requestedIds);
        const allowedMap = new Map<string, number>();
        for (const r of linkRows ?? []) {
          // 2. Clamp discount to 0–100; reject anything wild as 0
          const raw = Number((r as any).discount_pct ?? 0);
          const safeDiscount = Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 0;
          allowedMap.set((r as any).addon_id, safeDiscount);
        }

        const validIds = requestedIds.filter((id) => allowedMap.has(id));
        if (validIds.length > 0) {
          // 3. Re-fetch authoritative price/duration from the catalog — ignore client values
          const { data: catRows } = await supabaseAdmin
            .from("service_catalog")
            .select("id, base_price, sale_price, is_on_promo, duration_minutes")
            .in("id", validIds);

          const rows = (catRows ?? []).map((s: any) => {
            const list = s.is_on_promo && s.sale_price != null
              ? Number(s.sale_price)
              : Number(s.base_price ?? 0);
            const discount = allowedMap.get(s.id) ?? 0;
            const finalPrice = +(list * (1 - discount / 100)).toFixed(2);
            return {
              job_id: job.id,
              addon_service_id: s.id,
              price_snapshot: finalPrice,
              duration_minutes_snapshot: Number(s.duration_minutes ?? 0),
            };
          });
          if (rows.length) {
            const { error: addErr } = await supabaseAdmin.from("job_addons").insert(rows);
            if (addErr) console.error("job_addons insert", addErr);
          }
        }
      }
    }

    // 4. Issue submission
    if (issue?.description) {
      const { data: iss } = await supabaseAdmin
        .from("issue_submissions")
        .insert({
          customer_id: customerId,
          hair_profile_id: hairProfileId,
          description: issue.description,
        })
        .select("id").single();

      if (iss && issue.photo_paths?.length) {
        for (const path of issue.photo_paths) {
          await supabaseAdmin.from("issue_photos").insert({ issue_id: iss.id, storage_path: path });
        }
      }
    }

    // 5. Booking confirmation email (skip if deposit required — wait for paid)
    if (customerInput?.email && !depositRequired) {
      try {
        await supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: customerInput.email,
            idempotencyKey: `booking-confirm-${job.id}`,
            templateData: {
              name: customerInput.name,
              scheduledAt: jobInput.scheduled_at
                ? new Date(jobInput.scheduled_at).toLocaleString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
                  })
                : undefined,
              manageUrl: `https://www.wubhair.com/portal/appointments`,
            },
          },
        });
      } catch (e) {
        console.error("Failed to send booking confirmation", e);
      }
    }

    return new Response(
      JSON.stringify({ customer_id: customerId, hair_profile_id: hairProfileId, job_id: job.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-booking error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
