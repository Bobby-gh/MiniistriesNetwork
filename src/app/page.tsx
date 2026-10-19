"use client";

// Diocesan dashboard: the numbers that matter, at a glance.

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  Coins,
  HandCoins,
  PiggyBank,
  PlusCircle,
  Repeat2,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type { PaymentType } from "@/lib/types";
import { currentMonthKey, formatDate, formatMoney, lastNMonths, monthLabel, todayISO } from "@/lib/format";
import { attendanceRate, defaulters, duesForMonth, incomeSeries, memberName, type MonthIncome } from "@/lib/selectors";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  PageHeader,
  ProgressBar,
  StatCard,
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
  dues: "Dues",
  donation: "Donations",
  funeral: "Funeral levy",
  building: "Building fund",
  other: "Other",
};

export default function DashboardPage() {
  const { db } = useStore();
  const { session } = useAuth();
  const symbol = db.settings.currencySymbol;
  const month = currentMonthKey();
  const monthName = monthLabel(month);

  const statuses = duesForMonth(db, month);
  const activeCount = [...statuses.keys()].length;
  const paidCount = [...statuses.values()].filter((s) => s.paid).length;
  const compliance = activeCount ? Math.round((paidCount / activeCount) * 100) : 0;

  const monthPayments = db.payments.filter((p) => p.date.slice(0, 7) === month);
  const duesThisMonth = monthPayments.filter((p) => p.type === "dues").reduce((s, p) => s + p.amount, 0);
  const donationsThisMonth = monthPayments.filter((p) => p.type === "donation").reduce((s, p) => s + p.amount, 0);

  const defaulterList = defaulters(db);
  const arrears = defaulterList.reduce((s, d) => s + d.totalOwed, 0);

  const buildingTotal = db.payments.filter((p) => p.type === "building").reduce((s, p) => s + p.amount, 0);
  const target = db.settings.buildingFundTarget;

  // Most recent Sunday worship turnout
  const sundays = [...new Set(db.attendance.filter((a) => a.service === "Sunday Worship").map((a) => a.serviceDate))]
    .sort()
    .reverse();
  const lastSunday = sundays[0];
  const lastSundayCount = lastSunday
    ? db.attendance.filter((a) => a.serviceDate === lastSunday && a.service === "Sunday Worship").length
    : 0;
  const lastSundayRate = lastSunday ? Math.round((lastSundayCount / Math.max(1, activeCount)) * 100) : 0;

  const series: MonthIncome[] = incomeSeries(db, lastNMonths(6));

  const recent = [...db.payments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const queuedAlerts = db.alerts.filter((a) => a.status === "queued").length;
  const pendingTransfers = db.transfers.filter((t) => t.status === "pending").length;

  return (
    <div>
      <PageHeader
        title={db.settings.dioceseName}
        subtitle={`Welcome back, ${session?.name ?? "friend"} · ${db.settings.dioceseSubtitle} · ${formatDate(todayISO())}`}
        actions={
          <>
            <Link href="/attendance">
              <Button variant="secondary">
                <CalendarCheck className="h-4 w-4" /> Mark attendance
              </Button>
            </Link>
            <Link href="/dues">
              <Button>
                <PlusCircle className="h-4 w-4" /> Record dues
              </Button>
            </Link>
          </>
        }
      />

      {/* Quick actions */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { href: "/members", label: "Register member", icon: UserPlus },
          { href: "/dues", label: "Collect dues", icon: Wallet },
          { href: "/donations", label: "Record donation", icon: HandCoins },
          { href: "/funeral-levy", label: "Funeral levy", icon: Coins },
          { href: "/building-fund", label: "Building fund", icon: PiggyBank },
          { href: "/transfers", label: "Transfer", icon: Repeat2 },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group flex items-center gap-2.5 rounded-xl border border-neutral-200/70 bg-white px-3.5 py-3 text-sm font-medium text-[#344054] shadow-card transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <q.icon className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-brand-600" />
            <span className="truncate">{q.label}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 -translate-x-1 text-neutral-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label="Active members"
          value={String(activeCount)}
          sub={`${db.members.length} on register · ${db.parishes.length} parishes`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label={`Dues — ${monthName}`}
          value={formatMoney(duesThisMonth, symbol)}
          sub={`${compliance}% compliance (${paidCount}/${activeCount})`}
          icon={<Wallet className="h-5 w-5" />}
          tone={compliance >= 75 ? "emerald" : "amber"}
        />
        <StatCard
          label="Donations — this month"
          value={formatMoney(donationsThisMonth, symbol)}
          sub={`${monthPayments.filter((p) => p.type === "donation").length} gifts recorded`}
          icon={<HandCoins className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Dues defaulters"
          value={String(defaulterList.length)}
          sub={`Arrears: ${formatMoney(arrears, symbol)}`}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone={defaulterList.length ? "rose" : "emerald"}
        />
        <StatCard
          label="Building fund"
          value={formatMoney(buildingTotal, symbol)}
          sub={`${Math.min(100, Math.round((buildingTotal / Math.max(1, target)) * 100))}% of ${formatMoney(target, symbol)} target`}
          icon={<PiggyBank className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Last Sunday's worship"
          value={lastSunday ? `${lastSundayCount}` : "—"}
          sub={lastSunday ? `${lastSundayRate}% turnout · ${formatDate(lastSunday)}` : "No attendance yet"}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="indigo"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle
            title="Income — last 6 months"
            hint="Dues, donations, levy, building fund and other income"
            actions={
              <Link href="/reports">
                <Button size="sm" variant="secondary">
                  Full report <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />
          <div className="h-48 w-full" role="img" aria-label="Stacked bar chart of income by category for the last six months">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} stroke="#dce8fe" />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fill: "#1b41b4", fontSize: 10, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) =>
                    `${symbol}${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`
                  }
                  tick={{ fill: "#1b41b4", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  labelFormatter={(label) => monthLabel(String(label))}
                  formatter={(value, name) => [
                    formatMoney(Number(value), symbol),
                    String(name),
                  ]}
                  contentStyle={{ borderRadius: 12, borderColor: "#dce8fe", fontSize: 12 }}
                  cursor={{ fill: "#eff5ff" }}
                />
                {(Object.keys(SEGMENT) as PaymentType[]).map((type) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    name={CATEGORY_LABEL[type]}
                    stackId="income"
                    fill={
                      {
                        dues: "#2563eb",
                        donation: "#10b981",
                        funeral: "#6366f1",
                        building: "#f59e0b",
                        other: "#38bdf8",
                      }[type]
                    }
                    radius={type === "other" ? [4, 4, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-brand-100 pt-3">
            {(Object.keys(SEGMENT) as PaymentType[]).map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-800/70">
                <span className={`h-2.5 w-2.5 rounded-sm ${SEGMENT[t]}`} />
                {CATEGORY_LABEL[t]}
              </span>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle title={db.settings.buildingFundName} hint="Project funding progress" />
            <div className="mb-2 flex items-end justify-between">
              <p className="text-2xl font-extrabold text-ink">{formatMoney(buildingTotal, symbol)}</p>
              <Badge tone={buildingTotal >= target ? "success" : "info"}>
                {Math.min(100, Math.round((buildingTotal / Math.max(1, target)) * 100))}%
              </Badge>
            </div>
            <ProgressBar value={buildingTotal} max={target} />
            <p className="mt-2 text-xs text-brand-800/60">
              {formatMoney(Math.max(0, target - buildingTotal), symbol)} to go of {formatMoney(target, symbol)} target
            </p>
          </Card>

          <Card>
            <CardTitle
              title="Needs attention"
              hint="Items awaiting the diocesan office"
              actions={
                <Link href="/alerts">
                  <Button size="sm" variant="secondary">
                    Alerts <BellRing className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              }
            />
            <ul className="divide-y divide-neutral-100 text-sm">
              {[
                { icon: ShieldAlert, label: "Members in arrears", count: defaulterList.length, href: "/defaulters", dot: "bg-rose-500" },
                { icon: Wallet, label: "Unpaid dues this month", count: activeCount - paidCount, href: "/dues", dot: "bg-amber-500" },
                { icon: BellRing, label: "Queued alerts", count: queuedAlerts, href: "/alerts", dot: "bg-brand-500" },
                { icon: Repeat2, label: "Pending transfers", count: pendingTransfers, href: "/transfers", dot: "bg-indigo-400" },
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.dot}`} aria-hidden />
                  <row.icon className="h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="flex-1 text-[#475467]">{row.label}</span>
                  <Link
                    href={row.href}
                    className="tabular flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand-700"
                  >
                    {row.count} <ArrowRight className="h-3 w-3 text-neutral-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-4" padded={false}>
        <div className="px-5 pt-5">
          <CardTitle
            title="Recent payments"
            hint="Latest entries across all categories"
            actions={
              <Link href="/reports">
                <Button size="sm" variant="secondary">
                  View reports <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-brand-50/60">
              <tr>
                <th className={thCls}>Date</th>
                <th className={thCls}>Member / Donor</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Method</th>
                <th className={`${thCls} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className={rowCls}>
                  <td className={`${tdCls} whitespace-nowrap font-medium`}>{p.date}</td>
                  <td className={`${tdCls} font-semibold text-ink`}>{memberName(db, p.memberId)}</td>
                  <td className={tdCls}>
                    <span className="block max-w-[220px] truncate">{p.category || "—"}</span>
                  </td>
                  <td className={tdCls}>
                    <Badge tone={p.type === "donation" ? "success" : p.type === "building" ? "warn" : "neutral"}>
                      {CATEGORY_LABEL[p.type]}
                    </Badge>
                  </td>
                  <td className={tdCls}>
                    <Badge tone="info">{p.method}</Badge>
                  </td>
                  <td className={`${tdCls} text-right font-bold text-ink`}>{formatMoney(p.amount, symbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle title="Faithfulness snapshot" hint="Attendance across the last 12 services" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {db.members
            .filter((m) => m.status === "active")
            .slice(0, 3)
            .map((m) => {
              const rate = attendanceRate(db, m.id) ?? 0;
              return (
                <div key={m.id} className="rounded-lg border border-neutral-200/70 px-3 py-2.5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#344054]">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="tabular font-semibold text-ink">{rate}%</span>
                  </div>
                  <ProgressBar value={rate} max={100} tone={rate >= 70 ? "emerald" : rate >= 40 ? "brand" : "amber"} />
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
