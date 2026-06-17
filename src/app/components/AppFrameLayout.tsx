import { Outlet } from "react-router";

export default function AppFrameLayout() {
  return (
    <div className="app-device-stage">
      <div className="app-device-shell">
        <div className="app-device-screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
