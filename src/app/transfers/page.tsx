"use client";

// Member transfers between parishes of the network.

import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Plus, Repeat2, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Transfer } from "@/lib/types";
import { downloadCSV, formatDate, todayISO } from "@/lib/format";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, StatCard, inputCls, rowCls, tdCls, thCls } from "@/components/ui";

export default function TransfersPage() {
  const { db, addTransfer, setTransferStatus, removeTransfer } = useStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | Transfer["status"]>("all");
  const [form, setForm] = useState({
    memberId: "",
    toParishId: "",
    date: todayISO(),
    reason: "",
  });

  const member = db.members.find((m) => m.id === form.memberId);
  const rows = useMemo(
    () =>
      db.transfers
        .filter((t) => filter === "all" || t.status === filter)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [db.transfers, filter],
  );

  const nameOf = (id: string) => {
    const m = db.members.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : "Unknown member";
  };
  const parishOf = (id: string) => db.parishes.find((p) => p.id === id)?.name ?? "—";

  const pending = db.transfers.filter((t) => t.status === "pending").length;

  function submit() {
    if (!member || !form.toParishId) return;
    addTransfer({
      memberId: member.id,
      fromParishId: member.parishId,
      toParishId: form.toParishId,
      date: form.date,
      reason: form.reason.trim(),
    });
    setForm({ memberId: "", toParishId: "", date: todayISO(), reason: "" });
    setOpen(false);
  }

  function exportCSV() {
    downloadCSV(
      `transfers-${todayISO()}`,
      ["Date", "Member", "From", "To", "Reason", "Status"],
      rows.map((t) => [t.date, nameOf(t.memberId), parishOf(t.fromParishId), parishOf(t.toParishId), t.reason, t.status]),
    );
  }

  return (
    <div>
      <PageHeader
        title="Transfers"
        subtitle="Members moving between parishes — approve or reject requests from the register"
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New transfer
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total transfers" value={String(db.transfers.length)} sub="All time" icon={<Repeat2 className="h-5 w-5" />} />
        <StatCard label="Pending approval" value={String(pending)} sub="Awaiting diocesan action" icon={<Plus className="h-5 w-5" />} tone={pending ? "amber" : "emerald"} />
        <StatCard label="Approved" value={String(db.transfers.filter((t) => t.status === "approved").length)} sub="Completed moves" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Rejected" value={String(db.transfers.filter((t) => t.status === "rejected").length)} sub="Declined requests" icon={<XCircle className="h-5 w-5" />} tone="rose" />
      </div>

      <Card className="mt-4" padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 p-4">
          <Field label="Show" className="w-44">
            <select className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="all">All transfers</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </Field>
          <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">{rows.length} record(s)</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Repeat2 className="h-6 w-6" />}
              title="No transfers recorded"
              hint="When a member moves to another parish in the network, record the transfer here for approval."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" /> New transfer
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Member</th>
                  <th className={thCls}>From</th>
                  <th className={thCls}>To</th>
                  <th className={thCls}>Reason</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className={rowCls}>
                    <td className={`${tdCls} whitespace-nowrap font-medium`}>{formatDate(t.date)}</td>
                    <td className={`${tdCls} font-semibold text-ink`}>{nameOf(t.memberId)}</td>
                    <td className={tdCls}>{parishOf(t.fromParishId)}</td>
                    <td className={tdCls}>{parishOf(t.toParishId)}</td>
                    <td className={tdCls}>
                      <span className="block max-w-[240px] truncate text-brand-800/70">{t.reason || "—"}</span>
                    </td>
                    <td className={tdCls}>
                      <Badge tone={t.status === "approved" ? "success" : t.status === "pending" ? "warn" : "danger"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        {t.status === "pending" && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setTransferStatus(t.id, "approved")}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setTransferStatus(t.id, "rejected")}>
                              <XCircle className="h-3.5 w-3.5 text-rose-500" /> Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Delete this transfer record?")) removeTransfer(t.id);
                          }}
                        >
                          Delete
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
        open={open}
        onClose={() => setOpen(false)}
        title="Record a transfer"
        description="The member moves from their current parish to another in the network"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!member || !form.toParishId}>
              Submit transfer
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Member *" className="sm:col-span-2">
            <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
              <option value="">— Select member —</option>
              {db.members
                .filter((m) => m.status === "active")
                .sort((a, b) => a.lastName.localeCompare(b.lastName))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} · {m.membershipNo}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Current parish">
            <input className={inputCls} value={member ? parishOf(member.parishId) : "—"} disabled />
          </Field>
          <Field label="Receiving parish *">
            <select className={inputCls} value={form.toParishId} onChange={(e) => setForm({ ...form, toParishId: e.target.value })}>
              <option value="">— Select parish —</option>
              {db.parishes
                .filter((p) => p.id !== member?.parishId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Date of transfer">
            <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <input
              className={inputCls}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Relocation for work"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
