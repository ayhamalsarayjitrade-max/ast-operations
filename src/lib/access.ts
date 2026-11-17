import type { AppRole } from "./orders";

// Admin-only screens (company totals, salaries, team, invites) are never listed for other roles.
const ROLE_PATHS: Record<Exclude<AppRole, "admin">, string[]> = {
  rep: ["/rep", "/messages", "/attendance"],
  warehouse: ["/dashboard", "/warehouse", "/dispatch", "/visits", "/deliveries", "/messages", "/attendance"],
  driver: ["/driver", "/attendance"],
  customer: [],
};

export function homeForRoles(roles: AppRole[]) {
  if (roles.includes("admin")) return "/dashboard";
  if (roles.includes("warehouse")) return "/warehouse";
  if (roles.includes("driver")) return "/driver";
  if (roles.includes("rep")) return "/rep";
  return "/dashboard";
}

export function canAccessPath(roles: AppRole[], path: string) {
  if (roles.includes("admin")) return true;
  return roles.some((role) => role !== "admin" && ROLE_PATHS[role]?.includes(path));
}
