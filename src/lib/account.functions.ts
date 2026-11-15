import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin) {
      const { count } = await context.supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("عيّن مديراً آخر قبل حذف حساب المدير الوحيد");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("customer_accounts").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("invite_signups").delete().eq("user_id", context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("تعذر حذف الحساب؛ حاول مرة أخرى");
    return { deleted: true };
  });
