import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);
    const { data: { user: caller } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Forbidden" }, 403);

    const { email, full_name, phone, pay_rate, role } = await req.json();
    if (!email) return j({ error: "Email is required" }, 400);

    // Ensure auth user exists
    let userId: string;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + "Aa1!",
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createErr) {
      if (createErr.message.includes("already been registered")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
        if (!existing) return j({ error: "User exists but could not be found" }, 400);
        userId = existing.id;
      } else {
        return j({ error: createErr.message }, 400);
      }
    } else {
      userId = created.user.id;
    }

    // Ensure profile row exists (handle_new_user trigger should have done this, but be defensive)
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!existingProfile) {
      await admin.from("profiles").insert({
        user_id: userId,
        full_name: full_name || "",
        email,
        phone: phone || "",
        pay_rate: pay_rate || 0,
      });
    } else {
      await admin.from("profiles").update({
        full_name: full_name || undefined,
        phone: phone || "",
        pay_rate: pay_rate || 0,
      }).eq("user_id", userId);
    }

    // Set role (staff invitees default to 'mechanic' = stylist; admin if specified)
    const targetRole = role || "mechanic";
    const { data: existingRoles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const hasRole = (existingRoles ?? []).some((r: any) => r.role === targetRole);
    if (!hasRole) {
      await admin.from("user_roles").insert({ user_id: userId, role: targetRole });
    }

    // Generate recovery link + send branded portal-invite email
    const origin = req.headers.get("origin") || `https://${new URL(req.url).host.replace(/\.functions\.supabase\.co$/, ".lovable.app")}`;
    let inviteUrl = "";
    try {
      const { data: link } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${origin}/reset-password` },
      });
      inviteUrl = link?.properties?.action_link || "";
    } catch (e) {
      console.error("invite-employee: generateLink failed", e);
    }

    if (inviteUrl) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "portal-invite",
            recipientEmail: email,
            idempotencyKey: `staff-invite-${userId}`,
            templateData: { name: full_name || "", portalKind: "staff", inviteUrl },
          },
        });
      } catch (e) {
        console.error("invite-employee: email send failed", e);
      }
    }

    return j({ user_id: userId, email, invite_sent: !!inviteUrl }, 200);
  } catch (err) {
    console.error("invite-employee error", err);
    return j({ error: String(err) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
