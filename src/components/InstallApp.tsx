import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIP | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIP; window.dispatchEvent(new Event("ast-install-ready")); });
}

export function useInstall() {
  const [state, setState] = useState({ ios: false, standalone: false, canPrompt: false });
  useEffect(() => {
    const read = () => setState({
      ios: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
      standalone: matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true,
      canPrompt: !!deferred,
    });
    read();
    window.addEventListener("ast-install-ready", read);
    window.addEventListener("appinstalled", read);
    return () => { window.removeEventListener("ast-install-ready", read); window.removeEventListener("appinstalled", read); };
  }, []);
  const install = async () => { if (!deferred) return; await deferred.prompt(); await deferred.userChoice; deferred = null; setState((s) => ({ ...s, canPrompt: false })); };
  return { ...state, install };
}

export function InstallCard({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) {
  const { t } = useLang();
  const { ios, standalone, canPrompt, install } = useInstall();
  if (standalone) return compact ? null : <p className="rounded-xl bg-secondary p-3 text-sm font-medium text-secondary-foreground">{t("installed")}</p>;
  return (
    <div className="relative rounded-xl border bg-card p-3 text-sm">
      {onClose && <button aria-label={t("later")} onClick={onClose} className="absolute end-2 top-2 rounded-full p-1 text-muted-foreground"><X className="h-4 w-4" /></button>}
      <div className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5 text-primary" />{t("install")}</div>
      {canPrompt ? (
        <Button className="mt-2 h-11 w-full text-base" onClick={() => void install()}><Download className="h-5 w-5" />{t("install_btn")}</Button>
      ) : (
        <p className="mt-1 leading-6 text-muted-foreground">{ios ? t("ios_steps") : t("android_steps")}</p>
      )}
    </div>
  );
}

/** One-time dismissible banner for phones that have not installed the app yet. */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const { standalone } = useInstall();
  useEffect(() => { setShow(matchMedia("(pointer: coarse)").matches && localStorage.getItem("ast-install-dismissed") !== "1"); }, []);
  if (!show || standalone) return null;
  return <div className="mb-4"><InstallCard compact onClose={() => { localStorage.setItem("ast-install-dismissed", "1"); setShow(false); }} /></div>;
}
