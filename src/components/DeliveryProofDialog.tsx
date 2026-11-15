import { useRef, useState } from "react";
import { Camera, LocateFixed, PenLine, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deliveryProofError } from "@/lib/delivery-proof";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeliveryProofDialog({ orderId, orderNumber, driverId, open, onOpenChange }: {
  orderId: string; orderNumber: number; driverId: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [recipient, setRecipient] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  function locate() {
    if (!navigator.geolocation) return toast.error("الموقع غير مدعوم على هذا الجهاز");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("تم تحديد موقع التسليم"); },
      () => toast.error("اسمح بالوصول للموقع ثم أعد المحاولة"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * e.currentTarget.width / rect.width, y: (e.clientY - rect.top) * e.currentTarget.height / rect.height };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke(); }
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) { ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#172624"; ctx.lineTo(p.x, p.y); ctx.stroke(); }
  }
  function finish(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    e.currentTarget.toBlob((blob) => setSignature(blob), "image/png");
  }
  function clearSignature() {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setSignature(null);
  }

  async function submit() {
    const error = deliveryProofError({ recipientName: recipient, photo, signature, location });
    if (error) return toast.error(error);
    setBusy(true);
    try {
      const base = `${driverId}/${orderId}`;
      let photoPath = "";
      let signaturePath = "";
      if (photo) {
        photoPath = `${base}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("delivery-proofs").upload(photoPath, photo, { contentType: photo.type || "image/jpeg" });
        if (error) throw error;
      }
      if (signature) {
        signaturePath = `${base}/${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage.from("delivery-proofs").upload(signaturePath, signature, { contentType: "image/png" });
        if (error) throw error;
      }
      const { error } = await supabase.rpc("submit_delivery_proof", { payload: {
        order_id: orderId, recipient_name: recipient, photo_path: photoPath, signature_path: signaturePath,
        lat: location!.lat, lng: location!.lng,
      } });
      if (error) throw error;
      toast.success(`تم تسليم الطلب #${orderNumber} وتوثيقه`);
      await qc.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
      setRecipient(""); setPhoto(null); clearSignature(); setLocation(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ إثبات التسليم");
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="max-h-[92vh] overflow-y-auto" dir="rtl">
      <DialogHeader className="text-right">
        <DialogTitle>إثبات تسليم الطلب #{orderNumber}</DialogTitle>
        <DialogDescription>اسم المستلم وصورة أو توقيع والموقع إلزامية. يُسجل وقت التسليم تلقائياً.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2"><Label htmlFor="recipient">اسم المستلم</Label><Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} autoComplete="name" /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium">
          <Camera className="h-4 w-4" />{photo ? "تمت إضافة الصورة" : "صورة التسليم"}
          <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <Button type="button" variant={location ? "secondary" : "outline"} onClick={locate}><LocateFixed className="h-4 w-4" />{location ? "تم تحديد الموقع" : "موقع التسليم"}</Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label className="flex items-center gap-2"><PenLine className="h-4 w-4" />توقيع المستلم</Label><Button type="button" size="sm" variant="ghost" onClick={clearSignature}><Trash2 className="h-4 w-4" />مسح</Button></div>
        <canvas ref={canvas} width={600} height={220} className="h-36 w-full touch-none rounded-lg border bg-background" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} />
      </div>
      <Button className="w-full" size="lg" disabled={busy} onClick={submit}>{busy ? "جارٍ حفظ الإثبات..." : "تأكيد التسليم وحفظ الإثبات"}</Button>
    </DialogContent>
  </Dialog>;
}
