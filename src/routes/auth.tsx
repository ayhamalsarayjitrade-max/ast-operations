import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resetAdminAccount } from "@/lib/admin-recovery.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homeForRoles } from "@/lib/access";
import type { AppRole } from "@/lib/orders";

export const Route = createFileRoute("/auth")({
  validateSearch: (input: Record<string, unknown>): { mode?: string; invite?: string } => ({
    ...(typeof input["mode"] === "string" ? { mode: input["mode"] } : {}),
    ...(typeof input["invite"] === "string" ? { invite: input["invite"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — أيهم السريجي للتجارة" },
      { name: "description", content: "الدخول إلى نظام أيهم السريجي للتجارة للمبيعات والتوصيل." },
      { property: "og:title", content: "تسجيل الدخول — أيهم السريجي للتجارة" },
      { property: "og:description", content: "الدخول إلى نظام أيهم السريجي للتجارة للمبيعات والتوصيل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up" | "admin" | "forgot">(search.mode === "up" ? "up" : "in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function goHome() {
    const { data: userData } = await supabase.auth.getUser();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user?.id ?? "");
    nav({ to: homeForRoles((roles ?? []).map((r) => r.role as AppRole)) as any });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
        toast.success("تم طلب رابط الاستعادة");
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await goHome();
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name, phone } },
        });
        if (error) throw error;
        if (data.session) {
          if (search.invite) await supabase.rpc("complete_invite_signup", { _code: search.invite });
          await goHome();
        } else toast.success("تم إنشاء الحساب", { description: "سجّل الدخول الآن." });
      } else {
        await resetAdminAccount({ data: { code, email, password, name: name || undefined } });
        await supabase.auth.signOut();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تعيين حساب المدير");
        await goHome();
      }
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "in" ? "تسجيل الدخول" : mode === "up" ? "حساب موظف جديد" : mode === "forgot" ? "استعادة كلمة المرور" : "تعيين حساب المدير";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-primary">أيهم السريجي للتجارة</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {mode === "forgot" && <p className="mt-2 text-sm text-muted-foreground">{sent ? "إذا كان البريد مرتبطاً بحساب، سيصلك رابط آمن لتعيين كلمة مرور جديدة. تحقق أيضاً من البريد غير المرغوب." : "أدخل بريد حساب المدير أو الموظف لاستلام رابط تعيين كلمة مرور جديدة، دون رمز استعادة."}</p>}
          {mode === "admin" && (
            <p className="mt-1 text-xs text-muted-foreground">أدخل رمز الاستعادة، ثم البريد وكلمة المرور الجديدين للمدير. الدخول يتم فوراً.</p>
          )}
        </div>
        {mode === "admin" && (
          <div className="space-y-1.5">
            <Label>رمز الاستعادة</Label>
            <Input dir="ltr" type="password" required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
        )}
        {mode === "up" && (
          <>
            <div className="space-y-1.5">
              <Label>الاسم الكامل</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الجوال</Label>
              <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label>{mode === "admin" ? "بريد المدير" : "البريد الإلكتروني"}</Label>
          <Input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "forgot" && <div className="space-y-1.5">
          <Label>{mode === "admin" ? "كلمة المرور الجديدة" : "كلمة المرور"}</Label>
          <Input dir="ltr" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>}
        <Button className="w-full" disabled={busy}>
          {busy ? "جارٍ التنفيذ..." : mode === "in" ? "دخول" : mode === "up" ? "إنشاء الحساب" : mode === "forgot" ? "إرسال رابط الاستعادة" : "حفظ والدخول كمدير"}
        </Button>
        <div className="flex flex-col gap-1">
          {mode === "in" && <Button type="button" variant="link" onClick={() => { setMode("forgot"); setSent(false); }}>نسيت كلمة المرور؟ استعادة حساب المدير</Button>}
          <Button type="button" variant="ghost" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}
          </Button>
          {mode !== "admin" && (
            <Button type="button" variant="link" className="text-xs" onClick={() => setMode("admin")}>
              لدي رمز استعادة المدير
            </Button>
          )}
        </div>
        <div className="flex justify-center gap-3 text-xs"><Link to="/privacy" className="text-muted-foreground underline">الخصوصية</Link><Link to="/terms" className="text-muted-foreground underline">الشروط</Link></div>
      </form>
    </div>
  );
}
