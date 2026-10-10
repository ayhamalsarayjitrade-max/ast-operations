import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { ORDER_SELECT, mapsLink } from "@/lib/orders";
import { setStatus } from "@/lib/order-actions";
import { notify } from "@/lib/notify";
import { OrderCard, type OrderRow } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/driver")({
  head: () => ({ meta: [{ title: "تطبيق السائق — ميدان" }] }),
  component: DriverPage,
});

function DriverPage() {
  const { data: me } = useMe();
  const [sharing, setSharing] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "driver", me?.id],
    enabled: !!me,
    queryFn: async () =>
      ((await supabase.from("orders").select(ORDER_SELECT).eq("driver_id", me!.id).in("status", ["assigned", "out_for_delivery", "ready"]).order("delivery_at", { ascending: true, nullsFirst: false })).data ?? []) as unknown as OrderRow[],
  });

  useEffect(() => {
    if (!sharing || !me) return;
    if (!navigator.geolocation) {
      toast.error("الموقع غير مدعوم");
      setSharing(false);
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (Date.now() - lastSent.current < 15000) return;
        lastSent.current = Date.now();
        await supabase.from("driver_locations").upsert({ driver_id: me.id, lat: p.coords.latitude, lng: p.coords.longitude, updated_at: new Date().toISOString() });
      },
      () => toast.error("تعذر الوصول للموقع"),
      { enableHighAccuracy: true },
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [sharing, me]);

  // reminders for upcoming deliveries
  useEffect(() => {
    const warned = new Set<string>();
    const t = setInterval(() => {
      orders.forEach((o) => {
        if (!o.delivery_at || warned.has(o.id)) return;
        const mins = (new Date(o.delivery_at).getTime() - Date.now()) / 60000;
        if (mins < 30) {
          warned.add(o.id);
          notify("تذكير بموعد تسليم", `طلب #${o.number} — ${o.customers?.name} ${mins < 0 ? "متأخر!" : `خلال ${Math.round(mins)} دقيقة`}`, "alert");
        }
      });
    }, 60000);
    return () => clearInterval(t);
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div>
          <div className="font-bold">مشاركة موقعي المباشر</div>
          <div className="text-sm text-muted-foreground">يظهر للإدارة لتتبع التوصيل</div>
        </div>
        <Switch checked={sharing} onCheckedChange={setSharing} />
      </div>
      <h1 className="text-xl font-bold">طلباتي ({orders.length})</h1>
      {orders.length === 0 && <p className="text-muted-foreground">لا توجد طلبات مسندة إليك حالياً.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {orders.map((o) => {
          const map = mapsLink(o.lat, o.lng);
          return (
            <OrderCard
              key={o.id}
              o={o}
              actions={
                <>
                  {o.status !== "out_for_delivery" && (
                    <Button onClick={() => { setStatus(o.id, "out_for_delivery"); if (!sharing) setSharing(true); }}>استلمت — في الطريق</Button>
                  )}
                  {o.status === "out_for_delivery" && (
                    <Button className="bg-success text-primary-foreground hover:bg-success/90" onClick={() => confirm("تأكيد التسليم؟") && setStatus(o.id, "delivered")}>تم التسليم</Button>
                  )}
                  {map && (
                    <Button variant="outline" asChild>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> ملاحة</a>
                    </Button>
                  )}
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
