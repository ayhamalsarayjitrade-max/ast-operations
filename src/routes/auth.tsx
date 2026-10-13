import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resetAdminAccount } from "@/lib/admin-recovery.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — ميدان" },
      { name: "description", content: "الدخول إلى نظام ميدان للمبيعات والتوصيل." },
      { property: "og:title", content: "تسجيل الدخول — ميدان" },
      { property: "og:description", content: "الدخول إلى نظام ميدان للمبيعات والتوصيل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "admin">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name, phone } },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/dashboard" });
        else toast.success("تم إنشاء الحساب", { description: "سجّل الدخول الآن." });
      } else {
        await resetAdminAccount({ data: { code, email, password, name: name || undefined } });
        await supabase.auth.signOut();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تعيين حساب المدير");
        nav({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "in" ? "تسجيل الدخول" : mode === "up" ? "حساب موظف جديد" : "تعيين حساب المدير";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-primary">ميدان</div>
          <h1 className="text-2xl font-bold">{title}</h1>
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
        <div className="space-y-1.5">
          <Label>{mode === "admin" ? "كلمة المرور الجديدة" : "كلمة المرور"}</Label>
          <Input dir="ltr" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy}>
          {mode === "in" ? "دخول" : mode === "up" ? "إنشاء الحساب" : "حفظ والدخول كمدير"}
        </Button>
        <div className="flex flex-col gap-1">
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}
          </button>
          {mode !== "admin" && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("admin")}>
              تعيين / استعادة حساب المدير
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
