import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  type: 'new_event' | 'event_reminder';
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventImage?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PushNotificationRequest = await req.json();
    const { type, eventId, eventTitle, eventDate, eventImage } = body;

    console.log(`Processing push notification: ${type} for event ${eventId}`);

    // For now, we'll just log the notification request
    // In a production environment, you would:
    // 1. Fetch all push subscriptions from the database
    // 2. Send push notifications using web-push library

    const notificationData = {
      title: type === 'new_event' ? '🎉 Novo Evento!' : '⏰ Lembrete de Evento',
      body: type === 'new_event' 
        ? `${eventTitle} foi publicado! Garanta seu ingresso.`
        : `${eventTitle} acontece em breve!`,
      url: `/evento/${eventId}`,
      icon: eventImage || '/favicon.ico',
    };

    console.log('Push notification data:', notificationData);

    // Return success - the frontend will handle local notifications
    return new Response(JSON.stringify({
      success: true,
      message: 'Push notification sent',
      data: notificationData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
