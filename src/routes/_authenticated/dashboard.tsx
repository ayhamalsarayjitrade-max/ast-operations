import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, hasRole } from "@/lib/auth";
import { ORDER_SELECT, STATUS_LABEL, fmtDate, money, type OrderStatus } from "@/lib/orders";
import { StatusBadge, type OrderRow } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "لوحة التحكم — ميدان" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const [waPhone, setWaPhone] = useState("");
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "today"],
    queryFn: async () =>
      ((await supabase.from("orders").select(ORDER_SELECT).gte("created_at", start.toISOString()).order("created_at", { ascending: false })).data ?? []) as unknown as OrderRow[],
  });
  const { data: visits = [] } = useQuery({
    queryKey: ["visits", "today"],
    queryFn: async () => (await supabase.from("visits").select("id, has_order").gte("created_at", start.toISOString())).data ?? [],
  });

  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const sales = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + Number(o.total), 0);
  const stats = [
    { l: "زيارات اليوم", v: visits.length },
    { l: "طلبات اليوم", v: orders.length },
    { l: "قيد التجهيز", v: count("new") + count("preparing") },
    { l: "في الطريق", v: count("out_for_delivery") + count("assigned") },
    { l: "تم التسليم", v: count("delivered") },
    { l: "مبيعات اليوم", v: money(sales) },
  ];

  const report = [
    `📊 تقرير يوم ${new Date().toLocaleDateString("ar")}`,
    ...stats.map((s) => `• ${s.l}: ${s.v}`),
    "",
    ...orders.slice(0, 20).map((o) => `#${o.number} ${o.customers?.name} — ${STATUS_LABEL[o.status]} — ${money(o.total)}`),
  ].join("\n");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">أهلاً {me?.name}</h1>
        <p className="text-sm text-muted-foreground">ملخص اليوم يتحدث لحظياً</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="mt-1 text-2xl font-bold">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {hasRole(me, "rep") && <Button asChild><Link to="/rep">زيارة جديدة</Link></Button>}
        {hasRole(me, "warehouse") && <Button asChild variant="secondary"><Link to="/warehouse">تجهيز الطلبات</Link></Button>}
        {hasRole(me, "driver") && <Button asChild variant="secondary"><Link to="/driver">طلباتي للتوصيل</Link></Button>}
      </div>
      {me?.roles.includes("admin") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
          <MessageCircle className="h-5 w-5 text-success" />
          <span className="font-semibold">إرسال تقرير اليوم على واتساب</span>
          <Input dir="ltr" placeholder="9665xxxxxxxx" className="w-44" value={waPhone} onChange={(e) => setWaPhone(e.target.value)} />
          <Button asChild variant="outline">
            <a href={`https://wa.me/${waPhone.replace(/\D/g, "")}?text=${encodeURIComponent(report)}`} target="_blank" rel="noreferrer">إرسال</a>
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-right">
            <tr><th className="p-3">#</th><th className="p-3">العميل</th><th className="p-3">الحالة</th><th className="p-3">التسليم</th><th className="p-3">الإجمالي</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">{o.number}</td>
                <td className="p-3 font-medium">{o.customers?.name}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3">{fmtDate(o.delivery_at)}</td>
                <td className="p-3">{money(o.total)}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد طلبات اليوم</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
