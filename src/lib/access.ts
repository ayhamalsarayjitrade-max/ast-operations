import type { AppRole } from "./orders";

const ROLE_PATHS: Record<Exclude<AppRole, "admin">, string[]> = {
  rep: ["/dashboard", "/rep", "/attendance", "/payroll"],
  warehouse: ["/dashboard", "/warehouse", "/dispatch", "/visits", "/deliveries", "/attendance", "/payroll"],
  driver: ["/driver", "/attendance", "/payroll"],
  customer: [],
};

export function homeForRoles(roles: AppRole[]) {
  if (roles.includes("admin")) return "/dashboard";
  if (roles.includes("driver")) return "/driver";
  if (roles.includes("warehouse")) return "/warehouse";
  if (roles.includes("rep")) return "/rep";
  return "/dashboard";
}

export function canAccessPath(roles: AppRole[], path: string) {
  if (roles.includes("admin")) return true;
  return roles.some((role) => role !== "admin" && ROLE_PATHS[role].includes(path));
}
