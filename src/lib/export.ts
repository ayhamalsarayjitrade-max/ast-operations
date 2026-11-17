export type Cell = string | number | null | undefined;

const esc = (v: Cell) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Excel-compatible CSV with BOM so Arabic and other scripts open correctly. */
export function toCSV(headers: string[], rows: Cell[][]) {
  const q = (v: Cell) => { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
}

export function downloadExcel(name: string, headers: string[], rows: Cell[][]) {
  const blob = new Blob([toCSV(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Opens a branded A4 printable report; the print dialog offers “Save as PDF”. */
export function printReport(title: string, headers: string[], rows: Cell[][], dir: "rtl" | "ltr" = "rtl") {
  const w = window.open("", "_blank");
  if (!w) return false;
  const html = `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>@page{size:A4;margin:12mm}body{font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #d32f2f;padding-bottom:8px;margin-bottom:12px}
h1{font-size:18px;margin:0}.co{font-weight:700;color:#d32f2f}table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#f3f3f3}th,td{border:1px solid #ccc;padding:6px;text-align:start}tr{break-inside:avoid}footer{margin-top:10px;font-size:11px;color:#666}</style></head>
<body><header><div><div class="co">أيهم السريجي للتجارة · AST</div><h1>${esc(title)}</h1></div><div>${new Date().toLocaleString()}</div></header>
<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<footer>${rows.length} · AST</footer><script>window.onload=()=>{window.focus();window.print()}</script></body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
  return true;
}
