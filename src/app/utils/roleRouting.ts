import type { UserData } from "./userDatabase";

export function getRoleHomePath(user: Pick<UserData, "role" | "approvalStatus">): string {
  if (user.role === "admin") return "/admin";
  if (user.role === "driver") {
    return user.approvalStatus === "pending" ? "/pending-approval" : "/driver";
  }
  return "/passenger";
}
