import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/staff";
import { useMe } from "@/lib/auth";
import { ROLE_LABEL, type AppRole } from "@/lib/orders";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [
    { title: "الفريق والصلاحيات — ميدان" }, { name: "description", content: "إدارة فريق ميدان وربط حسابات العملاء بسجلاتهم فقط." },
    { property: "og:title", content: "الفريق والصلاحيات — ميدان" }, { property: "og:description", content: "إدارة فريق ميدان وربط حسابات العملاء بسجلاتهم فقط." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: TeamPage,
});
const ROLES: AppRole[] = ["admin", "rep", "warehouse", "driver", "customer"];
function TeamPage() {
  const { data: me } = useMe();
  const { data: staff = [] } = useStaff();
  const qc = useQueryClient();
  const { data: customers = [] } = useQuery({ queryKey: ["customers", "team"], queryFn: async () => (await supabase.from("customers").select("id,name,phone").order("name")).data ?? [] });
  const { data: accounts = [] } = useQuery({ queryKey: ["customer-accounts"], queryFn: async () => (await supabase.from("customer_accounts").select("user_id,customer_id")).data ?? [] });
  if (!me?.roles.includes("admin")) return <p>هذه الصفحة للمدير فقط.</p>;
  async function toggle(uid: string, role: AppRole, on: boolean) {
    const { error } = await supabase.rpc("set_user_role", { _user_id: uid, _role: role, _enabled: on });
    if (error) return toast.error(error.message);
    await Promise.all([qc.invalidateQueries({ queryKey: ["staff"] }), qc.invalidateQueries({ queryKey: ["me"] })]);
  }
  async function linkCustomer(uid: string, customerId: string) {
    const result = customerId
      ? await supabase.from("customer_accounts").upsert({ user_id: uid, customer_id: customerId })
      : await supabase.from("customer_accounts").delete().eq("user_id", uid);
    if (result.error) return toast.error(result.error.message);
    toast.success(customerId ? "تم ربط حساب العميل" : "تم إلغاء ربط الحساب");
    await qc.invalidateQueries({ queryKey: ["customer-accounts"] });
  }
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">الفريق والصلاحيات</h1><p className="text-sm text-muted-foreground">أنشئ دعوة من صفحة الدعوات، ثم عيّن الدور. حساب العميل مستقل ويرتبط بسجل عميل واحد.</p></div>
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/60 text-right"><tr><th className="p-3">المستخدم</th><th className="p-3">الجوال</th>{ROLES.map((r) => <th key={r} className="p-3 text-center">{ROLE_LABEL[r]}</th>)}<th className="p-3">سجل العميل</th></tr></thead>
      <tbody>{staff.map((s) => <tr key={s.id} className="border-t"><td className="p-3 font-medium">{s.full_name}</td><td className="p-3" dir="ltr">{s.phone ?? "—"}</td>{ROLES.map((r) => <td key={r} className="p-3 text-center"><Checkbox checked={s.roles.includes(r)} disabled={(s.id === me.id && r === "admin") || (r === "customer" ? s.roles.some((x) => x !== "customer") : s.roles.includes("customer"))} onCheckedChange={(v) => toggle(s.id, r, !!v)} /></td>)}
        <td className="p-3">{s.roles.includes("customer") ? <select aria-label={`ربط ${s.full_name} بعميل`} className="h-9 min-w-44 rounded-md border bg-background px-2" value={accounts.find((a) => a.user_id === s.id)?.customer_id ?? ""} onChange={(e) => linkCustomer(s.id, e.target.value)}><option value="">— اختر العميل —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}</select> : <span className="text-muted-foreground">—</span>}</td>
      </tr>)}</tbody></table></div>
  </div>;
}
