import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/staff";
import { useMe } from "@/lib/auth";
import { ROLE_LABEL, type AppRole } from "@/lib/orders";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [
    { title: "الفريق والصلاحيات — ميدان" },
    { name: "description", content: "إدارة فريق ميدان وتعيين صلاحيات الموظفين." },
    { property: "og:title", content: "الفريق والصلاحيات — ميدان" },
    { property: "og:description", content: "إدارة فريق ميدان وتعيين صلاحيات الموظفين." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TeamPage,
});

const ROLES: AppRole[] = ["admin", "rep", "warehouse", "driver"];

function TeamPage() {
  const { data: me } = useMe();
  const { data: staff = [] } = useStaff();
  const qc = useQueryClient();

  if (!me?.roles.includes("admin")) return <p>هذه الصفحة للمدير فقط.</p>;

  async function toggle(uid: string, role: AppRole, on: boolean) {
    const { error } = await supabase.rpc("set_user_role", { _user_id: uid, _role: role, _enabled: on });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["staff"] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الفريق والصلاحيات</h1>
        <p className="text-sm text-muted-foreground">يسجل الموظف حسابه من صفحة الدخول، ثم تعيّن له دوره هنا.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-right">
            <tr>
              <th className="p-3">الموظف</th>
              <th className="p-3">الجوال</th>
              {ROLES.map((r) => <th key={r} className="p-3 text-center">{ROLE_LABEL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.full_name}</td>
                <td className="p-3" dir="ltr">{s.phone ?? "—"}</td>
                {ROLES.map((r) => (
                  <td key={r} className="p-3 text-center">
                    <Checkbox
                      checked={s.roles.includes(r)}
                      disabled={s.id === me.id && r === "admin"}
                      onCheckedChange={(v) => toggle(s.id, r, !!v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
