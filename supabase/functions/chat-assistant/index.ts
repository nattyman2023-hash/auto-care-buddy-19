// Salon chat assistant — replies via Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Selam, a warm and concise virtual receptionist for Wub Hair (Selam Unisex Salon) at 174 Claremont Road, Manchester M14 4TT.

You help with: services (barbering, hairdressing, braiding, treatments), pricing ranges, booking guidance, opening hours (Mon–Sat ~9am–7pm), location/parking, and product/aftercare advice.

Rules:
- Be brief: 1-3 short sentences. No long lists.
- Always offer to either book online (link: /book) or chat on WhatsApp for anything specific.
- Never invent precise prices for braiding (varies). Quote rough ranges only and recommend booking a free consult.
- If the user wants to book, encourage them to use the booking page.
- Never ask for sensitive info (card, password). Don't promise refunds — defer to staff.
- Use a friendly, modern Manchester salon tone. No emojis except occasionally a ✂️ or ✨.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    // Validate
    const sanitized = messages
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-12); // cap context

    if (sanitized.length === 0) {
      return new Response(JSON.stringify({ error: "No messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitized],
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "Busy right now — try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "Chat credits exhausted. Try WhatsApp instead." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("ai gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "Chat unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Sorry, I didn't catch that.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("chat-assistant error", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
