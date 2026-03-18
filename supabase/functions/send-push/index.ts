import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push"

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')! // Geralmente 'mailto:seu@email.com'

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload // A partir de um Database Webhook

    const { user_id, title, message } = record

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar inscrições do usuário
    const { data: subscriptions } = await supabase
      .from('web_push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found' }), { status: 200 })
    }

    const pushPayload = JSON.stringify({
      title,
      body: message,
      icon: '/pwa-192x192.png',
      badge: '/badge.png',
      data: {
        url: '/admin' // Ou link para o agendamento
      }
    })

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }
          await webpush.sendNotification(pushSubscription, pushPayload)
          return { endpoint: sub.endpoint, success: true }
        } catch (err) {
          console.error(`Error sending to ${sub.endpoint}:`, err)
          // Se falhar porque a inscrição expirou, deletar do banco
          if (err.statusCode === 410 || err.statusCode === 404) {
             await supabase.from('web_push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          return { endpoint: sub.endpoint, success: false, error: err.message }
        }
      })
    )

    return new Response(JSON.stringify({ results }), { 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
