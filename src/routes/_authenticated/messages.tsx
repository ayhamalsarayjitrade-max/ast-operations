import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Copy, MessageCircle, Sparkles, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateCustomerMessage } from "@/lib/ai.functions";
import { blobToDataURL, compressPhoto } from "@/lib/photo";
import { LANGS, useLang, type Lang } from "@/lib/i18n";
import { money } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [
    { title: "رسائل العملاء الذكية — أيهم السريجي للتجارة" },
    { name: "description", content: "صياغة رسائل واتساب للعملاء بالذكاء الاصطناعي من صورة المنتج ووصف قصير." },
    { property: "og:title", content: "رسائل العملاء الذكية — أيهم السريجي للتجارة" },
    { property: "og:description", content: "صياغة رسائل واتساب للعملاء بالذكاء الاصطناعي من صورة المنتج ووصف قصير." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: MessagesPage,
});

const digits = (p: string) => p.replace(/\D/g, "").replace(/^00/, "");

function MessagesPage() {
  const qc = useQueryClient();
  const { lang } = useLang();
  const generate = useServerFn(generateCustomerMessage);
  const { data: customers = [] } = useQuery({ queryKey: ["customers", "msg"], queryFn: async () => (await supabase.from("customers").select("id,name,phone").order("name")).data ?? [] });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [] });
  const { data: examples = [] } = useQuery({ queryKey: ["message_examples"], queryFn: async () => (await supabase.from("message_examples").select("id,content,product_name,created_at").order("created_at", { ascending: false }).limit(10)).data ?? [] });

  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [productId, setProductId] = useState("");
  const [image, setImage] = useState<string>("");
  const [brief, setBrief] = useState("");
  const [outLang, setOutLang] = useState<Lang>(lang);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const customer = customers.find((c) => c.id === customerId);
  const product = products.find((p) => p.id === productId);

  async function pickImage(f?: File) {
    if (!f) return setImage("");
    const small = await compressPhoto(f, 1024, 0.7);
    setImage(await blobToDataURL(small));
  }

  async function run() {
    if (brief.trim().length < 3) { toast.error("اكتب ما تريد قوله للعميل"); return; }
    setBusy(true);
    try {
      const r = await generate({ data: { brief, lang: outLang, customerName: customer?.name, productName: product?.name, productPrice: product ? money(product.price) : undefined, image: image || undefined } });
      setMessage(r.message);
    } catch (e: any) { toast.error(e?.message ?? "تعذر إنشاء الرسالة"); }
    finally { setBusy(false); }
  }

  async function send() {
    const to = digits(phone || customer?.phone || "");
    if (!to) { toast.error("أدخل رقم العميل"); return; }
    // Sent messages become style examples so future drafts sound more like the company.
    void supabase.from("message_examples").insert({ content: message, product_name: product?.name ?? null }).then(() => qc.invalidateQueries({ queryKey: ["message_examples"] }));
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-6 w-6 text-primary" />رسائل العملاء الذكية</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>العميل</Label>
            <select className="h-12 w-full rounded-md border bg-background px-3" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setPhone(""); }}>
              <option value="">— اختر أو اكتب الرقم —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>رقم واتساب</Label><Input className="h-12" dir="ltr" inputMode="tel" placeholder={customer?.phone || "9665XXXXXXXX"} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>المنتج (اختياري)</Label>
            <select className="h-12 w-full rounded-md border bg-background px-3" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">—</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.price)})</option>)}
            </select></div>
          <div className="space-y-1.5"><Label>لغة الرسالة</Label>
            <select className="h-12 w-full rounded-md border bg-background px-3" value={outLang} onChange={(e) => setOutLang(e.target.value as Lang)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select></div>
        </div>
        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium hover:bg-muted">
          <Camera className="h-5 w-5" />{image ? "تم إرفاق صورة المنتج ✓" : "صورة المنتج (اختياري)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickImage(e.target.files?.[0])} />
        </label>
        {image && <img src={image} alt="صورة المنتج" className="h-40 w-full rounded-lg object-contain bg-muted" />}
        <div className="space-y-1.5"><Label>ماذا تريد أن تقول؟</Label><Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="مثال: عرّف العميل بالمنتج الجديد واطلب منه تأكيد طلبه هذا الأسبوع" /></div>
        <Button className="h-12 w-full text-base" disabled={busy} onClick={() => void run()}><Sparkles className="h-5 w-5" />{busy ? "جارٍ الكتابة..." : "اكتب الرسالة"}</Button>
        {message && (
          <div className="space-y-2">
            <Textarea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Button className="h-12" onClick={() => void send()}><MessageCircle className="h-5 w-5" />إرسال واتساب</Button>
              <Button variant="outline" className="h-12" onClick={() => { void navigator.clipboard.writeText(message); toast.success("تم النسخ"); }}><Copy className="h-5 w-5" />نسخ</Button>
            </div>
            <p className="text-xs text-muted-foreground">يفتح واتساب على هذا الجهاز برقم الشركة المسجل فيه. كل رسالة ترسلها تُحفظ ليتعلم منها الذكاء الاصطناعي أسلوب شركتك.</p>
          </div>
        )}
      </section>
      <aside className="space-y-2 rounded-2xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-bold"><ThumbsUp className="h-4 w-4 text-primary" />ما تعلّمه من رسائلكم</h2>
        {examples.length === 0 && <p className="text-sm text-muted-foreground">لا توجد رسائل بعد.</p>}
        {examples.map((e) => (
          <div key={e.id} className="rounded-lg bg-muted/60 p-2 text-sm">
            <p className="line-clamp-4 whitespace-pre-line">{e.content}</p>
            <button className="mt-1 text-xs text-destructive" onClick={async () => { await supabase.from("message_examples").delete().eq("id", e.id); void qc.invalidateQueries({ queryKey: ["message_examples"] }); }}><Trash2 className="inline h-3 w-3" /> حذف</button>
          </div>
        ))}
      </aside>
    </div>
  );
}
