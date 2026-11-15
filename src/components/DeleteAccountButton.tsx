import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
  const run = useServerFn(deleteMyAccount);
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm("سيُحذف حسابك وبيانات دخوله نهائياً. تبقى السجلات التشغيلية المطلوبة للشركة دون إمكانية استخدام حسابك. هل أنت متأكد؟")) return;
    setBusy(true);
    try {
      await run({});
      await supabase.auth.signOut();
      indexedDB.deleteDatabase("midan-field-v1");
      toast.success("تم حذف الحساب"); nav({ to: "/auth" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حذف الحساب"); }
    finally { setBusy(false); }
  }
  return <Button type="button" variant="destructive" className="w-full" disabled={busy} onClick={remove}>{busy ? "جارٍ حذف الحساب..." : "حذف حسابي نهائياً"}</Button>;
}
