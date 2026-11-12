import { useState, useSyncExternalStore } from "react";
import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, DownloadCloud, RotateCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { retryAppFiles, updateRecovery } from "@/lib/update-recovery";

export function UpdateRecoveryScreen({ onRetry, onClose }: { onRetry: () => Promise<unknown>; onClose?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);

  async function retry() {
    setBusy(true);
    setFailed(false);
    const recovered = await retryAppFiles(onRetry);
    setBusy(false);
    if (recovered) onClose?.();
    else setFailed(true);
  }

  return (
    <section dir="rtl" aria-labelledby="update-recovery-title" className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12 text-foreground">
      <span className="mb-8 text-lg font-bold text-primary">ميدان</span>
      <DownloadCloud className="mb-5 h-12 w-12 text-primary" aria-hidden="true" />
      <h1 id="update-recovery-title" className="text-2xl font-bold">تعذّر تحميل ملفات التطبيق</h1>
      <p className="mt-4 leading-7 text-muted-foreground">قد يكون التطبيق قد تحدّث بينما يحتفظ المتصفح بملفات قديمة، أو انقطع الاتصال أثناء تحميلها.</p>
      <p className="mt-3 leading-7">لن نحدّث الصفحة تلقائياً. إعادة المحاولة لا تعيد تحميل الصفحة وتُبقي العمل المفتوح فيها.</p>
      {failed && <p role="alert" className="mt-4 text-sm text-destructive">لم تُحمّل الملفات بعد. تحقّق من الاتصال، ثم حاول مجدداً. قد تحتاج إلى تحديث الصفحة للحصول على النسخة الجديدة.</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button disabled={busy} onClick={retry}><RotateCw aria-hidden="true" className={busy ? "animate-spin motion-reduce:animate-none" : ""} />{busy ? "جارٍ إعادة المحاولة…" : "إعادة المحاولة بأمان"}</Button>
        {onClose && <Button variant="outline" disabled={busy} onClick={onClose}><ArrowRight aria-hidden="true" />العودة للعمل المفتوح</Button>}
      </div>
      <div className="mt-8 border-t pt-5">
        {!confirmRefresh ? <Button variant="link" className="h-auto whitespace-normal px-0" onClick={() => setConfirmRefresh(true)}>تحديث الصفحة للحصول على أحدث نسخة</Button> : (
          <div role="alert" className="space-y-4">
            <p className="flex items-start gap-2 text-sm leading-6 text-warning-foreground"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />تحديث الصفحة قد يفقد البيانات والصور غير المحفوظة. ارجع واحفظ عملك أولاً إن أمكن. لا يمكن ضمان استعادته بعد التحديث.</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive" onClick={() => window.location.reload()}>تحديث الصفحة رغم ذلك</Button>
              <Button variant="outline" onClick={() => setConfirmRefresh(false)}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function UpdateRecoveryOverlay() {
  const state = useSyncExternalStore(updateRecovery.subscribe, updateRecovery.getSnapshot, updateRecovery.getServerSnapshot);
  const router = useRouter();
  if (!state.visible) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="update-recovery-title" className="fixed inset-0 z-50 overflow-y-auto bg-background" ref={(node) => { if (node) node.focus(); }} tabIndex={-1} onKeyDown={(event) => {
      if (event.key === "Escape") updateRecovery.hide();
      if (event.key !== "Tab") return;
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <UpdateRecoveryScreen onClose={updateRecovery.hide} onRetry={async () => {
        await router.invalidate();
        if (router.state.matches.some((match) => match.status === "error")) throw new Error("Files still unavailable");
      }} />
    </div>
  );
}