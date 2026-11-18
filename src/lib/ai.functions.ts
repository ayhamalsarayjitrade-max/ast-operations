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
      instructions: "أنشئ رسالة واتساب عربية قصيرة ومهنية لدعوة موظف لاستخدام تطبيق أيهم السريجي للتجارة. لا تخترع اسماً للشركة أو مزايا غير مذكورة. اجعل الرابط في سطر مستقل ولا تضف أي بيانات سرية أو تشغيلية.",
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
      instructions: "لخّص زيارة مندوب أيهم السريجي للتجارة بالعربية بدقة من الملاحظات والصورة فقط. لا تختلق نتائج أو التزامات. اقترح متابعة واحدة عملية ومفيدة، واذكر عند نقص المعلومات بدلاً من افتراضها.",
      messages: [{ role: "user", content: [
        { type: "text", text: `العميل: ${visit.customers?.name ?? "غير مسمى"}\nوقت الزيارة: ${visit.created_at}\nملاحظات المندوب: ${visit.note || "لا توجد ملاحظات"}\nأنشئ ملخصاً من ثلاث نقاط كحد أقصى واقتراح متابعة واضح.` },
        ...(imageUrl ? [{ type: "image" as const, image: new URL(imageUrl) }] : []),
      ] }],
    });
    const { error: saveError } = await context.supabase.rpc("save_visit_ai_summary", { _visit_id: data.visitId, _summary: output.summary, _follow_up: output.follow_up });
    if (saveError) throw new Error("تم إنشاء الملخص لكن تعذر حفظه");
    return output;
  });

const LANG_NAMES = { ar: "Arabic", en: "English", ur: "Urdu", hi: "Hindi", bn: "Bengali" } as const;

export const generateCustomerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    brief: z.string().trim().min(3).max(1500),
    customerName: z.string().max(200).optional(),
    productName: z.string().max(200).optional(),
    productPrice: z.string().max(50).optional(),
    image: z.string().max(1_500_000).regex(/^data:image\/(jpeg|png|webp);base64,/).optional(),
    lang: z.enum(["ar", "en", "ur", "hi", "bn"]),
  }))
  .handler(async ({ data, context }) => {
    const roles = await Promise.all((["admin", "rep", "warehouse"] as const).map((r) => context.supabase.rpc("has_role", { _user_id: context.userId, _role: r })));
    if (!roles.some((r) => r.data)) throw new Error("هذه الميزة غير متاحة لدورك");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة");
    // Learn the company's voice from the most recent messages staff approved and sent.
    const { data: examples } = await context.supabase.from("message_examples").select("content").order("created_at", { ascending: false }).limit(8);
    const style = (examples ?? []).map((e, i) => `مثال ${i + 1}:\n${e.content}`).join("\n\n");
    const { generateStructured } = await import("./ai/responses.server");
    return generateStructured(getRequest(), {
      apiKey,
      schema: z.object({ message: z.string() }),
      instructions: `You write WhatsApp messages from "Ayham Al Sarayji Trading (AST)" to its shop customers. Write in ${LANG_NAMES[data.lang]}. Short, warm, professional, ready to send, with a clear call to action. Describe a product only from the provided name, price, image and brief — never invent prices, discounts, stock or claims. Match the tone and structure of the approved examples when given.${style ? `\n\nApproved company examples:\n${style}` : ""}`,
      messages: [{ role: "user", content: [
        { type: "text", text: `Customer: ${data.customerName || "-"}\nProduct: ${data.productName || "-"}\nPrice: ${data.productPrice || "-"}\nWhat to say: ${data.brief}` },
        ...(data.image ? [{ type: "image" as const, image: new URL(data.image) }] : []),
      ] }],
    });
  });
