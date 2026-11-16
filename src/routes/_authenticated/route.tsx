import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, MapPinned, Warehouse, Truck, Navigation, Users, LogOut, Bell, Clock, Wallet, Camera, KeyRound, ClipboardCheck, UserRoundPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, hasRole } from "@/lib/auth";
import { notify, askNotificationPermission, unlockAudio } from "@/lib/notify";
import { STATUS_LABEL, ROLE_LABEL, type AppRole, type OrderStatus } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FieldSyncStatus } from "@/components/FieldSyncStatus";
import { StaffTour } from "@/components/StaffTour";
import { canAccessPath, homeForRoles } from "@/lib/access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Offline access restores only a previously authenticated session; RLS still validates all synced writes.
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

const NAV: { to: string; label: string; icon: any; roles: AppRole[] }[] = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, roles: ["rep", "warehouse", "driver"] },
  { to: "/rep", label: "المندوب", icon: MapPinned, roles: ["rep"] },
  { to: "/warehouse", label: "المستودع", icon: Warehouse, roles: ["warehouse"] },
  { to: "/dispatch", label: "الإسناد والتتبع", icon: Navigation, roles: ["warehouse"] },
  { to: "/driver", label: "السائق", icon: Truck, roles: ["driver"] },
  { to: "/deliveries", label: "إثباتات التسليم", icon: ClipboardCheck, roles: ["warehouse"] },
  { to: "/visits", label: "الزيارات", icon: Camera, roles: ["warehouse"] },
  { to: "/invites", label: "الدعوات", icon: UserRoundPlus, roles: [] },
  { to: "/attendance", label: "الحضور", icon: Clock, roles: ["rep", "warehouse", "driver"] },
  { to: "/payroll", label: "الرواتب", icon: Wallet, roles: [] },
  { to: "/team", label: "الفريق", icon: Users, roles: [] },
];

function Layout() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      try {
        if ("Notification" in window && Notification.permission === "default" && window.top === window.self) {
          void Notification.requestPermission();
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const ch = supabase
      .channel("live-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        qc.invalidateQueries({ queryKey: ["orders"] });
        qc.invalidateQueries({ queryKey: ["products"] });
        const m = meRef.current;
        if (!m) return;
        const n: any = p.new;
        const o: any = p.old;
        if (p.eventType === "INSERT" && hasRole(m, "warehouse")) {
          notify("طلب جديد", `طلب #${n.number} بانتظار التجهيز`, "alert");
        } else if (p.eventType === "UPDATE") {
          if (n.driver_id === m.id && o?.driver_id !== m.id) {
            notify("طلب مسند إليك", `طلب #${n.number} — راجع تفاصيل التسليم`, "alert");
          } else if (n.status !== o?.status && n.status) {
            const s = n.status as OrderStatus;
            if (n.rep_id === m.id || hasRole(m, "warehouse")) {
              notify(`طلب #${n.number}`, `الحالة: ${STATUS_LABEL[s]}`, s === "delivered" ? "success" : "info");
            }
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations" }, () =>
        qc.invalidateQueries({ queryKey: ["driver_locations"] }),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visits" }, () =>
        qc.invalidateQueries({ queryKey: ["visits"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () =>
        qc.invalidateQueries({ queryKey: ["products"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () =>
        qc.invalidateQueries({ queryKey: ["attendance"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "leaves" }, (p) => {
        qc.invalidateQueries({ queryKey: ["attendance"] });
        const m = meRef.current;
        const n: any = p.new;
        if (!m) return;
        if (p.eventType === "INSERT" && m.roles.includes("admin")) notify("طلب إجازة جديد", "راجع صفحة الرواتب", "alert");
        else if (p.eventType === "UPDATE" && n.user_id === m.id) notify("تحديث طلب الإجازة", n.status === "approved" ? "تم قبول إجازتك" : "تم رفض إجازتك", n.status === "approved" ? "success" : "info");
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [qc]);

  // Delivery-time reminders: check every minute, alert once per order per stage
  useEffect(() => {
    const seen = new Set<string>();
    async function check() {
      const m = meRef.current;
      if (!m) return;
      const soon = new Date(Date.now() + 30 * 60_000).toISOString();
      let q = supabase
        .from("orders")
        .select("id, number, delivery_at, driver_id, rep_id, status")
        .in("status", ["new", "preparing", "ready", "assigned", "out_for_delivery"])
        .not("delivery_at", "is", null)
        .lte("delivery_at", soon);
      if (!hasRole(m, "warehouse")) q = q.or(`driver_id.eq.${m.id},rep_id.eq.${m.id}`);
      const { data } = await q;
      for (const o of data ?? []) {
        if (!o.delivery_at) continue;
        const late = new Date(o.delivery_at).getTime() < Date.now();
        const key = `${o.id}:${late ? "late" : "soon"}`;
        if (seen.has(key)) continue;
        seen.add(key);
        notify(
          late ? `تأخر تسليم #${o.number}` : `موعد تسليم قريب #${o.number}`,
          late ? "تجاوز موعد التسليم المحدد" : `خلال أقل من 30 دقيقة — ${STATUS_LABEL[o.status as OrderStatus]}`,
          "alert",
        );
      }
    }
    const t0 = setTimeout(check, 4000);
    const t = setInterval(check, 60_000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);

  async function enableNotifs() {
    const r = await askNotificationPermission();
    if (r === "granted") notify("الإشعارات مفعّلة", "ستصلك التنبيهات الصوتية والمرئية", "success");
    else if (r === "iframe") toast.info("افتح التطبيق في نافذة مستقلة لتفعيل إشعارات المتصفح. الأصوات تعمل الآن.");
    else toast.error("الإشعارات مرفوضة — فعّلها من إعدادات المتصفح");
  }

  const items = NAV.filter((n) => hasRole(me, ...n.roles));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="font-bold text-primary">أيهم السريجي للتجارة</div>
          <nav className="hidden flex-1 gap-1 md:flex">
            {items.map((n) => (
              <Link
                key={n.to}
                to={n.to as any}
                preload="intent"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mr-auto flex items-center gap-2 md:mr-0">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {me?.name} {me?.roles.length ? `· ${me.roles.map((r) => ROLE_LABEL[r]).join("، ")}` : ""}
            </span>
            <Button size="icon" variant="ghost" onClick={enableNotifs} aria-label="تفعيل الإشعارات">
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="تغيير كلمة المرور"
              onClick={async () => {
                nav({ to: "/reset-password" });
              }}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="خروج"
              onClick={async () => {
                await supabase.auth.signOut();
                nav({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        {me && me.roles.includes("rep") && <StaffTour userId={me.id} enabled />}
        {me && !me.roles.includes("customer") && <FieldSyncStatus owner={me.id} />}
        {me && me.roles.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">بانتظار تحديد الصلاحية</h2>
            <p className="mt-2 text-muted-foreground">اطلب من المدير تعيين دورك (مندوب، مستودع، سائق، عميل).</p>
          </div>
        ) : me && !canAccessPath(me.roles, pathname) ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">هذه الواجهة غير متاحة لدورك</h2>
            <p className="mt-2 text-muted-foreground">لكل حساب واجهته وبياناته فقط.</p>
            <Button className="mt-4" onClick={() => nav({ to: homeForRoles(me.roles) as any })}>العودة إلى واجهتي</Button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-start overflow-x-auto border-t bg-card py-2 md:hidden">
        {items.map((n) => (
          <Link
            key={n.to}
            to={n.to as any}
            preload="intent"
            className="flex shrink-0 flex-col items-center gap-0.5 px-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
