import { useEffect, useState } from "react";
import { Camera, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const steps = [
  { icon: Camera, title: "سجّل الزيارة من الهاتف", text: "اختر العميل، التقط صورة المحل وحدّد موقعه، ثم اكتب ملاحظاتك بوضوح." },
  { icon: PackageCheck, title: "أضف الطلب والكميات", text: "فعّل «يوجد طلب»، اختر المنتجات وموعد التسليم. تُحفظ المسودة على جهازك عند انقطاع الاتصال." },
  { icon: Truck, title: "تابع كل حالة لحظياً", text: "من تجهيز المستودع إلى إسناد السائق والتسليم، تظهر الحالة الجديدة في قائمة طلباتك." },
];
export function StaffTour({ userId, enabled }: { userId: string; enabled: boolean }) {
  const key = `midan-tour-v1:${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => { if (enabled && !localStorage.getItem(key)) setOpen(true); }, [enabled, key]);
  function close() { localStorage.setItem(key, "done"); setOpen(false); }
  const CurrentIcon = steps[step].icon;
  return <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}><DialogContent dir="rtl" className="max-w-sm"><DialogHeader className="text-right"><DialogTitle>جولة سريعة في ميدان</DialogTitle><DialogDescription>ثلاث خطوات لبدء العمل من هاتفك.</DialogDescription></DialogHeader>
    <div className="rounded-xl bg-muted/60 p-6 text-center"><CurrentIcon className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-4 text-lg font-bold">{steps[step].title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{steps[step].text}</p></div>
    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{step + 1} / {steps.length}</span><div className="flex gap-2">{step < steps.length - 1 ? <Button onClick={() => setStep(step + 1)}>التالي</Button> : <Button onClick={close}>ابدأ العمل</Button>}<Button variant="ghost" onClick={close}>تخطي</Button></div></div>
  </DialogContent></Dialog>;
}
