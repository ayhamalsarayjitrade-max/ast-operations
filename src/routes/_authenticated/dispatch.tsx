import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_SELECT, fmtDate, mapsLink } from "@/lib/orders";
import { useStaff } from "@/lib/staff";
import { OrderCard, type OrderRow } from "@/components/OrderCard";

export const Route = createFileRoute("/_authenticated/dispatch")({
  head: () => ({ meta: [{ title: "الإسناد والتتبع — ميدان" }] }),
  component: DispatchPage,
});

function DispatchPage() {
  const { data: staff = [] } = useStaff();
  const drivers = staff.filter((s) => s.roles.includes("driver"));
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "dispatch"],
    queryFn: async () =>
      ((await supabase.from("orders").select(ORDER_SELECT).in("status", ["new", "preparing", "ready", "assigned", "out_for_delivery"]).order("delivery_at", { ascending: true, nullsFirst: false })).data ?? []) as unknown as OrderRow[],
  });
  const { data: locs = [] } = useQuery({
    queryKey: ["driver_locations"],
    queryFn: async () => (await supabase.from("driver_locations").select("*")).data ?? [],
  });

  async function assign(id: string, driver_id: string) {
    const { error } = await supabase.from("orders").update({ driver_id: driver_id || null }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("تم إسناد الطلب");
  }

  const nameOf = (id: string | null) => staff.find((s) => s.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-bold">السائقون</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد سائقون. عيّن الدور من صفحة الفريق.</p>}
          {drivers.map((d) => {
            const l = locs.find((x) => x.driver_id === d.id);
            const active = orders.filter((o) => o.driver_id === d.id && o.status !== "delivered").length;
            const fresh = l && Date.now() - new Date(l.updated_at).getTime() < 5 * 60_000;
            return (
              <div key={d.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold">{d.full_name}</div>
                  <span className={`h-2.5 w-2.5 rounded-full ${fresh ? "bg-success" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">طلبات نشطة: {active}</div>
                {l ? (
                  <>
                    <iframe
                      title={d.full_name}
                      className="mt-2 h-36 w-full rounded-lg border"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.01},${l.lat - 0.01},${l.lng + 0.01},${l.lat + 0.01}&marker=${l.lat},${l.lng}`}
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>آخر تحديث: {fmtDate(l.updated_at)}</span>
                      <a className="text-primary underline" href={mapsLink(l.lat, l.lng)!} target="_blank" rel="noreferrer">خريطة</a>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">لم يشارك موقعه بعد</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">الطلبات النشطة</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              o={o}
              extra={<div className="mt-2 text-sm">السائق: <b>{nameOf(o.driver_id)}</b></div>}
              actions={
                o.status !== "out_for_delivery" ? (
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={o.driver_id ?? ""} onChange={(e) => assign(o.id, e.target.value)}>
                    <option value="">— إسناد لسائق —</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                ) : null
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
