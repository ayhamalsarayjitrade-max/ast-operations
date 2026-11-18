import { useEffect, useState } from "react";
import { CloudOff, CloudUpload, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queued } from "@/lib/field-store";
import { syncFieldQueue } from "@/lib/field-sync";
import { toast } from "sonner";

export function FieldSyncStatus({ owner }: { owner: string }) {
  const [online, setOnline] = useState(true);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      const records = await queued(owner);
      if (!disposed) { setOnline(navigator.onLine); setCount(records.length); setError(records.find(r => r.error)?.error || ""); }
    }
    async function sync() {
      if (disposed) return;
      setBusy(true);
      try {
        const sent = await syncFieldQueue(owner);
        if (sent) {
          ["orders", "visits", "customers"].forEach(key => void qc.invalidateQueries({ queryKey: [key] }));
          toast.success(`تمت مزامنة ${sent} زيارة`);
        }
      } catch { /* Drafts remain on device if local storage is unavailable. */ }
      finally { if (!disposed) { setBusy(false); void refresh(); } }
    }
    const onQueue = () => { void refresh(); };
    const onOnline = () => { void refresh(); void sync(); };
    void refresh(); void sync();
    window.addEventListener("field-outbox", onQueue);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onQueue);
    window.addEventListener("field-sync-now", onOnline);
    const timer = window.setInterval(sync, 20000);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener("field-outbox", onQueue); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onQueue); window.removeEventListener("field-sync-now", onOnline); };
  }, [owner, qc]);
  if (online && count === 0) return null;
  return <div role="status" className="mb-4 flex flex-wrap items-center gap-2 border-b pb-3 text-sm">
    {online ? <CloudUpload className="h-4 w-4 text-primary" /> : <CloudOff className="h-4 w-4 text-warning" />}
    <span>{online ? "متصل" : "دون اتصال"} · {count} زيارة بانتظار المزامنة</span>
    {error && <span className="w-full text-destructive">{error}</span>}
    <Button size="sm" variant="outline" disabled={!online || busy} onClick={() => window.dispatchEvent(new Event("field-sync-now"))}><RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />{busy ? "جارٍ المزامنة" : "مزامنة الآن"}</Button>
  </div>;
}