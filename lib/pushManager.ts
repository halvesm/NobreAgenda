import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BJ_...SUA_CHAVE_PUBLICA_AQUI...'; // O usuário precisará gerar ou eu posso sugerir uma forma

export async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verificar se já existe inscrição
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Pedir permissão e inscrever
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Salvar no Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subscriptionData = subscription.toJSON();
    
    const { error } = await supabase
      .from('web_push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys?.p256dh,
        auth: subscriptionData.keys?.auth
      }, { onConflict: 'endpoint' });

    if (error) throw error;
    
    console.log('Inscrição de push realizada com sucesso!');
  } catch (error) {
    console.error('Erro ao inscrever para push:', error);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
