// Derived/computed queries over the database.

import type { DB, Member, PaymentType } from "./types";
import { currentMonthKey, lastNMonths, monthKey } from "./format";

export interface DuesStatus {
  paid: boolean;
  paidAmount: number;
  due: number;
  paymentDate?: string;
}

/** Dues status of every active member for a given month key (YYYY-MM). */
export function duesForMonth(db: DB, month: string): Map<string, DuesStatus> {
  const map = new Map<string, DuesStatus>();
  const due = db.settings.duesMonthlyAmount;
  for (const m of db.members) {
    if (m.status !== "active") continue;
    map.set(m.id, { paid: false, paidAmount: 0, due });
  }
  for (const p of db.payments) {
    if (p.type !== "dues" || !p.period || p.period !== month) continue;
    const s = map.get(p.memberId);
    if (!s) continue;
    s.paid = true;
    s.paidAmount += p.amount;
    if (!s.paymentDate || p.date < s.paymentDate) s.paymentDate = p.date;
  }
  return map;
}

/** Month keys (YYYY-MM) from the member's join month up to and including the given month. */
export function billedMonths(member: Member, upToMonth: string): string[] {
  const start = member.joinDate.slice(0, 7);
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ty, tm] = upToMonth.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 120) break; // safety
  }
  return out;
}

export interface Defaulter {
  member: Member;
  monthsOwed: string[];
  totalOwed: number;
}

/** Active members owing dues for at least `threshold` months (oldest first). */
export function defaulters(db: DB, threshold?: number): Defaulter[] {
  const min = threshold ?? db.settings.defaulterThresholdMonths;
  const upTo = currentMonthKey();
  const due = db.settings.duesMonthlyAmount;
  const out: Defaulter[] = [];
  for (const member of db.members) {
    if (member.status !== "active") continue;
    const paidMonths = new Set(
      db.payments.filter((p) => p.type === "dues" && p.memberId === member.id).map((p) => p.period),
    );
    const owed = billedMonths(member, upTo).filter((mo) => !paidMonths.has(mo));
    if (owed.length >= min) {
      out.push({ member, monthsOwed: owed, totalOwed: owed.length * due });
    }
  }
  return out.sort((a, b) => b.monthsOwed.length - a.monthsOwed.length);
}

export interface MonthIncome {
  month: string;
  dues: number;
  donation: number;
  funeral: number;
  building: number;
  other: number;
  total: number;
}

export function incomeSeries(db: DB, months: string[] = lastNMonths(6)): MonthIncome[] {
  const series: MonthIncome[] = months.map((month) => ({
    month,
    dues: 0,
    donation: 0,
    funeral: 0,
    building: 0,
    other: 0,
    total: 0,
  }));
  const index = new Map(series.map((s) => [s.month, s]));
  for (const p of db.payments) {
    const row = index.get(monthKey(p.date));
    if (!row) continue;
    row[p.type] += p.amount;
    row.total += p.amount;
  }
  return series;
}

export function typeTotals(db: DB, month?: string): Record<PaymentType, number> {
  const out: Record<PaymentType, number> = { dues: 0, donation: 0, funeral: 0, building: 0, other: 0 };
  for (const p of db.payments) {
    if (month && monthKey(p.date) !== month) continue;
    out[p.type] += p.amount;
  }
  return out;
}

export function totalOf(db: DB, type: PaymentType, month?: string): number {
  return typeTotals(db, month)[type];
}

/** % of services attended by a member over the last `window` services of that type. */
export function attendanceRate(db: DB, memberId: string, window = 12): number | null {
  const dates = [...new Set(db.attendance.map((a) => a.serviceDate))].sort().slice(-window);
  if (dates.length === 0) return null;
  const present = new Set(
    db.attendance.filter((a) => a.memberId === memberId).map((a) => a.serviceDate),
  );
  const count = dates.filter((d) => present.has(d)).length;
  return Math.round((count / dates.length) * 100);
}

export function attendanceOn(db: DB, date: string, service: string): Set<string> {
  return new Set(
    db.attendance.filter((a) => a.serviceDate === date && a.service === service).map((a) => a.memberId),
  );
}

export function recentServiceDates(db: DB, n = 8): { date: string; service: string; count: number }[] {
  const key = new Map<string, { date: string; service: string; count: number }>();
  for (const a of db.attendance) {
    const k = `${a.serviceDate}|${a.service}`;
    const row = key.get(k) ?? { date: a.serviceDate, service: a.service, count: 0 };
    row.count += 1;
    key.set(k, row);
  }
  return [...key.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);
}

export interface ParishSummary {
  parishId: string;
  members: number;
  active: number;
  duesThisMonth: number;
  defaulters: number;
}

export function parishSummaries(db: DB): ParishSummary[] {
  const month = currentMonthKey();
  const statuses = duesForMonth(db, month);
  return db.parishes.map((p) => {
    const inParish = db.members.filter((m) => m.parishId === p.id);
    const active = inParish.filter((m) => m.status === "active");
    const duesThisMonth = db.payments
      .filter((pay) => pay.type === "dues" && pay.period === month && active.some((m) => m.id === pay.memberId))
      .reduce((sum, pay) => sum + pay.amount, 0);
    const defaultersCount = active.filter((m) => statuses.get(m.id)?.paid === false).length;
    return {
      parishId: p.id,
      members: inParish.length,
      active: active.length,
      duesThisMonth,
      defaulters: defaultersCount,
    };
  });
}

export function paymentsFor(db: DB, memberId: string) {
  return db.payments
    .filter((p) => p.memberId === memberId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function memberName(db: DB, memberId: string): string {
  const m = db.members.find((x) => x.id === memberId);
  return m ? `${m.firstName} ${m.lastName}` : "Anonymous donor";
}
