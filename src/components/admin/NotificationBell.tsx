import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminNotification {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

const iconFor = (type: string) => {
  if (type === "chargeback") return CreditCard;
  if (type === "underpaid_suspect") return ShieldAlert;
  return AlertTriangle;
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) {
      setNotifications(data as AdminNotification[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("admin_notifications_bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as AdminNotification, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("admin_notifications").update({ is_read: true }).in("id", unreadIds);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Alertas</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Carregando...</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum alerta por enquanto
          </div>
        )}
        {notifications.map((n) => {
          const Icon = iconFor(n.type);
          return (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 flex gap-2.5 border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors",
                !n.is_read && "bg-destructive/5"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 mt-0.5 flex-shrink-0",
                  n.severity === "critical"
                    ? "text-destructive"
                    : n.severity === "warning"
                    ? "text-yellow-500"
                    : "text-primary"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn("text-sm leading-tight", !n.is_read && "font-semibold")}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
