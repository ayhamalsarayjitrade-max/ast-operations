import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, PackagePlus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { money, ORDER_SELECT } from "@/lib/orders";
import { OrderCard, type OrderRow } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [
    { title: "بوابة العملاء — ميدان" },
    { name: "description", content: "اطلب منتجاتك وتابع حالة التجهيز والتسليم من بوابة ميدان." },
    { property: "og:title", content: "بوابة العملاء — ميدان" },
    { property: "og:description", content: "اطلب منتجاتك وتابع حالة التجهيز والتسليم من بوابة ميدان." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: CustomerPortal,
});

function CustomerPortal() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [deliveryAt, setDeliveryAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: account } = useQuery({ queryKey: ["customer-account", me?.id], enabled: !!me, queryFn: async () => {
    const { data, error } = await supabase.from("customer_accounts").select("*, customers(name,address,phone)").eq("user_id", me!.id).maybeSingle();
    if (error) throw error; return data;
  } });
  const { data: products = [] } = useQuery({ queryKey: ["products", "portal"], queryFn: async () => {
    const { data, error } = await supabase.from("products").select("id,name,price,stock,unit").order("name");
    if (error) throw error; return data ?? [];
  } });
  const { data: orders = [] } = useQuery({ queryKey: ["orders", "portal", me?.id], enabled: !!me, queryFn: async () => {
    const { data, error } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(30);
    if (error) throw error; return (data ?? []) as unknown as OrderRow[];
  } });
  const selected = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const total = selected.reduce((sum, p) => sum + Number(p.price) * cart[p.id], 0);

  function change(id: string, delta: number, max: number) {
    setCart((current) => ({ ...current, [id]: Math.max(0, Math.min(max, (current[id] ?? 0) + delta)) }));
  }
  async function submit() {
    if (!selected.length) return toast.error("أضف منتجاً واحداً على الأقل");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("submit_customer_order", { payload: {
        id: crypto.randomUUID(), items: selected.map((p) => ({ product_id: p.id, qty: cart[p.id] })),
        delivery_at: deliveryAt ? new Date(deliveryAt).toISOString() : "", notes,
      } });
      if (error) throw error;
      toast.success("تم إرسال طلبك", { description: "يمكنك متابعة حالته هنا لحظة بلحظة." });
      setCart({}); setDeliveryAt(""); setNotes("");
      await qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إرسال الطلب"); }
    finally { setBusy(false); }
  }

  if (account === null) return <div className="rounded-xl border bg-card p-8 text-center"><h1 className="text-xl font-bold">حسابك بانتظار الربط</h1><p className="mt-2 text-muted-foreground">اطلب من مدير الشركة ربط حسابك بسجل عميلك، ثم ستظهر المنتجات والطلبات هنا.</p></div>;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">أهلاً {account?.customers?.name ?? me?.name}</h1><p className="text-sm text-muted-foreground">اطلب احتياجاتك وتابعها دون رؤية أي حساب آخر.</p></div>
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold"><PackagePlus className="h-5 w-5 text-primary" />طلب جديد</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => <div key={p.id} className="rounded-xl border bg-card p-4">
          <div className="font-bold">{p.name}</div><div className="mt-1 text-sm text-muted-foreground">{money(p.price)} / {p.unit}</div>
          <div className="mt-1 text-xs text-muted-foreground">المتوفر: {p.stock}</div>
          <div className="mt-3 flex items-center justify-between">
            <Button size="icon" variant="outline" aria-label={`إنقاص ${p.name}`} onClick={() => change(p.id, -1, p.stock)}><Minus className="h-4 w-4" /></Button>
            <span className="text-lg font-bold">{cart[p.id] ?? 0}</span>
            <Button size="icon" aria-label={`إضافة ${p.name}`} disabled={p.stock <= (cart[p.id] ?? 0)} onClick={() => change(p.id, 1, p.stock)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>)}
      </div>
    </section>
    {selected.length > 0 && <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-bold"><ShoppingCart className="h-5 w-5" />ملخص الطلب</h2>
      {selected.map((p) => <div key={p.id} className="flex items-center gap-3 text-sm"><span className="flex-1">{p.name}</span><Input aria-label={`كمية ${p.name}`} type="number" min={1} max={p.stock} className="w-20" value={cart[p.id]} onChange={(e) => setCart({ ...cart, [p.id]: Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)) })} /><b>{money(Number(p.price) * cart[p.id])}</b></div>)}
      <div className="space-y-2"><Label htmlFor="portal-delivery">موعد التسليم المفضل</Label><Input id="portal-delivery" type="datetime-local" value={deliveryAt} onChange={(e) => setDeliveryAt(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="portal-notes">ملاحظات</Label><Textarea id="portal-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="flex items-center justify-between text-lg font-bold"><span>الإجمالي</span><span>{money(total)}</span></div>
      <Button className="w-full" size="lg" disabled={busy} onClick={submit}>{busy ? "جارٍ إرسال الطلب..." : "إرسال الطلب"}</Button>
    </section>}
    <section className="space-y-3"><h2 className="text-lg font-bold">طلباتي</h2>{orders.length === 0 && <p className="text-muted-foreground">لا توجد طلبات بعد.</p>}<div className="grid gap-4 md:grid-cols-2">{orders.map((o) => <OrderCard key={o.id} o={o} />)}</div></section>
  </div>;
}
