import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

export default function AppFrameLayout() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  // If Supabase strips the /auth/callback path because it's not whitelisted,
  // the tokens end up on the root URL (/). We intercept them here.
  useEffect(() => {
    if (pathname === "/" && (search.includes("code=") || hash.includes("access_token="))) {
      navigate(`/auth/callback${search}${hash}`, { replace: true });
    }
  }, [pathname, search, hash, navigate]);

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
