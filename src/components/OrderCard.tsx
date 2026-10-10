import { MapPin, Phone, Clock, Package } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_CLASS, STATUS_LABEL, fmtDate, mapsLink, money, type OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  number: number;
  status: OrderStatus;
  delivery_at: string | null;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  total: number;
  driver_id: string | null;
  created_at: string;
  customers: { name: string; phone: string; address: string | null } | null;
  order_items: { id: string; qty: number; price: number; products: { name: string; unit: string } | null }[];
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function OrderCard({ o, actions, extra }: { o: OrderRow; actions?: ReactNode; extra?: ReactNode }) {
  const map = mapsLink(o.lat, o.lng);
  const late = o.delivery_at && new Date(o.delivery_at) < new Date() && !["delivered", "cancelled"].includes(o.status);
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", late && "border-destructive/50")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">طلب #{o.number}</div>
          <div className="text-lg font-bold">{o.customers?.name}</div>
        </div>
        <StatusBadge status={o.status} />
      </div>
      <div className="mt-3 grid gap-1.5 text-sm">
        <a href={`tel:${o.phone ?? o.customers?.phone}`} className="flex items-center gap-2 hover:text-primary">
          <Phone className="h-4 w-4" /> <span dir="ltr">{o.phone ?? o.customers?.phone}</span>
        </a>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="flex-1">{o.address ?? o.customers?.address ?? "—"}</span>
          {map && (
            <a href={map} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline">
              فتح الخريطة
            </a>
          )}
        </div>
        <div className={cn("flex items-center gap-2", late && "font-semibold text-destructive")}>
          <Clock className="h-4 w-4" /> موعد التسليم: {fmtDate(o.delivery_at)} {late && "(متأخر)"}
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-muted/60 p-2 text-sm">
        {o.order_items.map((it) => (
          <div key={it.id} className="flex justify-between py-0.5">
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              {it.products?.name}
            </span>
            <span>
              {it.qty} {it.products?.unit}
            </span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t pt-1 font-bold">
          <span>الإجمالي</span>
          <span>{money(o.total)}</span>
        </div>
      </div>
      {o.notes && <p className="mt-2 text-sm text-muted-foreground">ملاحظات: {o.notes}</p>}
      {extra}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
