import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, MapPinned, Warehouse, Truck, Navigation, Users, LogOut, Bell, Clock, Wallet, Camera, KeyRound, ClipboardCheck, UserRoundPlus, MessageCircle, Menu as MenuIcon, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, hasRole } from "@/lib/auth";
import { notify, askNotificationPermission, unlockAudio } from "@/lib/notify";
import { STATUS_LABEL, ROLE_LABEL, type AppRole, type OrderStatus } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FieldSyncStatus } from "@/components/FieldSyncStatus";
import { StaffTour } from "@/components/StaffTour";
import { canAccessPath, homeForRoles } from "@/lib/access";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InstallBanner, InstallCard } from "@/components/InstallApp";
import { LANGS, setLang, useLang, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Offline access restores only a previously authenticated session; RLS still validates all synced writes.
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

type NavItem = { to: string; k: TKey; icon: any; group: "field" | "ops" | "people" };
const NAV: NavItem[] = [
  { to: "/dashboard", k: "home", icon: LayoutDashboard, group: "people" },
  { to: "/rep", k: "rep", icon: MapPinned, group: "field" },
  { to: "/messages", k: "messages", icon: MessageCircle, group: "field" },
  { to: "/visits", k: "visits", icon: Camera, group: "field" },
  { to: "/warehouse", k: "warehouse", icon: Warehouse, group: "ops" },
  { to: "/dispatch", k: "dispatch", icon: Navigation, group: "ops" },
  { to: "/driver", k: "driver", icon: Truck, group: "ops" },
  { to: "/deliveries", k: "deliveries", icon: ClipboardCheck, group: "ops" },
  { to: "/attendance", k: "attendance", icon: Clock, group: "people" },
  { to: "/payroll", k: "payroll", icon: Wallet, group: "people" },
  { to: "/team", k: "team", icon: Users, group: "people" },
  { to: "/invites", k: "invites", icon: UserRoundPlus, group: "people" },
];
// Bottom bar keeps only the 3 most-used screens per role; everything else lives in the menu.
function primaryFor(roles: AppRole[]): string[] {
  if (roles.includes("admin")) return ["/dashboard", "/dispatch", "/payroll"];
  if (roles.includes("warehouse")) return ["/warehouse", "/dispatch", "/attendance"];
  if (roles.includes("driver")) return ["/driver", "/attendance"];
  if (roles.includes("rep")) return ["/rep", "/messages", "/attendance"];
  return [];
}

function Layout() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t, lang, dir } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Opening a screen outside your role (old shortcut, shared link) goes straight to your own home screen.
  const blocked = !!me && me.roles.length > 0 && !canAccessPath(me.roles, pathname);
  useEffect(() => { if (blocked && me) nav({ to: homeForRoles(me.roles) as any, replace: true }); }, [blocked, me, nav]);
  const items = me ? NAV.filter((n) => canAccessPath(me.roles, n.to)) : [];
  const primary = me ? primaryFor(me.roles).map((to) => items.find((i) => i.to === to)).filter(Boolean) as NavItem[] : [];
  const groups: [NavItem["group"], TKey][] = [["field", "g_field"], ["ops", "g_ops"], ["people", "g_people"]];

  const menu = (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetContent side={dir === "rtl" ? "right" : "left"} className="flex w-[86vw] max-w-sm flex-col gap-0 overflow-y-auto p-0">
        <SheetHeader className="border-b p-4 text-start">
          <SheetTitle className="flex items-center gap-2"><img src="/icons/ast-192.png" alt="" className="h-9 w-9 rounded-lg" />أيهم السريجي للتجارة</SheetTitle>
          <p className="text-sm text-muted-foreground">{me?.name}{me?.roles.length ? ` · ${me.roles.map((r) => ROLE_LABEL[r]).join("، ")}` : ""}</p>
        </SheetHeader>
        <div className="flex-1 space-y-4 p-3">
          {groups.map(([g, label]) => {
            const list = items.filter((i) => i.group === g);
            if (!list.length) return null;
            return (
              <div key={g}>
                <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{t(label)}</div>
                {list.map((n) => (
                  <Link key={n.to} to={n.to as any} onClick={() => setMenuOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-base hover:bg-muted"
                    activeProps={{ className: "bg-secondary font-semibold text-secondary-foreground" }}>
                    <n.icon className="h-5 w-5" />{t(n.k)}
                  </Link>
                ))}
              </div>
            );
          })}
          <InstallCard />
          <div>
            <div className="flex items-center gap-2 px-2 pb-1 text-xs font-semibold text-muted-foreground"><Languages className="h-4 w-4" />{t("language")}</div>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)} className={`min-h-11 rounded-lg border text-sm ${lang === l.code ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>{l.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-1 border-t p-3">
          <Button variant="ghost" className="h-12 justify-start text-base" onClick={() => { setMenuOpen(false); void enableNotifs(); }}><Bell className="h-5 w-5" />{t("notifications")}</Button>
          <Button variant="ghost" className="h-12 justify-start text-base" onClick={() => { setMenuOpen(false); nav({ to: "/reset-password" }); }}><KeyRound className="h-5 w-5" />{t("password")}</Button>
          <Button variant="ghost" className="h-12 justify-start text-base text-destructive" onClick={async () => { await supabase.auth.signOut(); qc.clear(); nav({ to: "/auth" }); }}><LogOut className="h-5 w-5" />{t("logout")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
          <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={t("menu")} onClick={() => setMenuOpen(true)}><MenuIcon className="h-6 w-6" /></Button>
          <img src="/icons/ast-192.png" alt="" className="h-8 w-8 rounded-md" />
          <div className="truncate font-bold text-primary">أيهم السريجي للتجارة</div>
          <nav className="hidden flex-1 justify-end gap-1 lg:flex">
            {items.slice(0, 7).map((n) => (
              <Link key={n.to} to={n.to as any} preload="intent"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}>
                <n.icon className="h-4 w-4" />{t(n.k)}
              </Link>
            ))}
          </nav>
          <Button size="icon" variant="ghost" className="ms-auto h-11 w-11 lg:ms-0" onClick={enableNotifs} aria-label={t("notifications")}><Bell className="h-5 w-5" /></Button>
        </div>
      </header>
      {menu}
      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 lg:pb-6">
        <InstallBanner />
        {me && me.roles.includes("rep") && <StaffTour userId={me.id} enabled />}
        {me && <FieldSyncStatus owner={me.id} />}
        {me && me.roles.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">{t("waiting_role")}</h2>
            <p className="mt-2 text-muted-foreground">{t("waiting_role_desc")}</p>
          </div>
        ) : me && !canAccessPath(me.roles, pathname) ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="text-xl font-bold">{t("no_access")}</h2>
            <Button className="mt-4 h-12" onClick={() => nav({ to: homeForRoles(me.roles) as any })}>{t("back_home")}</Button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card lg:hidden" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0,1fr))`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {primary.map((n) => (
          <Link key={n.to} to={n.to as any} preload="intent"
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[13px] text-muted-foreground active:bg-muted"
            activeProps={{ className: "text-primary font-bold" }}>
            <n.icon className="h-6 w-6" /><span className="truncate px-1">{t(n.k)}</span>
          </Link>
        ))}
        <button onClick={() => setMenuOpen(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[13px] text-muted-foreground active:bg-muted">
          <MenuIcon className="h-6 w-6" />{t("menu")}
        </button>
      </nav>
    </div>
  );
}
