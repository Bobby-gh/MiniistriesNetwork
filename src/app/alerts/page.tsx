"use client";

// Alerts centre: payment notifications and defaulter notices.

import { useMemo, useState } from "react";
import { BellRing, CheckCheck, Mail, MessageSquare, Send, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ALERT_CHANNELS, type AlertChannel, type AlertKind } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { memberName } from "@/lib/selectors";
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
  cn,
  inputCls,
  rowCls,
  tdCls,
  thCls,
} from "@/components/ui";

const TEMPLATES: { label: string; kind: AlertKind; title: string; message: string }[] = [
  {
    label: "Payment received",
    kind: "payment",
    title: "Payment received",
    message:
      "Dear {name}, we have received your payment and a receipt has been issued. Thank you for your faithfulness. — {sender}",
  },
  {
    label: "Dues reminder",
    kind: "payment",
    title: "Monthly dues reminder",
    message: "Dear {name}, this is a gentle reminder that your monthly dues are outstanding. Kindly pay before month end. — {sender}",
  },
  {
    label: "Defaulter notice",
    kind: "defaulter",
    title: "Dues arrears notice",
    message:
      "Dear {name}, your dues are in arrears and your account has been flagged. Kindly regularise it at the church office. — {sender}",
  },
  {
    label: "Building fund appeal",
    kind: "payment",
    title: "Building project appeal",
    message: "Dear {name}, we are making progress on our building project. Kindly fulfil your pledge this month. — {sender}",
  },
];

export default function AlertsPage() {
  const { db, addAlerts, markAlertSent, removeAlert } = useStore();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | AlertKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "sent">("all");
  const [channelFilter, setChannelFilter] = useState<"all" | AlertChannel>("all");
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");

  const [form, setForm] = useState({
    memberId: "",
    kind: "payment" as AlertKind,
    channel: "SMS" as AlertChannel,
    title: "Payment received",
    message: "",
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.alerts
      .filter((a) => (kindFilter === "all" ? true : a.kind === kindFilter))
      .filter((a) => (statusFilter === "all" ? true : a.status === statusFilter))
      .filter((a) => (channelFilter === "all" ? true : a.channel === channelFilter))
      .filter((a) => !q || memberName(db, a.memberId).toLowerCase().includes(q) || a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [db, search, kindFilter, statusFilter, channelFilter]);

  const queued = db.alerts.filter((a) => a.status === "queued");
  const member = db.members.find((m) => m.id === form.memberId);

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setForm((f) => ({
      ...f,
      kind: t.kind,
      title: t.title,
      message: t.message
        .replace("{name}", member ? member.firstName : "{name}")
        .replace("{sender}", db.settings.alertSender),
    }));
  }

  function compose() {
    if (!member) return;
    if (!form.message.trim()) return;
    addAlerts([
      {
        kind: form.kind,
        memberId: member.id,
        title: form.title.trim() || "Notice",
        message: form.message.trim(),
        channel: form.channel,
      },
    ]);
    setFlash(`Alert queued for ${member.firstName} ${member.lastName} via ${form.channel}.`);
    setForm({ memberId: "", kind: "payment", channel: "SMS", title: "Payment received", message: "" });
    setOpen(false);
    window.setTimeout(() => setFlash(""), 5000);
  }

  function sendAll() {
    if (queued.length === 0) return;
    if (!window.confirm(`Send all ${queued.length} queued alert(s) now?`)) return;
    queued.forEach((a) => markAlertSent(a.id));
    setFlash(`${queued.length} alert(s) marked as sent.`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Payment notifications and defaulter notices queued for SMS, WhatsApp, email or print"
        actions={
          <>
            <Button variant="secondary" onClick={sendAll} disabled={queued.length === 0}>
              <Send className="h-4 w-4" /> Send all queued ({queued.length})
            </Button>
            <Button onClick={() => setOpen(true)}>
              <BellRing className="h-4 w-4" /> Compose alert
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
        <StatCard label="Total alerts" value={String(db.alerts.length)} sub="All time" icon={<BellRing className="h-5 w-5" />} />
        <StatCard label="Queued" value={String(queued.length)} sub="Awaiting dispatch" icon={<Send className="h-5 w-5" />} tone={queued.length ? "amber" : "emerald"} />
        <StatCard label="Payment alerts" value={String(db.alerts.filter((a) => a.kind === "payment").length)} sub="Receipts & reminders" icon={<MessageSquare className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Defaulter alerts" value={String(db.alerts.filter((a) => a.kind === "defaulter").length)} sub="Arrears notices" icon={<Mail className="h-5 w-5" />} tone="rose" />
      </div>

      <Card className="mt-4" padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search alerts…" className="w-full sm:w-64" />
          <Field label="Kind" className="w-36">
            <select className={inputCls} value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}>
              <option value="all">All kinds</option>
              <option value="payment">Payment</option>
              <option value="defaulter">Defaulter</option>
            </select>
          </Field>
          <Field label="Status" className="w-32">
            <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">All</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
            </select>
          </Field>
          <Field label="Channel" className="w-36">
            <select className={inputCls} value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as typeof channelFilter)}>
              <option value="all">All channels</option>
              {ALERT_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">{rows.length} alert(s)</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<BellRing className="h-6 w-6" />}
              title="No alerts here"
              hint="Alerts are created automatically when payments are recorded, or compose one manually."
              action={
                <Button onClick={() => setOpen(true)}>
                  <BellRing className="h-4 w-4" /> Compose alert
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Date</th>
                  <th className={thCls}>Recipient</th>
                  <th className={thCls}>Kind</th>
                  <th className={thCls}>Channel</th>
                  <th className={thCls}>Message</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className={rowCls}>
                    <td className={`${tdCls} whitespace-nowrap text-xs font-medium`}>{formatDate(a.date)}</td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2.5">
                        <MemberDot memberId={a.memberId} />
                        <div>
                          <p className="text-sm font-bold text-ink">{memberName(db, a.memberId)}</p>
                          <p className="text-[11px] text-brand-800/55">{db.members.find((m) => m.id === a.memberId)?.phone ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <Badge tone={a.kind === "defaulter" ? "danger" : "success"}>{a.kind}</Badge>
                    </td>
                    <td className={tdCls}>
                      <Badge tone="info">{a.channel}</Badge>
                    </td>
                    <td className={tdCls}>
                      <p className="max-w-[320px] truncate text-xs font-semibold text-ink" title={a.message}>
                        {a.title}
                      </p>
                      <p className="max-w-[320px] truncate text-[11px] text-brand-800/60" title={a.message}>
                        {a.message}
                      </p>
                    </td>
                    <td className={tdCls}>
                      <Badge tone={a.status === "sent" ? "success" : "warn"}>{a.status === "sent" ? `sent ${a.sentAt ? formatDate(a.sentAt) : ""}` : "queued"}</Badge>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        {a.status === "queued" && (
                          <Button size="sm" variant="secondary" onClick={() => markAlertSent(a.id)}>
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> Mark sent
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Delete this alert?")) removeAlert(a.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
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
        title="Compose an alert"
        description="Send a payment notice or defaulter message to a member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={compose} disabled={!member || !form.message.trim()}>
              Queue alert
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  form.title === t.title
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-brand-200 bg-white text-brand-800 hover:bg-brand-50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Recipient *" className="sm:col-span-2">
              <select className={inputCls} value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                <option value="">— Select member —</option>
                {db.members
                  .filter((m) => m.status === "active")
                  .sort((a, b) => a.lastName.localeCompare(b.lastName))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} · {m.phone}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Kind">
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AlertKind })}>
                <option value="payment">Payment alert</option>
                <option value="defaulter">Defaulter alert</option>
              </select>
            </Field>
            <Field label="Channel">
              <select className={inputCls} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as AlertChannel })}>
                {ALERT_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" className="sm:col-span-2">
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Message *" className="sm:col-span-2" hint={`${form.message.length} characters`}>
              <textarea
                className={`${inputCls} min-h-[110px]`}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Write the message the member will receive…"
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MemberDot({ memberId }: { memberId: string }) {
  const { db } = useStore();
  const m = db.members.find((x) => x.id === memberId);
  if (!m) return <Avatar first="?" last=" " size="sm" />;
  return <Avatar first={m.firstName} last={m.lastName} size="sm" />;
}
