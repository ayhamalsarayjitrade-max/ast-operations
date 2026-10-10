import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name, phone } },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/dashboard" });
        else toast.success("تم إنشاء الحساب", { description: "افتح بريدك لتأكيد الحساب ثم سجّل الدخول." });
      }
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-primary">ميدان</div>
          <h1 className="text-2xl font-bold">{mode === "in" ? "تسجيل الدخول" : "حساب موظف جديد"}</h1>
        </div>
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
          <Label>البريد الإلكتروني</Label>
          <Input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>كلمة المرور</Label>
          <Input dir="ltr" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy}>
          {mode === "in" ? "دخول" : "إنشاء الحساب"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "ليس لديك حساب؟ أنشئ حساباً" : "لديك حساب؟ سجّل الدخول"}
        </button>
      </form>
    </div>
  );
}
