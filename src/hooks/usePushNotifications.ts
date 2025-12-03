import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      setSubscription(existingSubscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta notificações push');
      return;
    }

    setIsLoading(true);
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permissão de notificação negada');
        setIsLoading(false);
        return;
      }

      // Subscribe to push
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(newSubscription);

      // Save subscription to database (optional - for server-side push)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Store subscription endpoint for later use
        localStorage.setItem('pushSubscription', JSON.stringify(newSubscription.toJSON()));
      }

      toast.success('Notificações ativadas com sucesso!');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Erro ao ativar notificações');
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    setIsLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      localStorage.removeItem('pushSubscription');
      toast.success('Notificações desativadas');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  const sendLocalNotification = useCallback((title: string, body: string, url?: string) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
      
      if (url) {
        notification.onclick = () => {
          window.open(url, '_blank');
        };
      }
    }
  }, []);

  return {
    isSupported,
    isSubscribed: !!subscription,
    isLoading,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}
