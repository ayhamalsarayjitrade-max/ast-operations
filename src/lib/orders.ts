import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "جديد",
  preparing: "قيد التجهيز",
  ready: "جاهز",
  assigned: "مُسند لسائق",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const STATUS_CLASS: Record<OrderStatus, string> = {
  new: "bg-info/15 text-info border-info/30",
  preparing: "bg-warning/15 text-warning-foreground border-warning/40",
  ready: "bg-primary/15 text-primary border-primary/30",
  assigned: "bg-accent text-accent-foreground border-border",
  out_for_delivery: "bg-warning/25 text-warning-foreground border-warning/50",
  delivered: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "مدير",
  rep: "مندوب",
  warehouse: "مستودع",
  driver: "سائق",
};

export const ORDER_SELECT =
  "*, customers(name, phone, address), order_items(id, qty, price, products(name, unit))";

export function mapsLink(lat?: number | null, lng?: number | null) {
  return lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

export function money(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("ar", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
