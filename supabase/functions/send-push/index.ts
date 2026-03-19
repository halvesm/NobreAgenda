import webpush from "npm:web-push@3.6.7";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Webhook payload received:", payload);
    
    // The payload.record contains the actual inserted row from `notifications`
    const notif = payload.record;
    if (!notif) throw new Error("No record found in payload");

    const userId = notif.user_id;

    // Supabase admin client to read subscriptions bypassing RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch subscriptions for this user
    const { data: subs, error } = await supabaseClient
      .from('web_push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subs || subs.length === 0) {
      console.log(`No active push subscriptions found for user ${userId}`);
      return new Response(JSON.stringify({ success: true, message: "No subscriptions" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Configure VAPID Keys
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublic || !vapidPrivate) {
      console.error("Missing VAPID keys in environment variables");
      throw new Error("Missing VAPID keys");
    }

    webpush.setVapidDetails(
      'mailto:suporte@nobreagenda.com', // Remetente fictício ou real
      vapidPublic,
      vapidPrivate
    );

    const pushPayload = JSON.stringify({
      title: notif.title,
      body: notif.message,
      icon: '/pwa-icon.png',
      badge: '/pwa-icon.png',
      data: {
        url: notif.booking_id ? `/booking/${notif.booking_id}` : '/'
      }
    });

    const sendPromises = subs.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(pushSubscription, pushPayload);
        console.log(`Successfully sent push to endpoint: ${sub.endpoint}`);
      } catch (err: any) {
        const statusCode = err.statusCode ?? err.status ?? 'unknown';
        console.error(`Failed to send to ${sub.endpoint} | Status: ${statusCode} | Body: ${JSON.stringify(err.body ?? err.message)}`);
        // Apaga assinaturas expiradas/inválidas (410, 404) ou tokens inválidos (400)
        if ([400, 404, 410].includes(statusCode)) {
           console.log(`Removing invalid subscription id: ${sub.id} (status ${statusCode})`);
           await supabaseClient.from('web_push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, deliveries: subs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("Critical function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
