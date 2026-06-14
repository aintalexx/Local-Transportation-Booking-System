import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Bell, MapPin, Star, AlertCircle, Gift, CheckCircle } from "lucide-react";

type NotifType = "ride" | "rating" | "promo" | "system";

interface Notification {
  id: number;
  type: NotifType;
  icon: typeof Bell;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: "ride",   icon: MapPin,       title: "Ride Completed",           message: "Your ride to Divisoria has been completed. Fare: ₱65",              time: "2 hours ago",  read: false },
    { id: 2, type: "rating", icon: Star,          title: "Driver rated you 5 stars", message: "Maria Garcia gave you an excellent rating!",                         time: "3 hours ago",  read: false },
    { id: 3, type: "promo",  icon: Gift,          title: "Special Promo!",           message: "Use code ARANGKADA for 20% off on your next ride this week",         time: "1 day ago",    read: true  },
    { id: 4, type: "system", icon: AlertCircle,   title: "Service Update",           message: "Route to San Juan temporarily affected due to road construction",    time: "2 days ago",   read: true  },
    { id: 5, type: "ride",   icon: CheckCircle,   title: "Driver on the way!",       message: "Your driver Juan dela Cruz is heading to your pickup point. ETA: 5 mins", time: "3 days ago", read: true },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () =>
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));

  const markRead = (id: number) =>
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));

  const getIconColor = (type: NotifType) => {
    switch (type) {
      case "ride":   return "text-[#4B0F14] bg-[rgba(75,15,20,0.08)]";
      case "rating": return "text-yellow-600 bg-yellow-100";
      case "promo":  return "text-green-600 bg-green-100";
      case "system": return "text-orange-600 bg-orange-100";
      default:       return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6">
        <div className="max-w-screen-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-[rgba(255,248,231,0.7)] mt-1">
              {unreadCount > 0 ? `${unreadCount} new notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#D4AF37] hover:bg-white/10 text-xs"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4">
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <button
                key={notification.id}
                className="w-full text-left"
                onClick={() => markRead(notification.id)}
              >
                <Card className={`hover:shadow-md transition-shadow ${!notification.read ? "border-[rgba(75,15,20,0.2)] bg-[rgba(75,15,20,0.03)]" : ""}`}>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm ${!notification.read ? "font-bold" : "font-semibold"}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="h-2.5 w-2.5 rounded-full bg-[#4B0F14] flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">{notification.time}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {notifications.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No notifications yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
