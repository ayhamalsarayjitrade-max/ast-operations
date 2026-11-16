import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money, ORDER_SELECT } from "@/lib/orders";
import { setStatus } from "@/lib/order-actions";
import { OrderCard, type OrderRow } from "@/components/OrderCard";

export const Route = createFileRoute("/_authenticated/warehouse")({
  head: () => ({ meta: [
    { title: "لوحة المستودع — أيهم السريجي للتجارة" },
    { name: "description", content: "إدارة المنتجات والمخزون وتجهيز الطلبات في أيهم السريجي للتجارة." },
    { property: "og:title", content: "لوحة المستودع — أيهم السريجي للتجارة" },
    { property: "og:description", content: "إدارة المنتجات والمخزون وتجهيز الطلبات في أيهم السريجي للتجارة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WarehousePage,
});


function WarehousePage() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "warehouse"],
    queryFn: async () =>
      ((await supabase.from("orders").select(ORDER_SELECT).in("status", ["new", "preparing"]).order("delivery_at", { ascending: true, nullsFirst: false })).data ?? []) as unknown as OrderRow[],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [],
  });

  const [p, setP] = useState({ name: "", sku: "", unit: "قطعة", price: "" });
  const [stockIn, setStockIn] = useState<Record<string, string>>({});

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({ name: p.name, sku: p.sku || null, unit: p.unit, price: Number(p.price || 0) });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة المنتج");
    setP({ name: "", sku: "", unit: "قطعة", price: "" });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function addStock(id: string) {
    const qty = Number(stockIn[id]);
    if (!qty) return;
    const { error } = await supabase.from("stock_movements").insert({ product_id: id, qty, note: "إدخال مخزون" });
    if (error) { toast.error(error.message); return; }
    toast.success("تم تحديث المخزون");
    setStockIn({ ...stockIn, [id]: "" });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <Tabs defaultValue="orders">
      <TabsList>
        <TabsTrigger value="orders">تجهيز الطلبات ({orders.length})</TabsTrigger>
        <TabsTrigger value="products">المنتجات والمخزون</TabsTrigger>
      </TabsList>
      <TabsContent value="orders" className="mt-4">
        {orders.length === 0 && <p className="text-muted-foreground">لا توجد طلبات بانتظار التجهيز.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              o={o}
              extra={o.order_items.some((it) => Number(products.find((x) => x.name === it.products?.name)?.stock ?? 0) < Number(it.qty)) ? (
                <p className="mt-2 text-sm font-semibold text-destructive">تنبيه: بعض المنتجات غير متوفرة بالكمية الكافية</p>
              ) : null}
              actions={
                <>
                  {o.status === "new" && <Button onClick={() => setStatus(o.id, "preparing")}>بدء التجهيز</Button>}
                  {o.status === "preparing" && <Button onClick={() => setStatus(o.id, "ready")}>جاهز للتوصيل</Button>}
                  <Button variant="ghost" className="text-destructive" onClick={() => confirm("إلغاء الطلب؟") && setStatus(o.id, "cancelled")}>إلغاء</Button>
                </>
              }
            />
          ))}
        </div>
      </TabsContent>
      <TabsContent value="products" className="mt-4 space-y-4">
        <form onSubmit={addProduct} className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-5">
          <Input required placeholder="اسم المنتج" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="sm:col-span-2" />
          <Input placeholder="الرمز" value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value })} />
          <Input placeholder="الوحدة" value={p.unit} onChange={(e) => setP({ ...p, unit: e.target.value })} />
          <div className="flex gap-2">
            <Input type="number" step="0.01" placeholder="السعر" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} />
            <Button>إضافة</Button>
          </div>
        </form>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-right">
              <tr><th className="p-3">المنتج</th><th className="p-3">الرمز</th><th className="p-3">السعر</th><th className="p-3">المخزون</th><th className="p-3">إدخال كمية</th></tr>
            </thead>
            <tbody>
              {products.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{x.name}</td>
                  <td className="p-3 text-muted-foreground">{x.sku ?? "—"}</td>
                  <td className="p-3">{money(x.price)}</td>
                  <td className={`p-3 font-bold ${Number(x.stock) <= 5 ? "text-destructive" : ""}`}>{x.stock} {x.unit}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Input type="number" className="w-24" value={stockIn[x.id] ?? ""} onChange={(e) => setStockIn({ ...stockIn, [x.id]: e.target.value })} />
                      <Button size="sm" variant="secondary" onClick={() => addStock(x.id)}>إدخال</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
