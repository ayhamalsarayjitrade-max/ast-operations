import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invite/$code")({
  head: () => ({ meta: [
    { title: "دعوة للانضمام — ميدان" }, { name: "description", content: "اقبل دعوة فريقك وأنشئ حسابك للعمل عبر ميدان." },
    { property: "og:title", content: "دعوة للانضمام — ميدان" }, { property: "og:description", content: "اقبل دعوة فريقك وأنشئ حسابك للعمل عبر ميدان." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: InvitePage,
});
function InvitePage() {
  const { code } = Route.useParams();
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return; recorded.current = true;
    void supabase.rpc("record_invite_click", { _code: code }).then(() => undefined);
  }, [code]);
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center"><UserPlus className="mx-auto h-10 w-10 text-primary" /><div className="mt-4 text-sm font-semibold text-primary">ميدان</div><h1 className="mt-2 text-2xl font-bold">دعوة للانضمام إلى فريقك</h1><p className="mt-3 leading-7 text-muted-foreground">أنشئ حسابك من الرابط نفسه، ثم يمنحك المدير الصلاحية المناسبة لعملك.</p><Button asChild size="lg" className="mt-6 w-full"><Link to="/auth" search={{ mode: "up", invite: code }}>إنشاء حسابي</Link></Button><Button asChild variant="link" className="mt-2"><Link to="/auth">لدي حساب بالفعل</Link></Button></section></main>;
}
