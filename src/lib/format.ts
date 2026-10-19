// Small formatting + download helpers shared across pages.

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Local-timezone ISO date (YYYY-MM-DD) — avoids UTC off-by-one. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-10" -> "Oct 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return key;
  return `${MONTH_SHORT[idx]} ${y}`;
}

/** Last n month keys (YYYY-MM), oldest first, ending with the month of `from`. */
export function lastNMonths(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out.reverse();
}

export function currentMonthKey(): string {
  return monthKey(todayISO());
}

/** Last n Sundays (including today if it is Sunday), oldest first. */
export function lastNSundays(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  for (let i = 0; i < n; i++) {
    out.unshift(toISODate(d));
    d.setDate(d.getDate() - 7);
  }
  return out;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1]} ${y}`;
}

export function formatMoney(amount: number, symbol: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function initials(first: string, last: string): string {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

export function fullName(m: { firstName: string; lastName: string }): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

/** Trigger a client-side CSV download. */
export function downloadCSV(
  filename: string,
  header: string[],
  rows: (string | number)[][],
): void {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
