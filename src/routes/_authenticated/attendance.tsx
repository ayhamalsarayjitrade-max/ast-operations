import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogIn, LogOut, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { calcPayroll, curMonth, fmtH, getPosition, money, monthRange, LEAVE_LABEL, LEAVE_STATUS } from "@/lib/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [
    { title: "الحضور والانصراف — أيهم السريجي للتجارة" },
    { name: "description", content: "تسجيل الحضور والانصراف بالموقع وطلبات الإجازة." },
    { property: "og:title", content: "الحضور والانصراف — أيهم السريجي للتجارة" },
    { property: "og:description", content: "تسجيل الحضور والانصراف بالموقع وطلبات الإجازة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const month = curMonth();
  const { start, end } = monthRange(month);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const { data } = useQuery({
    queryKey: ["attendance", "me", month, me?.id],
    enabled: !!me,
    queryFn: async () => {
      const [att, lv, pay, adj] = await Promise.all([
        supabase.from("attendance").select("*").eq("user_id", me!.id).gte("check_in", start.toISOString()).lt("check_in", end.toISOString()).order("check_in", { ascending: false }),
        supabase.from("leaves").select("*").eq("user_id", me!.id).order("created_at", { ascending: false }),
        supabase.from("employee_pay").select("*").eq("user_id", me!.id).maybeSingle(),
        supabase.from("pay_adjustments").select("*").eq("user_id", me!.id).eq("month", month),
      ]);
      return { att: att.data ?? [], leaves: lv.data ?? [], pay: pay.data, adj: adj.data ?? [] };
    },
  });
  const open = data?.att.find((a) => !a.check_out);
  const [busy, setBusy] = useState(false);
  const [lv, setLv] = useState({ kind: "annual", start_date: "", end_date: "", reason: "" });

  async function punch() {
    setBusy(true);
    const pos = await getPosition();
    if (!pos) toast.warning("تعذر تحديد الموقع — سيتم التسجيل بدون موقع");
    const { error } = open
      ? await supabase.from("attendance").update({ check_out: new Date().toISOString(), out_lat: pos?.lat ?? null, out_lng: pos?.lng ?? null }).eq("id", open.id)
      : await supabase.from("attendance").insert({ in_lat: pos?.lat ?? null, in_lng: pos?.lng ?? null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    notify(open ? "تم تسجيل الانصراف" : "تم تسجيل الحضور", new Date().toLocaleTimeString("ar"), "success");
    qc.invalidateQueries({ queryKey: ["attendance"] });
  }

  async function requestLeave(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("leaves").insert({ ...lv, paid: lv.kind !== "unpaid" });
    if (error) { toast.error(error.message); return; }
    toast.success("تم إرسال طلب الإجازة");
    setLv({ kind: "annual", start_date: "", end_date: "", reason: "" });
    qc.invalidateQueries({ queryKey: ["attendance"] });
  }

  const s = data ? calcPayroll(month, data.pay ?? undefined, data.att, data.leaves, data.adj) : null;
  const liveH = open ? (now - new Date(open.check_in).getTime()) / 36e5 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الحضور والانصراف</h1>
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-muted-foreground">{open ? `حاضر منذ ${new Date(open.check_in).toLocaleTimeString("ar")} · ${fmtH(liveH)}` : "لم تسجل حضورك بعد"}</p>
        <Button size="lg" className="mt-4 h-16 w-full max-w-xs text-lg" variant={open ? "destructive" : "default"} disabled={busy || !data} onClick={punch}>
          {open ? <LogOut className="ml-2 h-5 w-5" /> : <LogIn className="ml-2 h-5 w-5" />}
          {open ? "تسجيل انصراف" : "تسجيل حضور"}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />يُحفظ موقعك عند كل تسجيل</p>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["أيام الحضور", s.present], ["ساعات العمل", fmtH(s.hours)], ["دقائق التأخير", Math.round(s.lateMin)], ["صافي متوقع", money(s.net)]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="text-xl font-bold">{v}</div></div>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">سجل هذا الشهر</h2>
          <div className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {data?.att.map((a) => (
              <div key={a.id} className="flex justify-between border-b pb-2">
                <span>{new Date(a.check_in).toLocaleDateString("ar")}</span>
                <span dir="ltr">{new Date(a.check_in).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })} — {a.check_out ? new Date(a.check_out).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : "…"}</span>
              </div>
            ))}
            {!data?.att.length && <p className="text-muted-foreground">لا يوجد سجل</p>}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">طلب إجازة</h2>
          <form onSubmit={requestLeave} className="space-y-3">
            <select className="h-10 w-full rounded-md border bg-background px-3" value={lv.kind} onChange={(e) => setLv({ ...lv, kind: e.target.value })}>
              {Object.entries(LEAVE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>من</Label><Input type="date" required value={lv.start_date} onChange={(e) => setLv({ ...lv, start_date: e.target.value })} /></div>
              <div><Label>إلى</Label><Input type="date" required value={lv.end_date} onChange={(e) => setLv({ ...lv, end_date: e.target.value })} /></div>
            </div>
            <Input placeholder="السبب" value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} />
            <Button className="w-full">إرسال الطلب</Button>
          </form>
          <div className="mt-4 space-y-2 text-sm">
            {data?.leaves.map((l) => (
              <div key={l.id} className="flex justify-between border-b pb-2">
                <span>{LEAVE_LABEL[l.kind]} · {l.start_date} ← {l.end_date}</span>
                <span className="font-medium">{LEAVE_STATUS[l.status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
