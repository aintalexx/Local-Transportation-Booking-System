import { Outlet, useNavigate, useLocation } from "react-router";
import { Home, MapPin, Clock, Bell, User } from "lucide-react";
import { cn } from "../../components/ui/utils";

export default function PassengerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/passenger" },
    { icon: MapPin, label: "Book Ride", path: "/passenger/book" },
    { icon: Clock, label: "Activity", path: "/passenger/history" },
    { icon: Bell, label: "Notifications", path: "/passenger/notifications" },
    { icon: User, label: "Profile", path: "/passenger/profile" },
  ];

  const isActive = (path: string) => {
    if (path === "/passenger") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 overflow-auto scroll-smooth">
        <div style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-2 py-1 z-50 shadow-lg safe-bottom">
        <div className="swipe-indicator"></div>
        <div className="max-w-screen-md mx-auto flex justify-around items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-smooth min-w-[68px] relative touch-active",
                isActive(item.path)
                  ? "text-[#4B0F14] bg-[rgba(75,15,20,0.05)]"
                  : "text-gray-500 hover:text-gray-700 active:bg-gray-100"
              )}
            >
              <div className={cn(
                "relative",
                isActive(item.path) && "animate-scale-in"
              )}>
                <item.icon className={cn(
                  "h-6 w-6 transition-transform",
                  isActive(item.path) && "stroke-[2.5px] scale-110"
                )} />
                {isActive(item.path) && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#4B0F14] rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px] transition-all",
                isActive(item.path) && "font-bold scale-105"
              )}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
