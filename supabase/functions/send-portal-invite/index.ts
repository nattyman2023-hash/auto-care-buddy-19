// Sends a branded portal-invite email. Admin-only.
// Generates a password-recovery link for the recipient (creating an auth user
// if needed) and emails it via the branded "portal-invite" template.
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
    if (!authHeader) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user: caller } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Admin only" }, 403);

    const { email, name, portalKind, redirectTo } = await req.json();
    if (!email) return j({ error: "email required" }, 400);
    const kind = portalKind === "staff" ? "staff" : "client";
    const target = redirectTo || `${new URL(req.url).origin.replace(/\.functions\.supabase\.co$/, "")}/reset-password`;

    // Ensure auth user exists
    const { data: list } = await admin.auth.admin.listUsers();
    let existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (!existing) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + "Aa1!",
        user_metadata: { full_name: name || "" },
      });
      if (error) return j({ error: error.message }, 400);
      existing = created.user as any;
      if (kind === "client") {
        await admin.from("user_roles").insert({ user_id: existing!.id, role: "customer" }).select();
      }
    }

    // Generate a recovery link the user clicks to set password
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: target },
    });
    if (linkErr || !link?.properties?.action_link) {
      return j({ error: linkErr?.message || "Could not create invite link" }, 400);
    }

    // Send the branded portal-invite email (best-effort)
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "portal-invite",
          recipientEmail: email,
          idempotencyKey: `portal-invite-${kind}-${existing!.id}-${Date.now()}`,
          templateData: { name, portalKind: kind, inviteUrl: link.properties.action_link },
        },
      });
    } catch (e) {
      console.error("portal-invite email send failed", e);
    }

    return j({ ok: true });
  } catch (err) {
    console.error("send-portal-invite", err);
    return j({ error: (err as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
