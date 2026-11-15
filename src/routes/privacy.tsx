import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({ head: () => ({ meta: [
  { title: "سياسة الخصوصية — ميدان" }, { name: "description", content: "كيفية جمع واستخدام وحماية بيانات حسابات العمل والموقع والصور في ميدان." },
  { property: "og:title", content: "سياسة الخصوصية — ميدان" }, { property: "og:description", content: "كيفية جمع واستخدام وحماية بيانات حسابات العمل والموقع والصور في ميدان." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: PrivacyPage });
function PrivacyPage() {
  return <main className="mx-auto max-w-3xl px-5 py-10 leading-8"><div className="text-sm font-bold text-primary">ميدان</div><h1 className="mt-2 text-3xl font-bold">سياسة الخصوصية</h1><p className="mt-2 text-sm text-muted-foreground">آخر تحديث: 15 نوفمبر 2026</p>
    <section className="mt-8 space-y-5 text-sm"><div><h2 className="text-lg font-bold">البيانات التي نجمعها</h2><p>بيانات الحساب والاسم ورقم الهاتف ودور المستخدم، وبيانات العمل مثل الزيارات والطلبات والحضور والتسليم. يطلب التطبيق الموقع عند تسجيل زيارة أو حضور أو تسليم، وصورة المحل أو إثبات التسليم عند الحاجة، ولا يصل للكاميرا أو الموقع دون إذن النظام.</p></div>
    <div><h2 className="text-lg font-bold">كيفية الاستخدام</h2><p>تُستخدم البيانات لتشغيل دورة الطلبات، إثبات الزيارة والتسليم، تتبع السائق أثناء مشاركة موقعه، حساب الحضور والرواتب، وتزامن العمل بين الأجهزة. لا نبيع البيانات ولا نستخدمها لإعلانات خارجية.</p></div>
    <div><h2 className="text-lg font-bold">المشاركة والحماية</h2><p>يرى كل مستخدم البيانات التي يتيحها دوره فقط. العميل يرى حسابه وطلباته، والسائق يرى الطلبات المسندة إليه. تُحفظ الصور والتوقيعات في مساحة خاصة وتُعرض بروابط قصيرة المدة. قد تعالج ميزات الذكاء الاصطناعي نص الدعوة أو ملاحظات الزيارة وصورتها عند طلب المستخدم لذلك.</p></div>
    <div><h2 className="text-lg font-bold">الحفظ والحذف</h2><p>تحتفظ الشركة بالسجلات التشغيلية والمالية بحسب متطلبات عملها والقانون. يمكن للمستخدم حذف حساب دخوله من صفحة تغيير كلمة المرور. يمنع حذف حساب المدير الوحيد حتى تعيين بديل. تُحذف مسودات الجهاز عند حذف الحساب من التطبيق.</p></div>
    <div><h2 className="text-lg font-bold">خياراتك والتواصل</h2><p>يمكنك إيقاف إذن الموقع أو الكاميرا أو الإشعارات من إعدادات الجهاز، مع توقف الوظائف التي تعتمد عليها. للاستفسار أو تصحيح البيانات، تواصل مع إدارة الشركة التي وفرت حسابك.</p></div></section>
    <div className="mt-8 flex gap-2"><Button asChild><Link to="/auth">العودة للدخول</Link></Button><Button asChild variant="outline"><Link to="/terms">شروط الاستخدام</Link></Button></div>
  </main>;
}
