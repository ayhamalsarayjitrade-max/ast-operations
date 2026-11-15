import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, LocateFixed, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { fmtDate, money, ORDER_SELECT } from "@/lib/orders";
import { OrderCard, type OrderRow } from "@/components/OrderCard";
import { cachedRead, enqueue, fieldDB, saveDraft, type FieldDraft } from "@/lib/field-store";
import { VisitSummaryButton } from "@/components/VisitSummaryButton";

export const Route = createFileRoute("/_authenticated/rep")({
  head: () => ({ meta: [
    { title: "تطبيق المندوب — ميدان" },
    { name: "description", content: "تسجيل زيارات العملاء وصور المحلات وإنشاء الطلبات في ميدان." },
    { property: "og:title", content: "تطبيق المندوب — ميدان" },
    { property: "og:description", content: "تسجيل زيارات العملاء وصور المحلات وإنشاء الطلبات في ميدان." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RepPage,
});

type Item = { product_id: string; qty: number };

function RepPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", me?.id], enabled: !!me,
    queryFn: async () => cachedRead(`customers:${me?.id}`, async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error; return data ?? [];
    }),
    networkMode: "always",
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", me?.id], enabled: !!me,
    queryFn: async () => cachedRead(`products:${me?.id}`, async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error; return data ?? [];
    }),
    networkMode: "always",
  });
  const { data: myOrders = [] } = useQuery({
    queryKey: ["orders", "rep", me?.id],
    enabled: !!me,
    queryFn: async () => {
      if (!me) return [];
      return ((await supabase.from("orders").select(ORDER_SELECT).eq("rep_id", me.id).order("created_at", { ascending: false }).limit(20)).data ?? []) as unknown as OrderRow[];
    },
  });
  const { data: visits = [] } = useQuery({
    queryKey: ["visits", "rep", me?.id],
    enabled: !!me,
    queryFn: async () => {
      if (!me) return [];
      return (await supabase.from("visits").select("*, customers(name)").eq("rep_id", me.id).order("created_at", { ascending: false }).limit(10)).data ?? [];
    },
  });

  const [customerId, setCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [note, setNote] = useState("");
  const [hasOrder, setHasOrder] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [deliveryAt, setDeliveryAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const saving = useRef(Promise.resolve());
  const submitting = useRef(false);
  const currentDraft = useRef<FieldDraft | null>(null);
  currentDraft.current = { customerId, newName, newPhone, address, loc, photo, note, hasOrder, items, deliveryAt };
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setReady(false);
    void fieldDB().then(db => db.get("drafts", me.id)).then(draft => {
      if (cancelled) return;
      if (draft) {
        setCustomerId(draft.customerId); setNewName(draft.newName); setNewPhone(draft.newPhone);
        setAddress(draft.address); setLoc(draft.loc); setPhoto(draft.photo); setNote(draft.note);
        setHasOrder(draft.hasOrder); setItems(draft.items); setDeliveryAt(draft.deliveryAt);
        setDraftStatus("تمت استعادة المسودة المحفوظة");
      }
      setReady(true);
    }).catch(() => setDraftStatus("تعذر فتح الحفظ على الجهاز — اسمح بالتخزين ثم أعد المحاولة"));
    return () => { cancelled = true; };
  }, [me?.id]);
  useEffect(() => {
    if (!ready || !me || submitting.current) return;
    const draft: FieldDraft = { customerId, newName, newPhone, address, loc, photo, note, hasOrder, items, deliveryAt };
    saving.current = saving.current.catch(() => undefined).then(() => saveDraft(me.id, draft)).then(() => setDraftStatus("المسودة محفوظة على هذا الجهاز")).catch(() => setDraftStatus("تعذر حفظ المسودة — لا تغلق الصفحة"));
  }, [ready, me?.id, customerId, newName, newPhone, address, loc, photo, note, hasOrder, items, deliveryAt]);
  useEffect(() => {
    if (!photo) { setPhotoUrl(""); return; }
    const url = URL.createObjectURL(photo); setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const isNew = customerId === "new";
  const total = items.reduce((s, it) => s + it.qty * Number(products.find((p) => p.id === it.product_id)?.price ?? 0), 0);

  function locate() {
    if (!navigator.geolocation) { toast.error("الموقع غير مدعوم"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        toast.success("تم تحديد الموقع");
      },
      () => toast.error("تعذر تحديد الموقع — اسمح بالوصول للموقع"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function reset() {
    setCustomerId(""); setNewName(""); setNewPhone(""); setAddress(""); setLoc(null);
    setPhoto(null); setNote(""); setHasOrder(false); setItems([]); setDeliveryAt("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me || submitting.current || !ready) return;
    if (!customerId) { toast.error("اختر العميل"); return; }
    if (!photo) { toast.error("صورة المحل مطلوبة"); return; }
    if (isNew && (!newName.trim() || !newPhone.trim())) { toast.error("اسم ورقم العميل مطلوبان"); return; }
    if (photo.size > 10 * 1024 * 1024) { toast.error("الصورة أكبر من 10 ميجابايت"); return; }
    if (hasOrder && items.some(i => !i.product_id || !Number.isFinite(i.qty) || i.qty <= 0)) { toast.error("تحقق من المنتجات والكميات"); return; }
    if (hasOrder && items.filter((i) => i.product_id && i.qty > 0).length === 0) { toast.error("أضف منتجات للطلب"); return; }
    setBusy(true);
    submitting.current = true;
    try {
      await saving.current;
      const cust = customers.find(c => c.id === customerId);
      await enqueue({
        customerId, newName, newPhone, address: address || cust?.address || "",
        loc: loc || (cust?.lat != null && cust.lng != null ? { lat: cust.lat, lng: cust.lng } : null),
        photo, note, hasOrder, items, deliveryAt,
        id: crypto.randomUUID(), orderId: crypto.randomUUID(), owner: me.id,
        resolvedCustomerId: isNew ? crypto.randomUUID() : customerId,
        phone: cust?.phone || newPhone, capturedAt: new Date().toISOString(),
      });
      toast.success("تم الحفظ على الجهاز", { description: navigator.onLine ? "جارٍ المزامنة مع المستودع" : "ستتم المزامنة عند عودة الاتصال" });
      reset();
      window.dispatchEvent(new Event("field-sync-now"));
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ");
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-5">
        <h1 className="text-2xl font-bold">زيارة جديدة</h1>
        <p role="status" className="text-xs text-muted-foreground">{draftStatus || "جارٍ فتح المسودة..."}</p>
        <fieldset disabled={!ready || busy} className="space-y-5">
        <div className="space-y-1.5">
          <Label>العميل</Label>
          <select className="h-10 w-full rounded-md border bg-background px-3" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— اختر عميلاً —</option>
            <option value="new">+ عميل جديد</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
        </div>
        {isNew && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>اسم العميل / المحل</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>رقم الهاتف</Label><Input dir="ltr" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
          </div>
        )}
        <div className="space-y-1.5"><Label>العنوان</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الحي، الشارع، علامة مميزة" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant={loc ? "secondary" : "outline"} onClick={locate}>
            <LocateFixed className="h-4 w-4" /> {loc ? `تم: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "تحديد موقع العميل"}
          </Button>
          <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium hover:bg-muted">
            <Camera className="h-4 w-4" /> {photo ? "تم التقاط الصورة ✓" : "صورة المحل"}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        {photoUrl && <img src={photoUrl} alt="صورة المحل" className="h-40 w-full rounded-lg object-cover" />}
        <div className="space-y-1.5"><Label>ملاحظات</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3">
          <Label>يوجد طلب؟</Label>
          <Switch checked={hasOrder} onCheckedChange={(v) => { setHasOrder(v); if (v && items.length === 0) setItems([{ product_id: "", qty: 1 }]); }} />
        </div>
        {hasOrder && (
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <select className="h-10 flex-1 rounded-md border bg-background px-2" value={it.product_id}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, product_id: e.target.value } : x)))}>
                  <option value="">— منتج —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.price)}) · متوفر {p.stock}</option>)}
                </select>
                <Input type="number" min={1} className="w-24" value={it.qty}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { product_id: "", qty: 1 }])}><Plus className="h-4 w-4" /> منتج</Button>
            <div className="space-y-1.5"><Label>موعد التسليم</Label><Input type="datetime-local" value={deliveryAt} onChange={(e) => setDeliveryAt(e.target.value)} /></div>
            <div className="text-lg font-bold">الإجمالي: {money(total)}</div>
          </div>
        )}
        <Button className="w-full" size="lg" disabled={busy}>{busy ? "جارٍ الإرسال..." : hasOrder ? "إرسال الزيارة والطلب" : "تسجيل الزيارة"}</Button>
        </fieldset>
      </form>
      <div className="space-y-4">
        <h2 className="font-bold">طلباتي</h2>
        {myOrders.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>}
        {myOrders.map((o) => <OrderCard key={o.id} o={o} />)}
        <h2 className="pt-2 font-bold">آخر الزيارات</h2>
        {visits.map((v: any) => (
          <div key={v.id} className="space-y-2 rounded-lg border bg-card p-3 text-sm">
            <div className="flex justify-between gap-2"><span>{v.customers?.name} {v.has_order ? "· بطلب" : "· زيارة"}</span><span className="text-muted-foreground">{fmtDate(v.created_at)}</span></div>
            <VisitSummaryButton visitId={v.id} />
            {v.ai_summary && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{v.ai_summary}</p>}
            {v.ai_follow_up && <p className="rounded-md bg-muted/60 p-2 text-xs">المتابعة: {v.ai_follow_up}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
