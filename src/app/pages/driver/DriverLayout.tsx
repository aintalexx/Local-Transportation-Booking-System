import { Outlet, useNavigate, useLocation } from "react-router";
import { Home, User } from "lucide-react";
import { cn } from "../../components/ui/utils";

export default function DriverLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/driver" },
    { icon: User, label: "Profile", path: "/driver/profile" },
  ];

  const isActive = (path: string) => {
    if (path === "/driver") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <main className="min-h-0 flex-1 overflow-auto scroll-smooth">
        <div className="h-full min-h-full" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
          <Outlet />
        </div>
      </main>

      <nav className="shrink-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-2 py-1 z-50 shadow-lg safe-bottom">
        <div className="swipe-indicator"></div>
        <div className="max-w-screen-md mx-auto flex items-stretch gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 transition-smooth relative touch-active",
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
                  "h-7 w-7 transition-transform",
                  isActive(item.path) && "stroke-[2.5px] scale-110"
                )} />
                {isActive(item.path) && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#4B0F14] rounded-full" />
                )}
              </div>
              <span className={cn(
                "max-w-full truncate text-xs leading-tight transition-all",
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
