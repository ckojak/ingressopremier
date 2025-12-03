import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function NotificationSettings() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificações
        </CardTitle>
        <CardDescription>
          Receba lembretes sobre eventos próximos e atualizações importantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Notificações Push</Label>
            <p className="text-sm text-muted-foreground">
              Receba notificações mesmo quando o site estiver fechado
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            disabled={isLoading}
            onCheckedChange={(checked) => {
              if (checked) {
                subscribe();
              } else {
                unsubscribe();
              }
            }}
          />
        </div>

        {!isSubscribed && (
          <Button 
            onClick={subscribe} 
            disabled={isLoading}
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            {isLoading ? "Ativando..." : "Ativar Notificações"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
