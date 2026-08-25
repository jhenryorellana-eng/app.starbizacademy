import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title,
    body,
    data,
  }));

  // Expo Push API supports batches of 100
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        console.error("Expo Push API error:", await response.text());
      }
    } catch (error) {
      console.error("Failed to send push batch:", error);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Authentication: two modes ---
    let source = "system";
    let miniAppId: string | null = null;
    let targetAppId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("X-Api-Key");

    if (apiKey) {
      // Mini-app auth via API key
      const keyHash = await hashKey(apiKey);
      const { data: keyRecord } = await supabaseAdmin
        .from("api_keys")
        .select("mini_app_id, target_app_id, is_active")
        .eq("key_hash", keyHash)
        .single();

      if (!keyRecord || !keyRecord.is_active) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      source = "miniapp";
      miniAppId = keyRecord.mini_app_id;
      targetAppId = keyRecord.target_app_id;
    } else if (authHeader) {
      // Supabase auth (Hub Central with service role or user token)
      const token = authHeader.replace("Bearer ", "");
      // Check if it's the service role key (Hub Central server-side calls)
      if (token === supabaseServiceKey) {
        source = "hub";
      } else {
        // Verify as user token
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        source = "hub";
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { profile_id, broadcast, type, title, message, data, skip_db_insert } = body;

    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, title, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Broadcast mode: send to ALL users of a target app ---
    if (broadcast) {
      const broadcastTarget = targetAppId || body.target_app_id;
      if (!broadcastTarget) {
        return new Response(
          JSON.stringify({ error: "Broadcast requires target_app_id (from API key or body)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all unique profile_ids with push tokens for this app
      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("push_tokens")
        .select("profile_id, token")
        .eq("app_id", broadcastTarget);

      if (tokensError) {
        console.error("Error fetching push tokens:", tokensError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch push tokens" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!tokens || tokens.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No registered devices" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get unique profile_ids for notification records
      const uniqueProfileIds = [...new Set(tokens.map((t) => t.profile_id))];

      // Insert notifications for all users (batch)
      const notificationRows = uniqueProfileIds.map((pid) => ({
        profile_id: pid,
        type,
        title,
        message,
        data: data || null,
        source,
        mini_app_id: miniAppId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert(notificationRows);

      if (insertError) {
        console.error("Error inserting broadcast notifications:", insertError);
      }

      // Send push to all tokens
      const pushTokens = tokens.map((t) => t.token);
      await sendExpoPush(pushTokens, title, message, {
        type,
        miniAppId,
        ...(data || {}),
      });

      return new Response(
        JSON.stringify({ success: true, sent: pushTokens.length, users: uniqueProfileIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Individual mode: send to a specific user ---
    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: profile_id (or use broadcast: true)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert notification into DB (skip if mini-app handles its own DB notifications)
    if (!skip_db_insert) {
      const { error: insertError } = await supabaseAdmin
        .from("notifications")
        .insert({
          profile_id,
          type,
          title,
          message,
          data: data || null,
          source,
          mini_app_id: miniAppId,
        });

      if (insertError) {
        console.error("Error inserting notification:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch push tokens for this user
    const { data: userTokens } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .eq("profile_id", profile_id);

    if (userTokens && userTokens.length > 0) {
      await sendExpoPush(
        userTokens.map((t) => t.token),
        title,
        message,
        { type, miniAppId, ...(data || {}) }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent: userTokens?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
