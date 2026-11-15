import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({ head: () => ({ meta: [
  { title: "شروط الاستخدام — ميدان" }, { name: "description", content: "شروط استخدام حسابات العمل والزيارات والطلبات والتسليم في ميدان." },
  { property: "og:title", content: "شروط الاستخدام — ميدان" }, { property: "og:description", content: "شروط استخدام حسابات العمل والزيارات والطلبات والتسليم في ميدان." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: TermsPage });
function TermsPage() {
  return <main className="mx-auto max-w-3xl px-5 py-10 leading-8"><div className="text-sm font-bold text-primary">ميدان</div><h1 className="mt-2 text-3xl font-bold">شروط الاستخدام</h1><p className="mt-2 text-sm text-muted-foreground">آخر تحديث: 15 نوفمبر 2026</p>
    <section className="mt-8 space-y-5 text-sm"><div><h2 className="text-lg font-bold">حسابات العمل</h2><p>يُستخدم ميدان بإذن الشركة التي تدير الحسابات والأدوار. يجب حماية بيانات الدخول وعدم مشاركتها، وتخضع إمكانات كل حساب للدور الذي منحه المدير.</p></div><div><h2 className="text-lg font-bold">دقة السجلات</h2><p>يلتزم المستخدم بإدخال بيانات صحيحة والتقاط الصور والموقع والتوقيع بموافقة الأشخاص المعنيين. يُمنع تسجيل زيارة أو حضور أو تسليم غير حقيقي أو محاولة الوصول إلى حسابات وبيانات مستخدمين آخرين.</p></div><div><h2 className="text-lg font-bold">الطلبات والتنبيهات</h2><p>تخضع الطلبات والمواعيد والمخزون والرواتب لاعتماد وإجراءات الشركة. فتح واتساب يجهّز الرسالة ولا يرسلها حتى يؤكد المستخدم. تعتمد التنبيهات اللحظية والمزامنة على الاتصال وصلاحيات الجهاز.</p></div><div><h2 className="text-lg font-bold">الملخصات الذكية</h2><p>الملخصات والرسائل والمتابعات المقترحة أدوات مساعدة قابلة للخطأ، ويجب مراجعتها قبل الاعتماد عليها أو إرسالها.</p></div><div><h2 className="text-lg font-bold">إيقاف الحساب</h2><p>يمكن للشركة إيقاف الوصول عند إساءة الاستخدام أو انتهاء علاقة العمل. يمكن للمستخدم حذف حسابه وفق سياسة الخصوصية، مع بقاء السجلات التي يلزم الاحتفاظ بها.</p></div></section>
    <div className="mt-8 flex gap-2"><Button asChild><Link to="/auth">العودة للدخول</Link></Button><Button asChild variant="outline"><Link to="/privacy">سياسة الخصوصية</Link></Button></div>
  </main>;
}
