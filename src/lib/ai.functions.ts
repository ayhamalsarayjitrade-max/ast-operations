import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateInviteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ goal: z.string().trim().min(3).max(1000), tone: z.enum(["رسمية", "تحفيزية", "إرشادية"]), inviteUrl: z.string().url().max(500) }))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("هذه الميزة للمدير فقط");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة");
    const { generateStructured } = await import("./ai/responses.server");
    const output = await generateStructured(getRequest(), {
      apiKey,
      schema: z.object({ message: z.string() }),
      instructions: "أنشئ رسالة واتساب عربية قصيرة ومهنية لدعوة موظف لاستخدام تطبيق ميدان. لا تخترع اسماً للشركة أو مزايا غير مذكورة. اجعل الرابط في سطر مستقل ولا تضف أي بيانات سرية أو تشغيلية.",
      messages: [{ role: "user", content: `هدف الدعوة: ${data.goal}\nنبرة الرسالة: ${data.tone}\nرابط الدعوة: ${data.inviteUrl}\nاكتب رسالة واحدة جاهزة للإرسال.` }],
    });
    return output;
  });

export const summarizeVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ visitId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: visit, error } = await context.supabase.from("visits").select("id,note,photo_path,created_at,customers(name)").eq("id", data.visitId).single();
    if (error || !visit) throw new Error("تعذر قراءة الزيارة");
    let imageUrl = "";
    if (visit.photo_path) imageUrl = (await context.supabase.storage.from("shop-photos").createSignedUrl(visit.photo_path, 120)).data?.signedUrl ?? "";
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة");
    const { generateStructured } = await import("./ai/responses.server");
    const output = await generateStructured(getRequest(), {
      apiKey,
      schema: z.object({ summary: z.string(), follow_up: z.string() }),
      instructions: "لخّص زيارة مندوب ميداني بالعربية بدقة من الملاحظات والصورة فقط. لا تختلق نتائج أو التزامات. اقترح متابعة واحدة عملية ومفيدة، واذكر عند نقص المعلومات بدلاً من افتراضها.",
      messages: [{ role: "user", content: [
        { type: "text", text: `العميل: ${visit.customers?.name ?? "غير مسمى"}\nوقت الزيارة: ${visit.created_at}\nملاحظات المندوب: ${visit.note || "لا توجد ملاحظات"}\nأنشئ ملخصاً من ثلاث نقاط كحد أقصى واقتراح متابعة واضح.` },
        ...(imageUrl ? [{ type: "image" as const, image: new URL(imageUrl) }] : []),
      ] }],
    });
    const { error: saveError } = await context.supabase.rpc("save_visit_ai_summary", { _visit_id: data.visitId, _summary: output.summary, _follow_up: output.follow_up });
    if (saveError) throw new Error("تم إنشاء الملخص لكن تعذر حفظه");
    return output;
  });
