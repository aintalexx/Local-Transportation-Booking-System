import { Outlet, useLocation } from "react-router";

export default function AppFrameLayout() {
  const { pathname } = useLocation();
  const hasOwnAppLayout = pathname.startsWith("/passenger") || pathname.startsWith("/driver");

  return (
    <div className="app-device-stage">
      <div className="app-device-shell">
        <div className="app-device-screen">
          {hasOwnAppLayout ? <Outlet /> : (
            <div className="app-device-scroll">
              <Outlet />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
