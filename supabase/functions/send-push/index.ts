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
        query = query.or(`user_id.eq.${targetUserId},user_id.is.null`);
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
        title: body.title || "Leave Vault",
        body: body.body || "Daily Attendance Check-in: Web Push is working! You will receive background reminders on this device.",
        icon: "/app-icon-192.png",
        badge: "/app-icon-192.png",
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

    if (action === "send_attendance" || action === "cron_attendance" || action === "send_reminder" || action === "hourly_check") {
      const now = new Date();
      const forceAll = body.force === true || action === "send_attendance" || action === "send_reminder";
      const forceReminder = action === "send_reminder" || Boolean(body.isReminder);

      // Fetch all subscriptions with linked user profile preferences
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("*, profiles:user_id(wfh_prompt_hour, timezone)");

      if (subError) throw subError;

      const sent = [];
      for (const sub of subscriptions || []) {
        const userProfile = sub.profiles || {};
        const userTz = sub.timezone || userProfile.timezone || "Asia/Kolkata";

        let localHour = 12;
        let localDateStr = now.toISOString().split("T")[0];
        let isWeekend = false;

        try {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: userTz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "numeric",
            hourCycle: "h23",
            weekday: "short"
          });
          const parts = formatter.formatToParts(now);
          const partMap: Record<string, string> = {};
          parts.forEach(p => { partMap[p.type] = p.value; });

          localHour = parseInt(partMap.hour, 10);
          localDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
          if (partMap.weekday === "Sat" || partMap.weekday === "Sun") {
            isWeekend = true;
          }
        } catch (_) {}

        if (!forceAll && isWeekend) {
          continue; // Weekend in user's timezone: skip attendance checks
        }

        // User's configured preferred prompt hour (defaults to 12 PM if unset)
        const targetHour = parseInt(userProfile.wfh_prompt_hour || "12", 10);
        // User's offset reminder hour: 3 hours after requested time, capped at 19 (7 PM)
        const reminderHour = Math.min(19, targetHour + 3);

        const isPromptWindow = forceAll || (localHour === targetHour);
        const isReminderWindow = forceReminder || (!forceAll && localHour === reminderHour);

        if (!isPromptWindow && !isReminderWindow) {
          // Neither the user's prompt hour nor reminder hour: skip!
          continue;
        }

        const isReminder = forceReminder || isReminderWindow;

        // Dedup check: Ensure we don't repeat the same notification type on the same date
        if (!forceAll) {
          if (!isReminder && sub.last_prompt_date === localDateStr) {
            continue; // Already prompted today!
          }
          if (isReminder && sub.last_reminder_date === localDateStr) {
            continue; // Already reminded today!
          }
        }

        // Check if user already booked attendance today in leaves table
        if (sub.user_id) {
          const { data: existingLeaves } = await supabase
            .from("leaves")
            .select("id")
            .eq("user_id", sub.user_id)
            .eq("date", localDateStr)
            .limit(1);

          if (existingLeaves && existingLeaves.length > 0) {
            continue; // Attendance already recorded for today!
          }
        }

        const title = isReminder ? "Attendance Reminder" : "Attendance Check-in";
        const bodyText = isReminder
          ? "Still haven't logged attendance for today. Are you Working From Home or In-Office?"
          : "Where are you working today? Tap to record attendance.";

        const payload = JSON.stringify({
          title,
          body: bodyText,
          icon: "/app-icon-192.png",
          badge: "/app-icon-192.png",
          tag: isReminder ? `wfh-reminder-${localDateStr}` : `wfh-checkin-${localDateStr}`,
          data: { url: `/?action=attendance&date=${localDateStr}`, date: localDateStr }
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
          sent.push({
            endpoint: sub.endpoint,
            user_id: sub.user_id,
            status: res.statusCode || 201,
            localHour,
            targetHour,
            reminderHour,
            type: isReminder ? 'reminder' : 'prompt'
          });

          // Mark date sent in database for idempotency
          const updateField = isReminder ? { last_reminder_date: localDateStr } : { last_prompt_date: localDateStr };
          await supabase.from("push_subscriptions").update(updateField).eq("id", sub.id);
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          sent.push({ endpoint: sub.endpoint, error: err.message, status: err.statusCode });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: subscriptions?.length || 0,
          sentCount: sent.length,
          results: sent
        }),
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
