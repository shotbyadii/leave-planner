import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const DEFAULT_VAPID_PUBLIC_KEY = "BEjRlDDLNS_FxYWjYgT7nJGet-yvNYOc7V5-gB7qfRShZE0hfX22iHZOBhkSLk5cOELRRu7STSZgSMdHlbajDmA";
const DEFAULT_VAPID_PRIVATE_KEY = "CvnYFaTpHugswlHzwCNWFuMnCCbPZmmUpbBrPyzoLPU";
const DEFAULT_VAPID_SUBJECT = "mailto:support@leavevault.app";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || DEFAULT_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || DEFAULT_VAPID_PRIVATE_KEY;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || DEFAULT_VAPID_SUBJECT;

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (_) {
        body = {};
      }
    }

    const action = body.action || "test";

    if (action === "test") {
      const targetUserId = body.userId;
      let query = supabase.from("push_subscriptions").select("*");
      if (targetUserId) {
        query = query.eq("user_id", targetUserId);
      } else {
        query = query.order("created_at", { ascending: false }).limit(5);
      }

      const { data: subscriptions, error: subError } = await query;
      if (subError) throw subError;

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "No push subscriptions found to send test notification to. Make sure notifications are enabled in the app first."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testPayload = JSON.stringify({
        title: body.title || "Daily Attendance Check-in",
        body: body.body || "Web Push is working! You will receive background reminders on this device.",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: "test-notification-" + Date.now(),
        data: { url: "/?action=attendance" }
      });

      const results = [];
      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          const res = await webpush.sendNotification(pushSubscription, testPayload);
          results.push({ endpoint: sub.endpoint, status: res.statusCode || 201 });
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          results.push({ endpoint: sub.endpoint, error: err.message, status: err.statusCode });
        }
      }

      return new Response(
        JSON.stringify({ success: true, count: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send_attendance" || action === "cron_attendance") {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      // Fetch all subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("*");

      if (subError) throw subError;

      const sent = [];
      for (const sub of subscriptions || []) {
        if (sub.user_id) {
          const { data: existingLeaves } = await supabase
            .from("leaves")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("date", todayStr)
            .limit(1);

          if (existingLeaves && existingLeaves.length > 0) {
            continue;
          }
        }

        const payload = JSON.stringify({
          title: "Daily Attendance Check-in",
          body: "Good afternoon! Please confirm whether today is Work From Home or In-Office.",
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: `wfh-checkin-${todayStr}`,
          data: { url: "/?action=attendance" }
        });

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          const res = await webpush.sendNotification(pushSubscription, payload);
          sent.push({ endpoint: sub.endpoint, status: res.statusCode || 201 });
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          sent.push({ endpoint: sub.endpoint, error: err.message, status: err.statusCode });
        }
      }

      return new Response(
        JSON.stringify({ success: true, sentCount: sent.length, results: sent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
