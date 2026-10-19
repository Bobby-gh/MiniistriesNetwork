"use client";

// Parishes in the diocese network, with per-parish health stats.

import { useMemo, useState } from "react";
import { Building2, MapPin, Phone, Plus, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Parish } from "@/lib/types";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { parishSummaries } from "@/lib/selectors";
import { Badge, Button, Card, Field, Modal, PageHeader, ProgressBar, StatCard, inputCls } from "@/components/ui";

export default function ParishesPage() {
  const { db, addParish } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    priest: "",
    phone: "",
    founded: todayISO(),
  });

  const summaries = parishSummaries(db);
  const byId = useMemo(() => new Map(summaries.map((s) => [s.parishId, s])), [summaries]);
  const symbol = db.settings.currencySymbol;

  const totalActive = summaries.reduce((s, x) => s + x.active, 0);
  const totalDues = summaries.reduce((s, x) => s + x.duesThisMonth, 0);

  function submit() {
    if (!form.name.trim()) return;
    addParish({ ...form, name: form.name.trim() } as Omit<Parish, "id">);
    setForm({ name: "", location: "", priest: "", phone: "", founded: todayISO() });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Parishes"
        subtitle={`${db.parishes.length} parishes in the network · ${totalActive} active members`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add parish
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Parishes" value={String(db.parishes.length)} sub="Diocese-wide network" icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Active members" value={String(totalActive)} sub={`${db.members.length} on register`} icon={<UserRound className="h-5 w-5" />} />
        <StatCard label="Dues this month" value={formatMoney(totalDues, symbol)} sub="Across all parishes" icon={<Plus className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label="Parish defaulters"
          value={String(summaries.reduce((s, x) => s + x.defaulters, 0))}
          sub="Unpaid dues this month"
          icon={<Phone className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.parishes.map((p) => {
          const s = byId.get(p.id);
          const compliance = s && s.active > 0 ? Math.round(((s.active - s.defaulters) / s.active) * 100) : 0;
          return (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white ring-2 ring-brand-100">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-ink">{p.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-brand-800/60">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {p.location}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-800/60">Priest in charge</dt>
                  <dd className="truncate font-semibold text-ink">{p.priest}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-800/60">Phone</dt>
                  <dd className="font-semibold text-ink">{p.phone}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-800/60">Founded</dt>
                  <dd className="font-semibold text-ink">{formatDate(p.founded)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-800/60">Members</dt>
                  <dd className="font-semibold text-ink">
                    {s?.active ?? 0} active / {s?.members ?? 0} total
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-800/60">Dues this month</dt>
                  <dd className="font-semibold text-ink">{formatMoney(s?.duesThisMonth ?? 0, symbol)}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-brand-800/60">Dues compliance</span>
                  <Badge tone={compliance >= 80 ? "success" : compliance >= 50 ? "warn" : "danger"}>{compliance}%</Badge>
                </div>
                <ProgressBar value={compliance} max={100} tone={compliance >= 80 ? "emerald" : compliance >= 50 ? "brand" : "amber"} />
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a parish"
        description="Register a new church into the diocese network"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Add parish</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Parish name *" className="sm:col-span-2">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. St. Peter's Church" />
          </Field>
          <Field label="Location">
            <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Area / district" />
          </Field>
          <Field label="Priest in charge">
            <input className={inputCls} value={form.priest} onChange={(e) => setForm({ ...form, priest: e.target.value })} placeholder="Rev. …" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+233 …" />
          </Field>
          <Field label="Founded">
            <input type="date" className={inputCls} value={form.founded} onChange={(e) => setForm({ ...form, founded: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
