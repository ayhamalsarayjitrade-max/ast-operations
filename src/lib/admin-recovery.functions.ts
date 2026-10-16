import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  name: z.string().trim().max(100).optional(),
});

export const resetAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const expected = process.env['ADMIN_RECOVERY_CODE'];
    if (!expected) throw new Error("رمز الاستعادة غير مُعدّ بعد");
    if (data.code !== expected) {
      await new Promise((r) => setTimeout(r, 1200));
      throw new Error("رمز الاستعادة غير صحيح");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1);
    const adminId0 = admins?.[0]?.user_id as string | undefined;
    let adminId = adminId0;

    // Never take over another (non-admin) user's account by email.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (existing && existing.id !== adminId0) {
      throw new Error("هذا البريد مستخدم لحساب موظف آخر. اختر بريداً مختلفاً للمدير.");
    }

    if (adminId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
        email,
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name || "المدير" },
      });
      if (error || !created.user) throw new Error(error?.message ?? "تعذر إنشاء الحساب");
      adminId = created.user.id;
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: adminId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });
