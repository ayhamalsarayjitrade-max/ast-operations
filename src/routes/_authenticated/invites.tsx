import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, MessageCircle, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateInviteMessage } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Invite = { id: string; code: string; label: string; goal: string | null; clicks: number; active: boolean; invite_signups: { count: number }[] };
export const Route = createFileRoute("/_authenticated/invites")({
  head: () => ({ meta: [
    { title: "دعوات الموظفين — ميدان" }, { name: "description", content: "روابط دعوة قابلة للقياس ورسائل واتساب مخصصة للموظفين." },
    { property: "og:title", content: "دعوات الموظفين — ميدان" }, { property: "og:description", content: "روابط دعوة قابلة للقياس ورسائل واتساب مخصصة للموظفين." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: InvitesPage,
});
function InvitesPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateInviteMessage);
  const [label, setLabel] = useState("دعوة فريق المبيعات");
  const [goal, setGoal] = useState("تعريف الموظفين بتسجيل الزيارات والطلبات ومتابعتها من الهاتف");
  const [tone, setTone] = useState<"رسمية" | "تحفيزية" | "إرشادية">("إرشادية");
  const [active, setActive] = useState<Invite | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: invites = [] } = useQuery({ queryKey: ["invites"], queryFn: async () => {
    const { data, error } = await supabase.from("invite_links").select("id,code,label,goal,clicks,active,invite_signups(count)").order("created_at", { ascending: false });
    if (error) throw error; return (data ?? []) as unknown as Invite[];
  } });
  function url(invite: Invite) { return `${window.location.origin}/invite/${invite.code}`; }
  async function copy(invite: Invite) { await navigator.clipboard.writeText(url(invite)); toast.success("تم نسخ رابط الدعوة"); }
  async function create() {
    if (!label.trim()) return toast.error("اكتب اسماً للدعوة");
    setBusy(true);
    try {
      const code = crypto.randomUUID().replaceAll("-", "");
      const { data, error } = await supabase.from("invite_links").insert({ code, label: label.trim(), goal: goal.trim() }).select("id,code,label,goal,clicks,active,invite_signups(count)").single();
      if (error) throw error;
      const invite = data as unknown as Invite; setActive(invite); setMessage("");
      await qc.invalidateQueries({ queryKey: ["invites"] }); toast.success("تم إنشاء الرابط");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء الدعوة"); }
    finally { setBusy(false); }
  }
  async function writeMessage(invite: Invite) {
    setActive(invite); setBusy(true);
    try {
      const result = await generate({ data: { goal: invite.goal || goal, tone, inviteUrl: url(invite) } });
      setMessage(result.message);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء الرسالة"); }
    finally { setBusy(false); }
  }
  async function toggle(invite: Invite) {
    const { error } = await supabase.from("invite_links").update({ active: !invite.active }).eq("id", invite.id);
    if (error) toast.error(error.message); else await qc.invalidateQueries({ queryKey: ["invites"] });
  }
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">دعوات الموظفين</h1><p className="text-sm text-muted-foreground">أنشئ رابطاً مستقلاً لكل حملة وقس النقرات والتسجيلات دون عرض بيانات الشركة للزائر.</p></div>
    <section className="grid gap-4 rounded-xl border bg-card p-5 lg:grid-cols-2"><div className="space-y-3"><div className="space-y-2"><Label htmlFor="invite-label">اسم الدعوة</Label><Input id="invite-label" value={label} onChange={(e) => setLabel(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="invite-goal">هدف الدعوة</Label><Textarea id="invite-goal" value={goal} onChange={(e) => setGoal(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="invite-tone">نبرة الرسالة</Label><select id="invite-tone" className="h-10 w-full rounded-md border bg-background px-3" value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}><option>إرشادية</option><option>تحفيزية</option><option>رسمية</option></select></div><Button disabled={busy} onClick={create}><Plus className="h-4 w-4" />إنشاء رابط دعوة</Button></div>
      <div className="rounded-xl bg-muted/50 p-4"><h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-primary" />رسالة واتساب مخصصة</h2><p className="mt-1 text-xs text-muted-foreground">اختر رابطاً ثم أنشئ الرسالة؛ يمكنك تعديلها قبل فتح واتساب.</p><Textarea aria-label="رسالة الدعوة" className="mt-3 min-h-40 bg-background" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ستظهر الرسالة هنا بعد إنشائها" />{active && <div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => writeMessage(active)}><Sparkles className="h-4 w-4" />{busy ? "جارٍ الإنشاء..." : "إنشاء الرسالة"}</Button>{message && <Button asChild variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />فتح واتساب</a></Button>}</div>}</div>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-bold">أداء الروابط</h2>{invites.length === 0 && <p className="text-muted-foreground">لا توجد روابط بعد.</p>}<div className="grid gap-3 md:grid-cols-2">{invites.map((invite) => { const signups = invite.invite_signups[0]?.count ?? 0; return <article key={invite.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{invite.label}</h3><p className="mt-1 text-xs text-muted-foreground">{invite.active ? "الرابط نشط" : "الرابط متوقف"}</p></div><Button size="icon" variant="ghost" aria-label="نسخ رابط الدعوة" onClick={() => copy(invite)}><Copy className="h-4 w-4" /></Button></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-muted/60 p-2"><b className="block text-xl">{invite.clicks}</b><span className="text-xs text-muted-foreground">نقرة</span></div><div className="rounded-lg bg-muted/60 p-2"><b className="block text-xl">{signups}</b><span className="text-xs text-muted-foreground">تسجيل</span></div><div className="rounded-lg bg-muted/60 p-2"><b className="block text-xl">{invite.clicks ? Math.round(signups / invite.clicks * 100) : 0}%</b><span className="text-xs text-muted-foreground">تحويل</span></div></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setActive(invite); setGoal(invite.goal || goal); setMessage(""); }}>اختيار للرسالة</Button><Button size="sm" variant="ghost" onClick={() => toggle(invite)}>{invite.active ? "إيقاف" : "تفعيل"}</Button></div></article>; })}</div></section>
  </div>;
}
