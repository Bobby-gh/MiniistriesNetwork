"use client";

// Settings: diocese profile, finance configuration, compliance rules, data tools.

import { useState, type FormEvent } from "react";
import { AlertTriangle, Coins, Save, ShieldAlert, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Settings } from "@/lib/types";
import { Button, Card, CardTitle, Field, PageHeader, StatCard, inputCls } from "@/components/ui";

const CURRENCY_PRESETS = ["GHS", "KES", "NGN", "UGX", "TZS", "ZAR", "USD", "EUR", "GBP"];

export default function SettingsPage() {
  const { db, updateSettings, resetDemoData } = useStore();
  const [form, setForm] = useState<Settings>(db.settings);
  const [saved, setSaved] = useState(false);

  // Follow external changes to settings (e.g. "Reset demo data") during render.
  const [lastSettings, setLastSettings] = useState(db.settings);
  if (db.settings !== lastSettings) {
    setLastSettings(db.settings);
    setForm(db.settings);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    updateSettings({
      ...form,
      duesMonthlyAmount: Math.max(0, Number(form.duesMonthlyAmount) || 0),
      funeralLevyAmount: Math.max(0, Number(form.funeralLevyAmount) || 0),
      defaulterThresholdMonths: Math.max(1, Number(form.defaulterThresholdMonths) || 1),
      buildingFundTarget: Math.max(0, Number(form.buildingFundTarget) || 0),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => ({ ...f, [key]: value }));

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diocese-network-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Diocese profile, finance rules and compliance thresholds" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Members" value={String(db.members.length)} sub={`${db.parishes.length} parishes`} icon={<UserRound className="h-5 w-5" />} />
        <StatCard label="Payments on record" value={String(db.payments.length)} sub="All categories" icon={<Coins className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Attendance entries" value={String(db.attendance.length)} sub="All services" icon={<ShieldAlert className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Alerts" value={String(db.alerts.length)} sub={`${db.alerts.filter((a) => a.status === "queued").length} queued`} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" />
      </div>

      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle title="Diocese profile" hint="Shown across the app and on alerts" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Diocese name" className="sm:col-span-2">
              <input className={inputCls} value={form.dioceseName} onChange={(e) => set("dioceseName", e.target.value)} />
            </Field>
            <Field label="Tagline" className="sm:col-span-2">
              <input className={inputCls} value={form.dioceseSubtitle} onChange={(e) => set("dioceseSubtitle", e.target.value)} />
            </Field>
            <Field label="Alert sender name" className="sm:col-span-2" hint="Appended to SMS / WhatsApp messages">
              <input className={inputCls} value={form.alertSender} onChange={(e) => set("alertSender", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle title="Finance" hint="Currency, dues and levy amounts" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Currency code">
              <select className={inputCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCY_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency symbol">
              <input className={inputCls} value={form.currencySymbol} onChange={(e) => set("currencySymbol", e.target.value)} placeholder="GH₵" />
            </Field>
            <Field label="Monthly dues amount">
              <input type="number" min="0" className={inputCls} value={form.duesMonthlyAmount} onChange={(e) => set("duesMonthlyAmount", Number(e.target.value))} />
            </Field>
            <Field label="Funeral levy amount">
              <input type="number" min="0" className={inputCls} value={form.funeralLevyAmount} onChange={(e) => set("funeralLevyAmount", Number(e.target.value))} />
            </Field>
            <Field label="Building project name" className="sm:col-span-2">
              <input className={inputCls} value={form.buildingFundName} onChange={(e) => set("buildingFundName", e.target.value)} />
            </Field>
            <Field label="Building project target" className="sm:col-span-2">
              <input type="number" min="0" className={inputCls} value={form.buildingFundTarget} onChange={(e) => set("buildingFundTarget", Number(e.target.value))} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle title="Compliance" hint="When a member becomes a defaulter" />
          <Field label="Arrears threshold (consecutive unpaid months)" hint="Members owing up to this point are reminded; beyond it they are flagged as defaulters">
            <select
              className={inputCls}
              value={form.defaulterThresholdMonths}
              onChange={(e) => set("defaulterThresholdMonths", Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {n} month(s)
                </option>
              ))}
            </select>
          </Field>
        </Card>

        <Card>
          <CardTitle title="Data & backup" hint="Everything is stored in this browser" />
          <div className="flex flex-col gap-3">
            <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-800/75 ring-1 ring-brand-100">
              This deployment keeps the diocesan register in your browser&apos;s local storage so the app works instantly
              with realistic demo data. Use the buttons below to back it up or restore the demo dataset.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={downloadBackup}>
                Download backup (JSON)
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm("Reset all data back to the demo dataset? Current records will be lost."))
                    resetDemoData();
                }}
              >
                Reset demo data
              </Button>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-brand-800/70">{saved ? "Settings saved — applied across the app." : "Changes apply across every page once saved."}</p>
            <Button type="submit">
              <Save className="h-4 w-4" /> Save settings
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
