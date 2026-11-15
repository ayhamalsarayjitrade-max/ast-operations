import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPinned, Warehouse, Truck, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "ميدان — المناديب والمستودعات والتوصيل" },
      { name: "description", content: "سجّل زيارات العملاء، جهّز الطلبات من المستودع، وتابع السائقين لحظياً." },
      { property: "og:title", content: "ميدان — المناديب والمستودعات والتوصيل" },
      { property: "og:description", content: "سجّل زيارات العملاء، جهّز الطلبات من المستودع، وتابع السائقين لحظياً." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: MapPinned, t: "تطبيق المندوب", d: "صورة المحل، موقع العميل، والطلب بضغطة." },
  { icon: Warehouse, t: "لوحة المستودع", d: "إدخال المنتجات والمخزون وتجهيز الطلبات." },
  { icon: Truck, t: "التوصيل والتتبع", d: "إسناد الطلبات للسائقين وتتبع موقعهم." },
  { icon: BellRing, t: "إشعارات لحظية", d: "تنبيهات صوتية ومرئية على كل الأجهزة." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-sm font-semibold text-primary">ميدان</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
          من زيارة المندوب حتى باب العميل — في نظام واحد لحظي.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          المناديب، المستودعات، والسائقون على نفس الصفحة، مع تحديث فوري لحالة كل طلب.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">الدخول للنظام</Link>
        </Button>
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-5">
              <f.icon className="h-6 w-6 text-primary" />
              <div className="mt-3 font-bold">{f.t}</div>
              <div className="text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
        <footer className="mt-16 flex flex-wrap gap-4 border-t pt-6 text-sm text-muted-foreground"><Link to="/privacy" className="hover:text-primary">سياسة الخصوصية</Link><Link to="/terms" className="hover:text-primary">شروط الاستخدام</Link><Link to="/auth" search={{ mode: "up" }} className="hover:text-primary">إنشاء حساب</Link></footer>
      </div>
    </div>
  );
}
