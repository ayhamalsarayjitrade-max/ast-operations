import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, ShoppingCart, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/staff";
import { fmtDate, mapsLink } from "@/lib/orders";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/visits")({
  head: () => ({ meta: [
    { title: "الزيارات الميدانية — ميدان" },
    { name: "description", content: "تصفح الزيارات الميدانية وصور المحلات وبيانات العملاء في ميدان." },
    { property: "og:title", content: "الزيارات الميدانية — ميدان" },
    { property: "og:description", content: "تصفح الزيارات الميدانية وصور المحلات وبيانات العملاء في ميدان." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: VisitsPage,
});

type V = {
  id: string; created_at: string; has_order: boolean; lat: number | null; lng: number | null;
  note: string | null; photo_path: string | null; rep_id: string;
  customers: { name: string; phone: string | null; address: string | null } | null;
  url?: string | null;
};

function VisitsPage() {
  const { data: staff = [] } = useStaff();
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [rep, setRep] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<V | null>(null);

  const { data: visits = [] } = useQuery({
    queryKey: ["visits", "list", day],
    queryFn: async () => {
      const s = new Date(day + "T00:00:00");
      const e = new Date(s.getTime() + 86_400_000);
      const { data } = await supabase
        .from("visits")
        .select("*, customers(name, phone, address)")
        .gte("created_at", s.toISOString()).lt("created_at", e.toISOString())
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as V[];
      const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("shop-photos").createSignedUrls(paths, 120);
        const m = new Map((signed ?? []).map((x) => [x.path, x.signedUrl]));
        rows.forEach((r) => (r.url = r.photo_path ? (m.get(r.photo_path) ?? null) : null));
      }
      return rows;
    },
  });

  const nameOf = (id: string) => staff.find((s) => s.id === id)?.full_name ?? "—";
  const list = visits.filter(
    (v) => (!rep || v.rep_id === rep) && (!q || `${v.customers?.name} ${v.customers?.phone}`.includes(q)),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الزيارات الميدانية</h1>
        <p className="text-sm text-muted-foreground">
          {list.length} زيارة · {list.filter((v) => v.has_order).length} بطلب
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input type="date" className="w-44" value={day} onChange={(e) => setDay(e.target.value)} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={rep} onChange={(e) => setRep(e.target.value)}>
          <option value="">كل المناديب</option>
          {staff.filter((s) => s.roles.includes("rep")).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <Input placeholder="بحث بالاسم أو الجوال" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((v) => (
          <button key={v.id} onClick={() => setOpen(v)} className="overflow-hidden rounded-xl border bg-card text-right transition hover:shadow-md">
            {v.url ? <img src={v.url} alt={v.customers?.name ?? ""} className="h-44 w-full object-cover" loading="lazy" />
              : <div className="flex h-44 items-center justify-center bg-muted text-sm text-muted-foreground">بدون صورة</div>}
            <div className="space-y-1 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">{v.customers?.name}</span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${v.has_order ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {v.has_order ? <ShoppingCart className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {v.has_order ? "طلب" : "زيارة فقط"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{nameOf(v.rep_id)} · {fmtDate(v.created_at)}</div>
            </div>
          </button>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">لا توجد زيارات في هذا اليوم.</p>}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.customers?.name}</DialogTitle></DialogHeader>
              {open.url && <img src={open.url} alt="" className="max-h-80 w-full rounded-lg object-contain" />}
              <div className="space-y-1 text-sm">
                <div>الجوال: <a dir="ltr" className="text-primary" href={`tel:${open.customers?.phone}`}>{open.customers?.phone ?? "—"}</a></div>
                <div>العنوان: {open.customers?.address ?? "—"}</div>
                <div>المندوب: {nameOf(open.rep_id)}</div>
                <div>الوقت: {fmtDate(open.created_at)}</div>
                {open.note && <div>ملاحظة: {open.note}</div>}
                {mapsLink(open.lat, open.lng) && (
                  <a className="inline-flex items-center gap-1 text-primary underline" href={mapsLink(open.lat, open.lng)!} target="_blank" rel="noreferrer">
                    <MapPin className="h-4 w-4" /> موقع الزيارة
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
