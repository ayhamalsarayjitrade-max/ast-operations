import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { summarizeVisit } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function VisitSummaryButton({ visitId }: { visitId: string }) {
  const run = useServerFn(summarizeVisit);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string; follow_up: string } | null>(null);
  async function generate() {
    setBusy(true);
    try { const value = await run({ data: { visitId } }); setResult(value); await qc.invalidateQueries({ queryKey: ["visits"] }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تلخيص الزيارة"); }
    finally { setBusy(false); }
  }
  return <><Button type="button" size="sm" variant="outline" disabled={busy} onClick={(e) => { e.stopPropagation(); void generate(); }}><Sparkles className="h-4 w-4" />{busy ? "جارٍ التلخيص..." : "ملخص ومتابعة"}</Button>
    <Dialog open={!!result} onOpenChange={(open) => { if (!open) setResult(null); }}><DialogContent dir="rtl" onClick={(e) => e.stopPropagation()}><DialogHeader className="text-right"><DialogTitle>ملخص الزيارة والمتابعة</DialogTitle><DialogDescription>محفوظ مع سجل الزيارة للرجوع إليه.</DialogDescription></DialogHeader>{result && <div className="space-y-4 text-sm leading-7"><div><h3 className="font-bold">الملخص</h3><p className="whitespace-pre-wrap text-muted-foreground">{result.summary}</p></div><div className="rounded-lg bg-muted/60 p-3"><h3 className="font-bold">المتابعة المقترحة</h3><p className="whitespace-pre-wrap">{result.follow_up}</p></div></div>}</DialogContent></Dialog>
  </>;
}
