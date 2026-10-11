import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useStaff } from "@/lib/staff";
import { calcPayroll, curMonth, DEFAULT_PAY, fmtH, money, monthRange, LEAVE_LABEL } from "@/lib/hr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({ meta: [{ title: "الموارد البشرية والرواتب — ميدان" }, { name: "description", content: "الحضور والإجازات والبدلات والخصومات ومسير الرواتب." }] }),
  component: PayrollPage,
});

const FIELDS: [string, string][] = [
  ["base_salary", "الراتب الأساسي"], ["housing_allowance", "بدل سكن"], ["transport_allowance", "بدل نقل"], ["other_allowance", "بدلات أخرى"],
  ["daily_hours", "ساعات اليوم"], ["work_days", "أيام العمل/شهر"], ["overtime_rate", "معامل الإضافي"],
];

function PayrollPage() {
  const { data: me } = useMe();
  const { data: staff = [] } = useStaff();
  const qc = useQueryClient();
  const [month, setMonth] = useState(curMonth());
  const [tab, setTab] = useState<"run" | "today" | "leaves" | "settings">("run");
  const { start, end } = monthRange(month);
  const isAdmin = !!me?.roles.includes("admin");

  const { data } = useQuery({
    queryKey: ["attendance", "all", month],
    enabled: isAdmin,
    queryFn: async () => {
      const [att, lv, pay, adj] = await Promise.all([
        supabase.from("attendance").select("*").gte("check_in", start.toISOString()).lt("check_in", end.toISOString()).order("check_in", { ascending: false }),
        supabase.from("leaves").select("*").order("created_at", { ascending: false }),
        supabase.from("employee_pay").select("*"),
        supabase.from("pay_adjustments").select("*").eq("month", month),
      ]);
      return { att: att.data ?? [], leaves: lv.data ?? [], pay: pay.data ?? [], adj: adj.data ?? [] };
    },
  });
  if (!isAdmin) return <p>هذه الصفحة للمدير فقط.</p>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["attendance"] });
  const name = (id: string) => staff.find((s) => s.id === id)?.full_name ?? "—";
  const rows = staff.map((s) => ({
    s,
    r: calcPayroll(month, data?.pay.find((p) => p.user_id === s.id) as any, (data?.att ?? []).filter((a) => a.user_id === s.id), (data?.leaves ?? []).filter((l) => l.user_id === s.id), (data?.adj ?? []).filter((a) => a.user_id === s.id)),
  }));

  function whatsapp() {
    const lines = rows.map(({ s, r }) => `• ${s.full_name}: حضور ${r.present} يوم، ${fmtH(r.hours)}، خصومات ${money(r.deductions)}، الصافي ${money(r.net)}`);
    const total = rows.reduce((t, x) => t + x.r.net, 0);
    window.open(`https://wa.me/?text=${encodeURIComponent(`مسير رواتب ${month}\n${lines.join("\n")}\nالإجمالي: ${money(total)}`)}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">الموارد البشرية والرواتب</h1>
        <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {([["run", "مسير الرواتب"], ["today", "سجل الحضور"], ["leaves", "الإجازات"], ["settings", "الرواتب والبدلات"]] as const).map(([k, v]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{v}</Button>
        ))}
      </div>

      {tab === "run" && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-right"><tr>
                {["الموظف", "حضور", "ساعات", "إضافي", "تأخير(د)", "غياب", "إجازة مدفوعة", "الأساسي+البدلات", "الإضافي", "خصومات", "الصافي"].map((h) => <th key={h} className="p-2">{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(({ s, r }) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2 font-medium">{s.full_name}</td>
                    <td className="p-2">{r.present}</td><td className="p-2">{fmtH(r.hours)}</td><td className="p-2">{fmtH(r.overtimeH)}</td>
                    <td className="p-2">{Math.round(r.lateMin)}</td><td className="p-2">{r.absent + r.unpaidLeave}</td><td className="p-2">{r.paidLeave}</td>
                    <td className="p-2">{money(Number(r.pay.base_salary) + r.allowances + r.extraAllow)}</td>
                    <td className="p-2">{money(r.overtime)}</td>
                    <td className="p-2 text-destructive">{money(r.deductions)}</td>
                    <td className="p-2 font-bold text-primary">{money(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">الغياب يُحسب حتى اليوم للشهر الحالي · سماح التأخير 10 دقائق</p>
            <Button onClick={whatsapp}><MessageCircle className="ml-2 h-4 w-4" />إرسال المسير عبر واتساب</Button>
          </div>
          <AdjustForm staff={staff} month={month} onDone={refresh} />
          <div className="space-y-1 text-sm">
            {data?.adj.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded border bg-card px-3 py-2">
                <span>{name(a.user_id)} · {a.kind === "allowance" ? "بدل/مكافأة" : "خصم"} {money(Number(a.amount))} {a.note && `— ${a.note}`}</span>
                <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("pay_adjustments").delete().eq("id", a.id); refresh(); }}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "today" && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-right"><tr>{["الموظف", "التاريخ", "حضور", "انصراف", "المدة", "الموقع"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
            <tbody>
              {data?.att.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-2">{name(a.user_id)}</td>
                  <td className="p-2">{new Date(a.check_in).toLocaleDateString("ar")}</td>
                  <td className="p-2">{new Date(a.check_in).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="p-2">{a.check_out ? new Date(a.check_out).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : <span className="text-primary">حاضر الآن</span>}</td>
                  <td className="p-2">{a.check_out ? fmtH((new Date(a.check_out).getTime() - new Date(a.check_in).getTime()) / 36e5) : "—"}</td>
                  <td className="p-2">{a.in_lat ? <a className="text-primary underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${a.in_lat},${a.in_lng}`}>عرض</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "leaves" && (
        <div className="space-y-2">
          {data?.leaves.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm">
              <span><b>{name(l.user_id)}</b> · {LEAVE_LABEL[l.kind]} ({l.paid ? "مدفوعة" : "غير مدفوعة"}) · {l.start_date} ← {l.end_date} {l.reason && `· ${l.reason}`}</span>
              {l.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => { await supabase.from("leaves").update({ status: "approved" }).eq("id", l.id); refresh(); }}><Check className="ml-1 h-4 w-4" />قبول</Button>
                  <Button size="sm" variant="outline" onClick={async () => { await supabase.from("leaves").update({ status: "rejected" }).eq("id", l.id); refresh(); }}>رفض</Button>
                </div>
              ) : <span className="font-medium">{l.status === "approved" ? "مقبولة" : "مرفوضة"}</span>}
            </div>
          ))}
          {!data?.leaves.length && <p className="text-muted-foreground">لا توجد طلبات</p>}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-3">
          {staff.map((s) => <PayRow key={s.id} id={s.id} name={s.full_name} pay={data?.pay.find((p) => p.user_id === s.id)} onDone={refresh} />)}
        </div>
      )}
    </div>
  );
}

function PayRow({ id, name, pay, onDone }: { id: string; name: string; pay: any; onDone: () => void }) {
  const [v, setV] = useState<any>({ ...DEFAULT_PAY, ...(pay ?? {}) });
  async function save() {
    const row: any = { user_id: id, shift_start: v.shift_start, updated_at: new Date().toISOString() };
    FIELDS.forEach(([k]) => (row[k] = Number(v[k]) || 0));
    const { error } = await supabase.from("employee_pay").upsert(row);
    if (error) return toast.error(error.message);
    toast.success(`تم حفظ بيانات ${name}`);
    onDone();
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 font-semibold">{name}</div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
        {FIELDS.map(([k, l]) => (
          <div key={k}><Label className="text-xs">{l}</Label><Input type="number" step="any" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
        ))}
        <div><Label className="text-xs">بداية الدوام</Label><Input type="time" value={String(v.shift_start).slice(0, 5)} onChange={(e) => setV({ ...v, shift_start: e.target.value })} /></div>
      </div>
      <Button size="sm" className="mt-3" onClick={save}>حفظ</Button>
    </div>
  );
}

function AdjustForm({ staff, month, onDone }: { staff: { id: string; full_name: string }[]; month: string; onDone: () => void }) {
  const [f, setF] = useState({ user_id: "", kind: "allowance", amount: "", note: "" });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("pay_adjustments").insert({ ...f, amount: Number(f.amount), month });
    if (error) return toast.error(error.message);
    setF({ ...f, amount: "", note: "" });
    onDone();
  }
  return (
    <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
      <select required className="h-10 rounded-md border bg-background px-3" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}>
        <option value="">اختر الموظف</option>
        {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
      </select>
      <select className="h-10 rounded-md border bg-background px-3" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
        <option value="allowance">بدل / مكافأة</option><option value="deduction">خصم</option>
      </select>
      <Input required type="number" step="any" placeholder="المبلغ" className="w-32" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
      <Input placeholder="ملاحظة" className="w-48" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <Button>إضافة</Button>
    </form>
  );
}
