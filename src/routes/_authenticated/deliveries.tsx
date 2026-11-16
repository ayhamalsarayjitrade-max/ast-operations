import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_SELECT, fmtDate, mapsLink } from "@/lib/orders";
import { StatusBadge, type OrderRow } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DeliveryOrder = OrderRow & { delivery_proofs: { recipient_name: string; photo_path: string | null; signature_path: string | null; delivered_at: string; lat: number; lng: number } | null };
export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({ meta: [
    { title: "إثباتات التسليم — أيهم السريجي للتجارة" }, { name: "description", content: "مراجعة المستلم والصورة أو التوقيع ووقت وموقع كل تسليم." },
    { property: "og:title", content: "إثباتات التسليم — أيهم السريجي للتجارة" }, { property: "og:description", content: "مراجعة المستلم والصورة أو التوقيع ووقت وموقع كل تسليم." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: DeliveriesPage,
});
function DeliveriesPage() {
  const [selected, setSelected] = useState<DeliveryOrder | null>(null);
  const [media, setMedia] = useState<{ photo: string; signature: string }>({ photo: "", signature: "" });
  const { data: orders = [] } = useQuery({ queryKey: ["orders", "deliveries"], queryFn: async () => {
    const { data, error } = await supabase.from("orders").select(`${ORDER_SELECT}, delivery_proofs(*)`).eq("status", "delivered").order("updated_at", { ascending: false }).limit(100);
    if (error) throw error; return (data ?? []) as unknown as DeliveryOrder[];
  } });
  useEffect(() => {
    setMedia({ photo: "", signature: "" });
    const proof = selected?.delivery_proofs;
    if (!proof) return;
    void Promise.all([proof.photo_path, proof.signature_path].map(async (path) => path ? (await supabase.storage.from("delivery-proofs").createSignedUrl(path, 120)).data?.signedUrl ?? "" : "")).then(([photo = "", signature = ""]) => setMedia({ photo, signature }));
  }, [selected]);
  const proof = selected?.delivery_proofs;
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">إثباتات التسليم</h1><p className="text-sm text-muted-foreground">راجع المستلم والصورة أو التوقيع والوقت والموقع.</p></div>
    <div className="grid gap-3 md:grid-cols-2">{orders.map((o) => <button key={o.id} className="rounded-xl border bg-card p-4 text-right transition-colors hover:bg-muted/40" onClick={() => setSelected(o)}>
      <div className="flex items-center justify-between"><span className="font-bold">طلب #{o.number} — {o.customers?.name}</span><StatusBadge status={o.status} /></div>
      <div className="mt-3 flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success" />استلمه: {o.delivery_proofs?.recipient_name ?? "—"}</div>
      <div className="mt-1 text-sm text-muted-foreground">{fmtDate(o.delivery_proofs?.delivered_at)}</div>
    </button>)}</div>
    {orders.length === 0 && <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">لا توجد تسليمات موثقة بعد.</p>}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>إثبات الطلب #{selected?.number}</DialogTitle></DialogHeader>
      {proof && <div className="space-y-3 text-sm"><p><b>المستلم:</b> {proof.recipient_name}</p><p><b>الوقت:</b> {fmtDate(proof.delivered_at)}</p><Button asChild variant="outline"><a href={mapsLink(proof.lat, proof.lng)!} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4" />فتح موقع التسليم</a></Button>
        {media.photo && <img src={media.photo} alt="صورة إثبات التسليم" className="max-h-96 w-full rounded-lg border object-contain" />}
        {media.signature && <img src={media.signature} alt="توقيع المستلم" className="h-48 w-full rounded-lg border bg-background object-contain" />}
      </div>}
    </DialogContent></Dialog>
  </div>;
}
