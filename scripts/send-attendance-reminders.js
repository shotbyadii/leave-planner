import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@leavevault.app';

if (!SUPABASE_URL || !SUPABASE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing required environment variables in .env.local:');
  console.error({
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_KEY: !!SUPABASE_KEY,
    VAPID_PUBLIC_KEY: !!VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: !!VAPID_PRIVATE_KEY
  });
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('--- Attendance Push Notification Dispatcher ---');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.error('Failed to load subscriptions:', error);
    process.exit(1);
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No registered push subscriptions found.');
    return;
  }

  console.log(`Found ${subscriptions.length} push subscription(s). Dispatching reminders...`);

  let successCount = 0;
  for (const sub of subscriptions) {
    // Check if user already booked today
    if (sub.user_id) {
      const { data: leaves } = await supabase
        .from('leaves')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('date', todayStr)
        .limit(1);

      if (leaves && leaves.length > 0) {
        console.log(`User ${sub.user_id} already recorded attendance for today (${todayStr}). Skipping.`);
        continue;
      }
    }

    const payload = JSON.stringify({
      title: 'Daily Attendance Check-in',
      body: 'Good day! Please confirm if today is Work From Home or In-Office.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `wfh-checkin-${todayStr}`,
      data: { url: '/?action=attendance' }
    });

    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }, payload);

      console.log(`Successfully sent push to endpoint: ${sub.endpoint.slice(0, 45)}...`);
      successCount++;
    } catch (err) {
      console.warn(`Failed push to ${sub.endpoint.slice(0, 45)}... Status: ${err.statusCode || 'ERR'}`);
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log('Subscription expired/unregistered. Removing from database...');
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  console.log(`--- Done! Sent ${successCount} notification(s) ---`);
}

run().catch(console.error);
