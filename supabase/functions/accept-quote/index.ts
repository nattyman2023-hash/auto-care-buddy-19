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
    const { quote_id } = await req.json();
    if (!quote_id) {
      return new Response(JSON.stringify({ error: "quote_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch quote + lead
    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("*, lead:leads(*)")
      .eq("id", quote_id)
      .single();

    if (qErr || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quote.status === "Accepted") {
      return new Response(JSON.stringify({ error: "Quote already accepted" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead = quote.lead;

    // Create customer
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        name: lead.name,
        phone: lead.phone || "",
        email: lead.email || "",
      })
      .select("id")
      .single();

    if (custErr) throw custErr;

    // Create job (no hair profile auto-create from quote)
    await supabase.from("jobs").insert({
      customer_id: customer.id,
      hair_profile_id: null,
      notes: lead.service_requested || "",
      source: `Quote Accepted - ${lead.source}`,
      type: quote.location_type === "mobile" ? "mobile" : "garage",
    });

    // Update quote and lead status
    await supabase.from("quotes").update({ status: "Accepted" }).eq("id", quote_id);
    await supabase.from("leads").update({ status: "Converted" }).eq("id", lead.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
