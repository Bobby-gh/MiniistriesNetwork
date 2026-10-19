"use client";

// Generic ledger page: Donations, Funeral Levy, Building Fund and Other Payments.

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Payment, PaymentMethod, PaymentType } from "@/lib/types";
import {
  currentMonthKey,
  downloadCSV,
  formatMoney,
  lastNMonths,
  monthKey,
  monthLabel,
  todayISO,
} from "@/lib/format";
import { defaulters, memberName } from "@/lib/selectors";
import { PaymentForm } from "./payment-form";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatCard,
  inputCls,
  rowCls,
  tdCls,
  thCls,
} from "./ui";

export interface FinancePageProps {
  type: PaymentType;
  heading: string;
  subtitle: string;
  tone?: "blue" | "indigo" | "emerald" | "amber" | "rose" | "sky";
  /** Rendered as a select when provided, otherwise a free-text field. */
  categoryLabel?: string;
  /** Building-fund style progress against a target. */
  showTarget?: boolean;
  /** Funeral-levy style "who has not paid this cycle" panel. */
  compliance?: boolean;
}

export function FinancePage({
  type,
  heading,
  subtitle,
  tone = "blue",
  categoryLabel = "Category",
  showTarget = false,
  compliance = false,
}: FinancePageProps) {
  const { db, removePayment, addAlerts } = useStore();
  const symbol = db.settings.currencySymbol;
  const month = currentMonthKey();
  const months = lastNMonths(12);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");

  const all = useMemo(
    () => db.payments.filter((p) => p.type === type).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [db.payments, type],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((p) => {
      if (monthFilter !== "all" && monthKey(p.date) !== monthFilter) return false;
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (!q) return true;
      return (
        memberName(db, p.memberId).toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.note.toLowerCase().includes(q)
      );
    });
  }, [all, db, search, monthFilter, methodFilter]);

  const totalAll = all.reduce((s, p) => s + p.amount, 0);
  const totalThisMonth = all.filter((p) => monthKey(p.date) === month).reduce((s, p) => s + p.amount, 0);
  const lastMonthKey = months[months.length - 2] ?? month;
  const totalLastMonth = all.filter((p) => monthKey(p.date) === lastMonthKey).reduce((s, p) => s + p.amount, 0);
  const average = all.length ? Math.round(totalAll / all.length) : 0;

  const topDonor = useMemo(() => {
    const tally = new Map<string, number>();
    for (const p of all) {
      const key = p.memberId || "";
      tally.set(key, (tally.get(key) ?? 0) + p.amount);
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    return { name: memberName(db, best[0]), total: best[1] };
  }, [all, db]);

  // Funeral-levy compliance this month
  const activeMembers = db.members.filter((m) => m.status === "active");
  const paidMemberIds = useMemo(
    () => new Set(all.filter((p) => monthKey(p.date) === month && p.memberId).map((p) => p.memberId)),
    [all, month],
  );
  const outstanding = activeMembers.filter((m) => !paidMemberIds.has(m.id));

  function handleSaved(payment: Payment | null) {
    setOpen(false);
    if (payment) {
      const who = memberName(db, payment.memberId);
      setFlash(
        `${formatMoney(payment.amount, symbol)} recorded for ${who}${payment.memberId ? " · payment alert queued" : ""}.`,
      );
      window.setTimeout(() => setFlash(""), 5000);
    }
  }

  function exportCSV() {
    downloadCSV(
      `${type}-ledger-${todayISO()}`,
      ["Date", "Member/Donor", "Category", "Method", "Reference", "Amount", "Note"],
      rows.map((p) => [
        p.date,
        memberName(db, p.memberId),
        p.category,
        p.method,
        p.reference,
        p.amount,
        p.note,
      ]),
    );
  }

  function alertOutstanding() {
    if (outstanding.length === 0) return;
    if (!window.confirm(`Send ${type === "funeral" ? "levy" : "payment"} reminders to ${outstanding.length} member(s)?`))
      return;
    addAlerts(
      outstanding.map((m) => ({
        kind: "defaulter" as const,
        memberId: m.id,
        title: type === "funeral" ? "Funeral levy reminder" : "Contribution reminder",
        message:
          type === "funeral"
            ? `Dear ${m.firstName}, the ${monthLabel(month)} funeral levy (${formatMoney(db.settings.funeralLevyAmount, symbol)}) is outstanding on your account. Kindly pay at the church office or by mobile money. — ${db.settings.alertSender}`
            : `Dear ${m.firstName}, your ${monthLabel(month)} ${heading.toLowerCase()} contribution is outstanding. Kindly fulfil it before month end. — ${db.settings.alertSender}`,
        channel: "SMS" as const,
      })),
    );
    setFlash(`Reminders queued for ${outstanding.length} member(s).`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  const methodOptions: PaymentMethod[] = ["Cash", "Mobile Money", "Bank Transfer", "Card", "Cheque"];

  return (
    <div>
      <PageHeader
        title={heading}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Record {type === "donation" ? "donation" : type === "funeral" ? "levy payment" : "payment"}
            </Button>
          </>
        }
      />

      {flash && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {flash}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total collected"
          value={formatMoney(totalAll, symbol)}
          sub={`${all.length} transactions on record`}
          icon={<Banknote className="h-5 w-5" />}
          tone={tone}
        />
        <StatCard
          label={`This month (${monthLabel(month)})`}
          value={formatMoney(totalThisMonth, symbol)}
          sub={`${monthLabel(lastMonthKey)}: ${formatMoney(totalLastMonth, symbol)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={tone}
        />
        {showTarget ? (
          <StatCard
            label="Remaining to target"
            value={formatMoney(Math.max(0, db.settings.buildingFundTarget - totalAll), symbol)}
            sub={`Target: ${formatMoney(db.settings.buildingFundTarget, symbol)}`}
            icon={<Coins className="h-5 w-5" />}
            tone="amber"
          />
        ) : compliance ? (
          <StatCard
            label="Levy compliance"
            value={`${activeMembers.length - outstanding.length}/${activeMembers.length}`}
            sub={`${outstanding.length} member(s) yet to pay`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone={outstanding.length ? "amber" : "emerald"}
          />
        ) : type === "donation" ? (
          <StatCard
            label="Top donor"
            value={topDonor ? formatMoney(topDonor.total, symbol) : "—"}
            sub={topDonor ? topDonor.name : "No donations yet"}
            icon={<Coins className="h-5 w-5" />}
            tone="emerald"
          />
        ) : (
          <StatCard
            label="Average per transaction"
            value={formatMoney(average, symbol)}
            sub={`${monthLabel(month)} total: ${formatMoney(totalThisMonth, symbol)}`}
            icon={<Coins className="h-5 w-5" />}
            tone={tone}
          />
        )}
        <StatCard
          label="This month's count"
          value={String(all.filter((p) => monthKey(p.date) === month).length)}
          sub={`Outstanding members: ${compliance ? outstanding.length : defaulters(db).length}`}
          icon={<ArrowDownToLine className="h-5 w-5" />}
          tone={tone}
        />
      </div>

      {showTarget && (
        <Card className="mt-4">
          <CardTitle
            title={db.settings.buildingFundName}
            hint={`${formatMoney(totalAll, symbol)} raised of ${formatMoney(db.settings.buildingFundTarget, symbol)} target`}
            actions={
              <Badge tone={totalAll >= db.settings.buildingFundTarget ? "success" : "info"}>
                {Math.min(100, Math.round((totalAll / db.settings.buildingFundTarget) * 100))}% funded
              </Badge>
            }
          />
          <ProgressBar value={totalAll} max={db.settings.buildingFundTarget} />
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-brand-800/70 sm:grid-cols-4">
            <p>
              <span className="block font-bold text-ink">
                {formatMoney(Math.round(totalAll / Math.max(1, months.length)), symbol)}
              </span>
              monthly average
            </p>
            <p>
              <span className="block font-bold text-ink">
                {formatMoney(Math.round(totalThisMonth), symbol)}
              </span>
              this month
            </p>
            <p>
              <span className="block font-bold text-ink">
                {all.filter((p) => monthKey(p.date) === month).length}
              </span>
              gifts this month
            </p>
            <p>
              <span className="block font-bold text-ink">
                {formatMoney(Math.round(average), symbol)}
              </span>
              average gift
            </p>
          </div>
        </Card>
      )}

      {compliance && (
        <Card className="mt-4">
          <CardTitle
            title={`Levy compliance — ${monthLabel(month)}`}
            hint={`${outstanding.length} of ${activeMembers.length} active members have not contributed`}
            actions={
              <Button variant="secondary" size="sm" onClick={alertOutstanding} disabled={outstanding.length === 0}>
                Alert non-contributors ({outstanding.length})
              </Button>
            }
          />
          {outstanding.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> All active members have paid this month&apos;s levy.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {outstanding.slice(0, 24).map((m) => (
                <span
                  key={m.id}
                  className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-[#475467]"
                >
                  {m.firstName} {m.lastName}
                </span>
              ))}
              {outstanding.length > 24 && (
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-500 ring-1 ring-neutral-200">
                  +{outstanding.length - 24} more
                </span>
              )}
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4" padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search member, category or reference…"
            className="w-full sm:w-72"
          />
          <Field label="Month" className="w-40">
            <select className={inputCls} value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="all">All months</option>
              {[...months].reverse().map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Method" className="w-40">
            <select className={inputCls} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="all">All methods</option>
              {methodOptions.map((mm) => (
                <option key={mm} value={mm}>
                  {mm}
                </option>
              ))}
            </select>
          </Field>
          <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">
            {rows.length} record(s) · {formatMoney(rows.reduce((s, p) => s + p.amount, 0), symbol)}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Coins className="h-6 w-6" />}
              title="No records match your filters"
              hint="Record your first transaction or widen the search to see the ledger."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" /> Record payment
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Member / Donor</th>
                  <th className={thCls}>{categoryLabel}</th>
                  <th className={thCls}>Method</th>
                  <th className={thCls}>Reference</th>
                  <th className={`${thCls} text-right`}>Amount</th>
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 120).map((p) => (
                  <tr key={p.id} className={rowCls}>
                    <td className={`${tdCls} whitespace-nowrap font-medium`}>{p.date}</td>
                    <td className={tdCls}>
                      {p.memberId ? (
                        <span className="font-semibold text-ink">{memberName(db, p.memberId)}</span>
                      ) : (
                        <Badge tone="neutral">Anonymous</Badge>
                      )}
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[240px] truncate">{p.category || "—"}</span>
                      {p.note && <span className="block max-w-[240px] truncate text-xs text-brand-800/50">{p.note}</span>}
                    </td>
                    <td className={tdCls}>
                      <Badge tone="info">{p.method}</Badge>
                    </td>
                    <td className={`${tdCls} font-mono text-xs`}>{p.reference}</td>
                    <td className={`${tdCls} text-right font-bold whitespace-nowrap text-ink`}>
                      {formatMoney(p.amount, symbol)}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Delete payment ${p.reference}?`)) removePayment(p.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 120 && (
              <p className="border-t border-brand-100 px-4 py-3 text-xs text-brand-800/60">
                Showing the 120 most recent of {rows.length} records — refine filters or export CSV for the full list.
              </p>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Record ${heading.toLowerCase()}`}
        description="Entries post straight to the diocesan ledger and can trigger an SMS alert."
      >
        <PaymentForm
          key={open ? "open" : "closed"}
          type={type}
          preset={{ date: todayISO() }}
          onDone={handleSaved}
        />
      </Modal>
    </div>
  );
}
