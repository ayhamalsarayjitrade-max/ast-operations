export type Pay = {
  user_id: string; base_salary: number; housing_allowance: number; transport_allowance: number;
  other_allowance: number; daily_hours: number; work_days: number; shift_start: string; overtime_rate: number;
};
export type Att = { id: string; user_id: string; check_in: string; check_out: string | null };
export type Leave = { user_id: string; paid: boolean; start_date: string; end_date: string; status: string };
export type Adj = { user_id: string; kind: string; amount: number };

export const DEFAULT_PAY = { base_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowance: 0, daily_hours: 8, work_days: 26, shift_start: "08:00", overtime_rate: 1.5 };
export const LEAVE_LABEL: Record<string, string> = { annual: "سنوية", sick: "مرضية", unpaid: "بدون راتب", other: "أخرى" };
export const LEAVE_STATUS: Record<string, string> = { pending: "قيد المراجعة", approved: "مقبولة", rejected: "مرفوضة" };

export const monthRange = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return { start: new Date(y, mo - 1, 1), end: new Date(y, mo, 1) };
};
export const curMonth = () => new Date().toISOString().slice(0, 7);
export const fmtH = (h: number) => `${Math.floor(h)}س ${Math.round((h % 1) * 60)}د`;
export const money = (n: number) => n.toLocaleString("ar", { maximumFractionDigits: 2 });

function leaveDaysIn(l: Leave, start: Date, end: Date) {
  const a = new Date(Math.max(new Date(l.start_date).getTime(), start.getTime()));
  const b = new Date(Math.min(new Date(l.end_date).getTime() + 864e5, end.getTime()));
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 864e5));
}

export function calcPayroll(month: string, p: Partial<Pay> | undefined, att: Att[], leaves: Leave[], adj: Adj[]) {
  const pay = { ...DEFAULT_PAY, ...(p ?? {}) } as Pay;
  const { start, end } = monthRange(month);
  const dim = (end.getTime() - start.getTime()) / 864e5;
  const now = new Date();
  const elapsed = now >= end ? dim : now < start ? 0 : now.getDate();
  const expectedDays = Math.round((pay.work_days * elapsed) / dim);
  const dayRate = pay.base_salary / (pay.work_days || 1);
  const hourRate = dayRate / (pay.daily_hours || 1);
  const [sh, sm] = pay.shift_start.split(":").map(Number);

  const days = new Map<string, number>();
  let lateMin = 0;
  const firstIn = new Map<string, Date>();
  for (const a of att) {
    const ci = new Date(a.check_in);
    const key = ci.toDateString();
    const co = a.check_out ? new Date(a.check_out) : null;
    const h = co ? (co.getTime() - ci.getTime()) / 36e5 : 0;
    days.set(key, (days.get(key) ?? 0) + h);
    if (!firstIn.has(key) || ci < firstIn.get(key)!) firstIn.set(key, ci);
  }
  for (const ci of firstIn.values()) {
    const shift = new Date(ci); shift.setHours(sh, sm, 0, 0);
    const m = (ci.getTime() - shift.getTime()) / 6e4;
    if (m > 10) lateMin += m; // 10 دقائق سماح
  }
  let hours = 0, overtimeH = 0;
  for (const h of days.values()) { hours += h; overtimeH += Math.max(0, h - pay.daily_hours); }
  const ap = leaves.filter((l) => l.status === "approved");
  const paidLeave = ap.filter((l) => l.paid).reduce((s, l) => s + leaveDaysIn(l, start, end), 0);
  const unpaidLeave = ap.filter((l) => !l.paid).reduce((s, l) => s + leaveDaysIn(l, start, end), 0);
  const present = days.size;
  const absent = Math.max(0, expectedDays - present - paidLeave - unpaidLeave);

  const allowances = pay.housing_allowance + pay.transport_allowance + pay.other_allowance;
  const overtime = overtimeH * hourRate * pay.overtime_rate;
  const extraAllow = adj.filter((a) => a.kind === "allowance").reduce((s, a) => s + Number(a.amount), 0);
  const extraDed = adj.filter((a) => a.kind === "deduction").reduce((s, a) => s + Number(a.amount), 0);
  const absenceDed = (absent + unpaidLeave) * dayRate;
  const lateDed = (lateMin / 60) * hourRate;
  const gross = Number(pay.base_salary) + allowances + overtime + extraAllow;
  const deductions = absenceDed + lateDed + extraDed;
  return { pay, present, hours, overtimeH, lateMin, paidLeave, unpaidLeave, absent, allowances, overtime, extraAllow, extraDed, absenceDed, lateDed, gross, deductions, net: gross - deductions };
}

export function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
