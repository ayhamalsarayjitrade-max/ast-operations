import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { homeForRoles } from "@/lib/access";
import type { AppRole } from "@/lib/orders";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "تغيير كلمة المرور — أيهم السريجي للتجارة" },
    { name: "description", content: "استعادة الوصول الآمن إلى حسابك في أيهم السريجي للتجارة وتعيين كلمة مرور جديدة." },
    { property: "og:title", content: "تغيير كلمة المرور — أيهم السريجي للتجارة" },
    { property: "og:description", content: "استعادة الوصول الآمن إلى حسابك في أيهم السريجي للتجارة وتعيين كلمة مرور جديدة." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    // Recovery event is handled here only, not a second global identity subscriber.
    const hashRecovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    setRecovery(hashRecovery);
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") { setRecovery(true); setReady(true); }
    });
    void supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser(recovery ? { password } : { password, current_password: current });
      if (error) throw error;
      toast.success("تم تغيير كلمة المرور");
      const { data: userData } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user?.id ?? "");
      nav({ to: homeForRoles((roles ?? []).map((r) => r.role as AppRole)) as any });
    } catch (error) { toast.error(error instanceof Error ? error.message : (error as { message?: string }).message || "تعذر تغيير كلمة المرور"); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-4">
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6">
      <div className="font-bold text-primary">أيهم السريجي للتجارة</div><h1 className="text-2xl font-bold">تغيير كلمة المرور</h1>
      {ready ? <>
        {!recovery && <div className="space-y-2"><Label htmlFor="current-password">كلمة المرور الحالية</Label><Input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} /></div>}
        <div className="space-y-2"><Label htmlFor="new-password">كلمة المرور الجديدة</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="confirm-password">تأكيد كلمة المرور</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
        <Button disabled={busy} className="w-full">{busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}</Button>
      </> : <p className="text-sm text-muted-foreground">افتح رابط الاستعادة المرسل لبريدك، أو سجّل الدخول لتغيير كلمة المرور.</p>}
      {ready && !recovery && <div className="border-t pt-4"><p className="mb-3 text-xs text-muted-foreground">حذف الحساب إجراء نهائي ولا يمكن التراجع عنه.</p><DeleteAccountButton /></div>}
      <div className="flex justify-center gap-3 text-xs"><Button asChild variant="link"><Link to="/auth">العودة لتسجيل الدخول</Link></Button><Button asChild variant="link"><Link to="/privacy">الخصوصية</Link></Button></div>
    </form>
  </main>;
}