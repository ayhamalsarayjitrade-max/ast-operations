import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExcel, printReport, type Cell } from "@/lib/export";
import { useLang } from "@/lib/i18n";
import { toast } from "sonner";

export function ExportBar({ title, file, headers, rows }: { title: string; file: string; headers: string[]; rows: () => Cell[][] }) {
  const { t, dir } = useLang();
  const print = () => { if (!printReport(title, headers, rows(), dir)) toast.error("اسمح بفتح النوافذ المنبثقة للطباعة"); };
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" variant="outline" onClick={() => downloadExcel(file, headers, rows())}><FileSpreadsheet className="h-4 w-4" />{t("excel")}</Button>
      <Button size="sm" variant="outline" onClick={print}><FileText className="h-4 w-4" />PDF</Button>
      <Button size="sm" variant="outline" onClick={print}><Printer className="h-4 w-4" />{t("print")}</Button>
    </div>
  );
}
