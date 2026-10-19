"use client";

// Defaulters: members whose dues are beyond the arrears threshold.

import { useMemo, useState } from "react";
import { BellRing, FileSpreadsheet, ShieldAlert, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Member } from "@/lib/types";
import { downloadCSV, formatMoney, monthLabel, todayISO } from "@/lib/format";
import { defaulters, memberName } from "@/lib/selectors";
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
  SearchInput,
  StatCard,
  inputCls,
  rowCls,
  tdCls,
  thCls,
} from "@/components/ui";

export default function DefaultersPage() {
  const { db, addAlerts } = useStore();
  const symbol = db.settings.currencySymbol;
  const [threshold, setThreshold] = useState(db.settings.defaulterThresholdMonths);
  const [search, setSearch] = useState("");
  const [parishFilter, setParishFilter] = useState("all");
  const [payFor, setPayFor] = useState<Member | null>(null);
  const [flash, setFlash] = useState("");

  const list = useMemo(() => defaulters(db, threshold), [db, threshold]);
  const q = search.trim().toLowerCase();
  const rows = list.filter((d) => {
    if (parishFilter !== "all" && d.member.parishId !== parishFilter) return false;
    if (!q) return true;
    return (
      `${d.member.firstName} ${d.member.lastName}`.toLowerCase().includes(q) ||
      d.member.membershipNo.toLowerCase().includes(q) ||
      d.member.phone.toLowerCase().includes(q)
    );
  });

  const totalOwed = list.reduce((s, d) => s + d.totalOwed, 0);
  const sentAlerts = db.alerts.filter((a) => a.kind === "defaulter").length;
  const activeCount = db.members.filter((m) => m.status === "active").length;

  function alertFor(member: Member) {
    const d = list.find((x) => x.member.id === member.id);
    addAlerts([
      {
        kind: "defaulter",
        memberId: member.id,
        title: "Dues arrears notice",
        message: `Dear ${member.firstName}, your diocesan dues are in arrears: ${formatMoney(d?.totalOwed ?? 0, symbol)} across ${
          d?.monthsOwed.length ?? 0
        } month(s) (${(d?.monthsOwed ?? []).map(monthLabel).join(", ")}). Kindly regularise your account. — ${db.settings.alertSender}`,
        channel: "SMS",
      },
    ]);
    setFlash(`Defaulter alert queued for ${member.firstName} ${member.lastName}.`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  function alertAll() {
    if (rows.length === 0) return;
    if (!window.confirm(`Generate defaulter alerts for all ${rows.length} member(s) shown?`)) return;
    addAlerts(
      rows.map((d) => ({
        kind: "defaulter" as const,
        memberId: d.member.id,
        title: "Dues arrears notice",
        message: `Dear ${d.member.firstName}, your diocesan dues are in arrears: ${formatMoney(d.totalOwed, symbol)} across ${d.monthsOwed.length} month(s) (${d.monthsOwed.map(monthLabel).join(", ")}). Kindly regularise your account. — ${db.settings.alertSender}`,
        channel: "SMS" as const,
      })),
    );
    setFlash(`${rows.length} defaulter alert(s) queued — see the Alerts page to send them.`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  function exportCSV() {
    downloadCSV(
      `defaulters-${todayISO()}`,
      ["Membership No.", "Member", "Parish", "Phone", "Months Owed", "Oldest Month", "Total Owed"],
      rows.map((d) => [
        d.member.membershipNo,
        memberName(db, d.member.id),
        db.parishes.find((p) => p.id === d.member.parishId)?.name ?? "",
        d.member.phone,
        d.monthsOwed.length,
        d.monthsOwed[0] ?? "",
        d.totalOwed,
      ]),
    );
  }

  return (
    <div>
      <PageHeader
        title="Defaulters"
        subtitle="Members whose monthly dues have gone unpaid beyond the arrears threshold"
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" /> Export list
            </Button>
            <Button onClick={alertAll} disabled={rows.length === 0}>
              <BellRing className="h-4 w-4" /> Generate alerts ({rows.length})
            </Button>
          </>
        }
      />

      <div className="mb-4 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white px-4 py-3 text-sm text-brand-900">
        <ShieldAlert className="mr-2 inline h-4 w-4 text-brand-700" />
        A member is flagged as a defaulter after <strong>{threshold} consecutive unpaid month(s)</strong> of dues.{" "}
        <a href="/settings" className="font-semibold text-brand-700 underline underline-offset-2">
          Change in Settings
        </a>
        .
      </div>

      {flash && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {flash}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Defaulters" value={String(list.length)} sub={`of ${activeCount} active members`} icon={<ShieldAlert className="h-5 w-5" />} tone={list.length ? "rose" : "emerald"} />
        <StatCard label="Total arrears" value={formatMoney(totalOwed, symbol)} sub="Dues owed to the diocese" icon={<Wallet className="h-5 w-5" />} tone="amber" />
        <StatCard
          label="Worst case"
          value={list[0] ? `${list[0].monthsOwed.length} mo.` : "—"}
          sub={list[0] ? `${list[0].member.firstName} ${list[0].member.lastName}` : "No arrears"}
          icon={<BellRing className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard label="Defaulter alerts" value={String(sentAlerts)} sub="Generated to date" icon={<BellRing className="h-5 w-5" />} tone="sky" />
      </div>

      <Card className="mt-4" padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
          <Field label="Threshold" className="w-40" hint="Consecutive unpaid months">
            <select className={inputCls} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {n}+ months
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
          <SearchInput value={search} onChange={setSearch} placeholder="Search member or phone…" className="w-full sm:w-64" />
          <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">{rows.length} defaulter(s)</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ShieldAlert className="h-6 w-6" />}
              title="No defaulters at this threshold"
              hint="Every active member is within their dues obligation. Adjust the threshold to widen the review."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Member</th>
                  <th className={thCls}>Parish</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Months owed</th>
                  <th className={`${thCls} text-right`}>Total owed</th>
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.member.id} className={rowCls}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <Avatar first={d.member.firstName} last={d.member.lastName} size="sm" />
                        <div>
                          <p className="font-bold text-ink">
                            {d.member.firstName} {d.member.lastName}
                          </p>
                          <p className="text-xs text-brand-800/55">{d.member.membershipNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[170px] truncate">
                        {db.parishes.find((p) => p.id === d.member.parishId)?.name ?? "—"}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-xs`}>{d.member.phone}</td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone="danger">{d.monthsOwed.length} mo.</Badge>
                        <span className="text-[11px] text-brand-800/60">
                          {d.monthsOwed.slice(0, 3).map(monthLabel).join(", ")}
                          {d.monthsOwed.length > 3 ? ` +${d.monthsOwed.length - 3}` : ""}
                        </span>
                      </div>
                    </td>
                    <td className={`${tdCls} text-right font-bold text-rose-700`}>{formatMoney(d.totalOwed, symbol)}</td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" onClick={() => setPayFor(d.member)}>
                          Record payment
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => alertFor(d.member)}>
                          <BellRing className="h-3.5 w-3.5" /> Alert
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title={payFor ? `Settle arrears — ${memberName(db, payFor.id)}` : ""}
        description="Record a dues payment against the member's account"
      >
        {payFor && (
          <PaymentForm
            key={payFor.id}
            type="dues"
            preset={{ memberId: payFor.id }}
            onDone={(p) => {
              if (p) {
                setFlash(`Payment recorded for ${memberName(db, payFor.id)}.`);
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
