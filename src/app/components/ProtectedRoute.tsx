import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useUser } from "../context/UserContext";
import { getRoleHomePath } from "../utils/roleRouting";
import type { UserData } from "../utils/userDatabase";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserData["role"][];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }

  if (user.role === "driver") {
    if (user.approvalStatus !== "approved" || user.accountStatus === "Blocked" || user.accountStatus === "Archived" || user.accountStatus === "Suspended") {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  return <>{children}</>;
}
