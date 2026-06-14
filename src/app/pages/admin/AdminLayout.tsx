import { Outlet, useNavigate, useLocation } from "react-router";
import { Button } from "../../components/ui/button";
import { LayoutDashboard, Users, ClipboardList, Map, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { cn } from "../../components/ui/utils";
import { useState } from "react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Drivers", path: "/admin/drivers" },
    { icon: ClipboardList, label: "Bookings", path: "/admin/bookings" },
    { icon: Map, label: "Live Tracking", path: "/admin/live-map" },
    { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      navigate("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-[#4B0F14]">Arangkada Admin</h1>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-auto">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(item.path)
                    ? "bg-[rgba(75,15,20,0.05)] text-[#4B0F14] font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full border-red-500 text-red-500 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        {/* Top bar for mobile */}
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
