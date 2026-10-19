"use client";

// Reports: income by category, attendance trend, parish performance, top donors.

import { useMemo, useState } from "react";
import { BarChart3, Download, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import type { PaymentType } from "@/lib/types";
import { downloadCSV, formatMoney, lastNMonths, monthLabel, todayISO } from "@/lib/format";
import { incomeSeries, memberName, parishSummaries } from "@/lib/selectors";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  PageHeader,
  ProgressBar,
  StatCard,
  inputCls,
  rowCls,
  tdCls,
  thCls,
} from "@/components/ui";

const SEGMENT: Record<PaymentType, string> = {
  dues: "bg-brand-600",
  donation: "bg-emerald-500",
  funeral: "bg-indigo-500",
  building: "bg-amber-500",
  other: "bg-sky-400",
};

const CATEGORY_LABEL: Record<PaymentType, string> = {
  dues: "Monthly dues",
  donation: "Donations",
  funeral: "Funeral levy",
  building: "Building fund",
  other: "Other payments",
};

export default function ReportsPage() {
  const { db } = useStore();
  const symbol = db.settings.currencySymbol;
  const [range, setRange] = useState(6);

  const months = useMemo(() => lastNMonths(range), [range]);
  const series = useMemo(() => incomeSeries(db, months), [db, months]);
  const maxTotal = Math.max(1, ...series.map((s) => s.total));

  const grandTotal = series.reduce((s, r) => s + r.total, 0);
  const totals = useMemo(() => {
    const t: Record<PaymentType, number> = { dues: 0, donation: 0, funeral: 0, building: 0, other: 0 };
    for (const row of series) {
      (Object.keys(t) as PaymentType[]).forEach((k) => (t[k] += row[k]));
    }
    return t;
  }, [series]);

  const topDonors = useMemo(() => {
    const tally = new Map<string, number>();
    for (const p of db.payments.filter((p) => p.type === "donation" && p.memberId)) {
      tally.set(p.memberId, (tally.get(p.memberId) ?? 0) + p.amount);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [db.payments]);
  const topMax = topDonors[0]?.[1] ?? 1;

  const summaries = parishSummaries(db);

  // Attendance trend — Sunday worship services over the period
  const attendanceTrend = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const a of db.attendance) {
      if (a.service !== "Sunday Worship") continue;
      byDate.set(a.serviceDate, (byDate.get(a.serviceDate) ?? 0) + 1);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-10);
  }, [db.attendance]);
  const maxAttendance = Math.max(1, ...attendanceTrend.map(([, c]) => c));
  const activeMembers = db.members.filter((m) => m.status === "active").length;
  const avgAttendance = attendanceTrend.length
    ? Math.round((attendanceTrend.reduce((s, [, c]) => s + c, 0) / attendanceTrend.length / Math.max(1, activeMembers)) * 100)
    : 0;

  function exportIncome() {
    downloadCSV(
      `income-report-${todayISO()}`,
      ["Month", "Dues", "Donations", "Funeral levy", "Building fund", "Other", "Total"],
      series.map((s) => [monthLabel(s.month), s.dues, s.donation, s.funeral, s.building, s.other, s.total]),
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Diocese-wide financial and stewardship analytics"
        actions={
          <>
            <Field label="Period" className="w-40">
              <select className={inputCls} value={range} onChange={(e) => setRange(Number(e.target.value))}>
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </Field>
            <Button variant="secondary" onClick={exportIncome}>
              <Download className="h-4 w-4" /> Export income
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={`Income (${months[0] ? monthLabel(months[0]) : ""} – ${monthLabel(months[months.length - 1])})`} value={formatMoney(grandTotal, symbol)} sub={`${series.length} months`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Dues collected" value={formatMoney(totals.dues, symbol)} sub={`${Math.round((totals.dues / Math.max(1, grandTotal)) * 100)}% of income`} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Donations & gifts" value={formatMoney(totals.donation, symbol)} sub={`${Math.round((totals.donation / Math.max(1, grandTotal)) * 100)}% of income`} icon={<BarChart3 className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Avg. Sunday attendance" value={`${avgAttendance}%`} sub={`${activeMembers} active members`} icon={<BarChart3 className="h-5 w-5" />} tone="indigo" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle title="Monthly income by category" hint="Stacked totals for the selected period" />
          <div className="flex h-52 items-end gap-2 sm:gap-4">
            {series.map((s) => {
              const h = Math.max(6, Math.round((s.total / maxTotal) * 100));
              return (
                <div key={s.month} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <p className="text-center text-[10px] font-bold text-brand-800/70">{formatMoney(s.total, symbol)}</p>
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-lg bg-brand-50"
                    style={{ height: `${h}%` }}
                    title={`${monthLabel(s.month)}: ${formatMoney(s.total, symbol)}`}
                  >
                    {(Object.keys(SEGMENT) as PaymentType[]).map((t) =>
                      s[t] > 0 ? <div key={t} className={SEGMENT[t]} style={{ height: `${(s[t] / s.total) * 100}%` }} /> : null,
                    )}
                  </div>
                  <p className="text-center text-[10px] font-semibold text-brand-800/60">{monthLabel(s.month)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-brand-100 pt-3">
            {(Object.keys(SEGMENT) as PaymentType[]).map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-800/70">
                <span className={`h-2.5 w-2.5 rounded-sm ${SEGMENT[t]}`} />
                {CATEGORY_LABEL[t]} · {formatMoney(totals[t], symbol)}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle title="Top donors" hint="All-time giving" />
          {topDonors.length === 0 ? (
            <p className="text-xs text-brand-800/60">No donations recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {topDonors.map(([id, total], i) => (
                <li key={id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">
                      {i + 1}. {memberName(db, id)}
                    </span>
                    <span className="font-semibold text-brand-800/70">{formatMoney(total, symbol)}</span>
                  </div>
                  <ProgressBar value={total} max={topMax} tone="emerald" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle title="Attendance trend" hint="Sunday worship services" />
          {attendanceTrend.length === 0 ? (
            <p className="text-xs text-brand-800/60">No attendance recorded yet.</p>
          ) : (
            <div className="flex h-44 items-end gap-2">
              {attendanceTrend.map(([date, count]) => (
                <div key={date} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                  <p className="text-center text-[10px] font-bold text-brand-800/70">{count}</p>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-700 to-brand-400"
                    style={{ height: `${Math.max(6, Math.round((count / maxAttendance) * 100))}%` }}
                    title={`${date}: ${count} present`}
                  />
                  <p className="text-center text-[10px] text-brand-800/55">{date.slice(8)}/{date.slice(5, 7)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5">
            <CardTitle title="Parish performance" hint="This month's dues and compliance" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Parish</th>
                  <th className={`${thCls} text-right`}>Active</th>
                  <th className={`${thCls} text-right`}>Dues</th>
                  <th className={`${thCls} text-right`}>Defaulters</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const parish = db.parishes.find((p) => p.id === s.parishId);
                  return (
                    <tr key={s.parishId} className={rowCls}>
                      <td className={`${tdCls} font-semibold text-ink`}>{parish?.name}</td>
                      <td className={`${tdCls} text-right`}>{s.active}</td>
                      <td className={`${tdCls} text-right font-bold`}>{formatMoney(s.duesThisMonth, symbol)}</td>
                      <td className={`${tdCls} text-right`}>
                        <Badge tone={s.defaulters === 0 ? "success" : s.defaulters <= 3 ? "warn" : "danger"}>
                          {s.defaulters}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="mt-4" padded={false}>
        <div className="px-5 pt-5">
          <CardTitle title="Income breakdown" hint="Per month, by category" actions={
            <Button size="sm" variant="secondary" onClick={exportIncome}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          } />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead className="bg-brand-50/60">
              <tr>
                <th className={thCls}>Month</th>
                <th className={`${thCls} text-right`}>Dues</th>
                <th className={`${thCls} text-right`}>Donations</th>
                <th className={`${thCls} text-right`}>Funeral levy</th>
                <th className={`${thCls} text-right`}>Building fund</th>
                <th className={`${thCls} text-right`}>Other</th>
                <th className={`${thCls} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((s) => (
                <tr key={s.month} className={rowCls}>
                  <td className={`${tdCls} font-semibold text-ink`}>{monthLabel(s.month)}</td>
                  <td className={`${tdCls} text-right`}>{formatMoney(s.dues, symbol)}</td>
                  <td className={`${tdCls} text-right`}>{formatMoney(s.donation, symbol)}</td>
                  <td className={`${tdCls} text-right`}>{formatMoney(s.funeral, symbol)}</td>
                  <td className={`${tdCls} text-right`}>{formatMoney(s.building, symbol)}</td>
                  <td className={`${tdCls} text-right`}>{formatMoney(s.other, symbol)}</td>
                  <td className={`${tdCls} text-right font-extrabold text-ink`}>{formatMoney(s.total, symbol)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-brand-200 bg-brand-50/60">
                <td className={`${tdCls} font-extrabold text-ink`}>Total</td>
                <td className={`${tdCls} text-right font-bold`}>{formatMoney(totals.dues, symbol)}</td>
                <td className={`${tdCls} text-right font-bold`}>{formatMoney(totals.donation, symbol)}</td>
                <td className={`${tdCls} text-right font-bold`}>{formatMoney(totals.funeral, symbol)}</td>
                <td className={`${tdCls} text-right font-bold`}>{formatMoney(totals.building, symbol)}</td>
                <td className={`${tdCls} text-right font-bold`}>{formatMoney(totals.other, symbol)}</td>
                <td className={`${tdCls} text-right font-extrabold text-brand-800`}>{formatMoney(grandTotal, symbol)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
