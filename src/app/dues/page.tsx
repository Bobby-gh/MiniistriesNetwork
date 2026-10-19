"use client";

// Monthly dues: expected vs collected, mark payments, remind defaulters.

import { useMemo, useState } from "react";
import { BellRing, CheckCircle2, FileSpreadsheet, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Member } from "@/lib/types";
import { currentMonthKey, downloadCSV, formatMoney, lastNMonths, monthLabel, todayISO } from "@/lib/format";
import { defaulters, duesForMonth, memberName } from "@/lib/selectors";
import { PaymentForm } from "@/components/payment-form";
import {
  Avatar,
  Badge,
  Button,
  Card,
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
} from "@/components/ui";

export default function DuesPage() {
  const { db, addAlerts } = useStore();
  const symbol = db.settings.currencySymbol;
  const [month, setMonth] = useState(currentMonthKey());
  const [search, setSearch] = useState("");
  const [parishFilter, setParishFilter] = useState("all");
  const [payFor, setPayFor] = useState<Member | null>(null);
  const [flash, setFlash] = useState("");

  const statuses = duesForMonth(db, month);
  const defaulterIds = new Set(defaulters(db).map((d) => d.member.id));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.members
      .filter((m) => m.status === "active" && m.joinDate.slice(0, 7) <= month)
      .filter((m) => (parishFilter === "all" ? true : m.parishId === parishFilter))
      .filter((m) => !q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.membershipNo.toLowerCase().includes(q))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [db.members, month, search, parishFilter]);

  const due = db.settings.duesMonthlyAmount;
  const expected = rows.length * due;
  const collected = db.payments
    .filter((p) => p.type === "dues" && p.period === month)
    .reduce((s, p) => s + p.amount, 0);
  const paidCount = rows.filter((m) => statuses.get(m.id)?.paid).length;
  const unpaid = rows.filter((m) => !statuses.get(m.id)?.paid);
  const compliance = rows.length ? Math.round((paidCount / rows.length) * 100) : 0;

  function remind(member: Member) {
    const arrears = defaulters(db).find((d) => d.member.id === member.id);
    addAlerts([
      {
        kind: arrears ? "defaulter" : "payment",
        memberId: member.id,
        title: arrears ? "Dues arrears notice" : "Dues reminder",
        message: arrears
          ? `Dear ${member.firstName}, your dues arrears stand at ${formatMoney(arrears.totalOwed, symbol)} across ${arrears.monthsOwed.length} month(s). Kindly regularise your account. — ${db.settings.alertSender}`
          : `Dear ${member.firstName}, a gentle reminder that your ${monthLabel(month)} dues of ${formatMoney(due, symbol)} are outstanding. Thank you. — ${db.settings.alertSender}`,
        channel: "SMS",
      },
    ]);
    setFlash(`Reminder queued for ${member.firstName} ${member.lastName}.`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  function remindAll() {
    if (unpaid.length === 0) return;
    if (!window.confirm(`Send ${monthLabel(month)} dues reminders to ${unpaid.length} member(s)?`)) return;
    const arrearsMap = new Map(defaulters(db).map((d) => [d.member.id, d]));
    addAlerts(
      unpaid.map((member) => {
        const arrears = arrearsMap.get(member.id);
        return {
          kind: arrears ? ("defaulter" as const) : ("payment" as const),
          memberId: member.id,
          title: arrears ? "Dues arrears notice" : "Dues reminder",
          message: arrears
            ? `Dear ${member.firstName}, your dues arrears stand at ${formatMoney(arrears.totalOwed, symbol)} across ${arrears.monthsOwed.length} month(s). Kindly regularise your account. — ${db.settings.alertSender}`
            : `Dear ${member.firstName}, a gentle reminder that your ${monthLabel(month)} dues of ${formatMoney(due, symbol)} are outstanding. Thank you. — ${db.settings.alertSender}`,
          channel: "SMS" as const,
        };
      }),
    );
    setFlash(`Reminders queued for ${unpaid.length} member(s).`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  function exportCSV() {
    downloadCSV(
      `dues-${month}`,
      ["Membership No.", "Member", "Parish", "Status", "Amount Paid", "Paid On", "Expected"],
      rows.map((m) => {
        const s = statuses.get(m.id);
        return [
          m.membershipNo,
          memberName(db, m.id),
          db.parishes.find((p) => p.id === m.parishId)?.name ?? "",
          s?.paid ? "Paid" : "Unpaid",
          s?.paid ? s.paidAmount : 0,
          s?.paymentDate ?? "",
          due,
        ];
      }),
    );
  }

  return (
    <div>
      <PageHeader
        title="Monthly Dues"
        subtitle={`Reconcile member dues for ${monthLabel(month)} · ${formatMoney(due, symbol)} per member per month`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" /> Export dues sheet
            </Button>
            <Button variant="secondary" onClick={remindAll} disabled={unpaid.length === 0}>
              <BellRing className="h-4 w-4" /> Remind all unpaid ({unpaid.length})
            </Button>
          </>
        }
      />

      {flash && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {flash}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Expected" value={formatMoney(expected, symbol)} sub={`${rows.length} members × ${formatMoney(due, symbol)}`} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Collected" value={formatMoney(collected, symbol)} sub={monthLabel(month)} icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label="Outstanding"
          value={formatMoney(Math.max(0, expected - collected), symbol)}
          sub={`${unpaid.length} member(s) unpaid`}
          icon={<BellRing className="h-5 w-5" />}
          tone={unpaid.length ? "amber" : "emerald"}
        />
        <StatCard label="Compliance" value={`${compliance}%`} sub={`${paidCount} of ${rows.length} paid`} icon={<Wallet className="h-5 w-5" />} tone={compliance >= 75 ? "emerald" : "amber"} />
      </div>

      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={compliance} max={100} tone={compliance >= 75 ? "emerald" : compliance >= 50 ? "brand" : "amber"} />
          </div>
          <span className="text-xs font-bold text-brand-800/70">{compliance}% collected</span>
        </div>
      </Card>

      <Card className="mt-4" padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
          <Field label="Dues month" className="w-44">
            <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
              {[...lastNMonths(12)].reverse().map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Parish" className="w-52">
            <select className={inputCls} value={parishFilter} onChange={(e) => setParishFilter(e.target.value)}>
              <option value="all">All parishes</option>
              {db.parishes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <SearchInput value={search} onChange={setSearch} placeholder="Search member…" className="w-full sm:w-64" />
          <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">{rows.length} member(s)</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No active members for this month" hint="Register members or adjust the filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Member</th>
                  <th className={thCls}>Parish</th>
                  <th className={thCls}>Status ({monthLabel(month)})</th>
                  <th className={`${thCls} text-right`}>Paid</th>
                  <th className={thCls}>Paid on</th>
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const s = statuses.get(m.id);
                  const isDefaulter = defaulterIds.has(m.id);
                  return (
                    <tr key={m.id} className={rowCls}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <Avatar first={m.firstName} last={m.lastName} size="sm" />
                          <div>
                            <p className="font-bold text-ink">
                              {m.firstName} {m.lastName}
                            </p>
                            <p className="text-xs text-brand-800/55">{m.membershipNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="block max-w-[180px] truncate">
                          {db.parishes.find((p) => p.id === m.parishId)?.name ?? "—"}
                        </span>
                      </td>
                      <td className={tdCls}>
                        {s?.paid ? (
                          <Badge tone="success">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </Badge>
                        ) : isDefaulter ? (
                          <Badge tone="danger">Arrears</Badge>
                        ) : (
                          <Badge tone="warn">Unpaid</Badge>
                        )}
                      </td>
                      <td className={`${tdCls} text-right font-bold text-ink`}>{s?.paid ? formatMoney(s.paidAmount, symbol) : "—"}</td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-brand-800/70`}>{s?.paymentDate ?? "—"}</td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex justify-end gap-1.5">
                          {!s?.paid && (
                            <Button size="sm" onClick={() => setPayFor(m)}>
                              Mark paid
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => remind(m)}>
                            <BellRing className="h-3.5 w-3.5" /> Remind
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title={payFor ? `Dues — ${memberName(db, payFor.id)}` : ""}
        description={`${monthLabel(month)} · ${formatMoney(due, symbol)} expected`}
      >
        {payFor && (
          <PaymentForm
            key={`${payFor.id}-${month}`}
            type="dues"
            preset={{ memberId: payFor.id, period: month, date: todayISO() }}
            onDone={(p) => {
              if (p) {
                setFlash(`${formatMoney(p.amount, symbol)} received from ${memberName(db, payFor.id)}.`);
                window.setTimeout(() => setFlash(""), 5000);
              }
              setPayFor(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
