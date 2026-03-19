import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BJmM168hm-M-SNqG-nYzUHPYK3jjpEUctn0tgor4IJ-fRkOFCO0OmeKLm7OpmTnSGXEiP57Tvr0QfOL3wyuzPoE';

export async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Verificar se já existe inscrição
    let subscription = await registration.pushManager.getSubscription();
    
    // Força a renovação da inscrição para garantir que a nova VAPID key seja usada
    if (subscription) {
      await subscription.unsubscribe();
    }
    
    // Pedir permissão e inscrever com a NOVA chave
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

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
