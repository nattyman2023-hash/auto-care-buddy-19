import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { cancelled_slot_time, service_type, stylist_id } = await req.json();

    if (!cancelled_slot_time) {
      return new Response(
        JSON.stringify({ error: "cancelled_slot_time is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find waitlist entries that are still waiting
    const { data: waitlist } = await supabase
      .from("waitlist")
      .select("id, client_name, phone, customer_id, notes")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(3);

    if (!waitlist || waitlist.length === 0) {
      return new Response(
        JSON.stringify({ message: "No waitlist entries found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark these waitlist entries as "notified"
    const notifiedIds = waitlist.map((w: any) => w.id);
    await supabase
      .from("waitlist")
      .update({ status: "notified" })
      .in("id", notifiedIds);

    // Log the notification for admin visibility
    const slotDate = new Date(cancelled_slot_time);
    const formattedTime = slotDate.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create messages for each notified person
    for (const entry of waitlist) {
      if (entry.customer_id) {
        await supabase.from("messages").insert({
          customer_id: entry.customer_id,
          direction: "outbound",
          content: `A rare slot has just opened up on ${formattedTime}! Reply or call to grab it before it's gone.`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Notified ${waitlist.length} waitlist entries`,
        notified: waitlist.length,
        entries: waitlist.map((w: any) => ({
          name: w.client_name,
          phone: w.phone,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
