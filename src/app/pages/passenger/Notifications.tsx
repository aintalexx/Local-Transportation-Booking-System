import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Bell, MapPin, Star, AlertCircle, Gift, CheckCircle } from "lucide-react";
import { useUser } from "../../context/UserContext";
import {
  getSupabaseNotifications,
  markAllSupabaseNotificationsRead,
  markSupabaseNotificationRead,
  type AppNotification,
  type NotificationType,
} from "../../utils/supabaseNotifications";

export default function Notifications() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      setLoading(true);
      const rows = await getSupabaseNotifications(user);
      if (!cancelled) {
        setNotifications(rows);
        setLoading(false);
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;

    setSaving(true);
    const previous = notifications;
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));

    const success = await markAllSupabaseNotificationsRead(user);
    if (!success) {
      setNotifications(previous);
      toast.error("Unable to mark notifications as read.");
    }
    setSaving(false);
  };

  const markRead = async (id: string) => {
    if (!user) return;
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.read) return;

    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    const success = await markSupabaseNotificationRead(user, id);
    if (!success) {
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: false } : n));
      toast.error("Unable to update notification.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] p-6 text-white">
        <div className="mx-auto flex max-w-screen-md flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="mt-1 text-[rgba(255,248,231,0.7)]">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-[#D4AF37] hover:bg-white/10"
              onClick={markAllRead}
              disabled={saving}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-screen-md p-4">
        {loading ? (
          <EmptyNotifications message="Loading notifications..." />
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <button
                  key={notification.id}
                  className="w-full text-left"
                  onClick={() => markRead(notification.id)}
                >
                  <Card className={`transition-shadow hover:shadow-md ${!notification.read ? "border-[rgba(75,15,20,0.2)] bg-[rgba(75,15,20,0.03)]" : ""}`}>
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${getIconColor(notification.type)}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <h3 className={`min-w-0 break-words text-sm ${!notification.read ? "font-bold" : "font-semibold"}`}>
                              {notification.title}
                            </h3>
                            <Badge variant={notification.read ? "secondary" : "default"} className="shrink-0 text-[10px]">
                              {notification.read ? "Read" : "Unread"}
                            </Badge>
                          </div>
                          <p className="mb-2 break-words text-sm text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-500">{formatNotificationTime(notification.createdAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyNotifications message="No notifications yet." />
        )}
      </div>
    </div>
  );
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "ride":
      return MapPin;
    case "rating":
      return Star;
    case "promo":
      return Gift;
    case "system":
      return AlertCircle;
    default:
      return CheckCircle;
  }
}

function getIconColor(type: NotificationType) {
  switch (type) {
    case "ride":
      return "bg-[rgba(75,15,20,0.08)] text-[#4B0F14]";
    case "rating":
      return "bg-yellow-100 text-yellow-600";
    case "promo":
      return "bg-green-100 text-green-600";
    case "system":
      return "bg-orange-100 text-orange-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function EmptyNotifications({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <Bell className="mx-auto mb-2 h-12 w-12 text-gray-400" />
        <p className="text-gray-600">{message}</p>
      </CardContent>
    </Card>
  );
}
