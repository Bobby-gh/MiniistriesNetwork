"use client";

// Attendance: mark members present per service, track rates, review history.

import { useMemo, useState } from "react";
import { CalendarCheck, CheckCheck, History, Save, Users, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { SERVICE_TYPES, type ServiceType } from "@/lib/types";
import { formatDate, lastNSundays, todayISO } from "@/lib/format";
import { attendanceOn, attendanceRate, recentServiceDates } from "@/lib/selectors";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatCard,
  inputCls,
  rowCls,
  tdCls,
  thCls,
} from "@/components/ui";

export default function AttendancePage() {
  const { db, saveAttendance } = useStore();
  const [date, setDate] = useState(lastNSundays(1)[0] ?? todayISO());
  const [service, setService] = useState<ServiceType>("Sunday Worship");
  const [search, setSearch] = useState("");
  const [present, setPresent] = useState<Set<string>>(() => attendanceOn(db, date, service));
  const [flash, setFlash] = useState("");

  // Reload the sheet when the session changes (or attendance is updated elsewhere):
  // derive during render instead of an effect (react.dev «You Might Not Need an Effect»).
  const sheetKey = `${date}|${service}|${db.attendance.length}`;
  const [lastSheetKey, setLastSheetKey] = useState(sheetKey);
  if (sheetKey !== lastSheetKey) {
    setLastSheetKey(sheetKey);
    setPresent(attendanceOn(db, date, service));
  }

  const activeMembers = useMemo(
    () =>
      db.members
        .filter((m) => m.status === "active")
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [db.members],
  );

  const q = search.trim().toLowerCase();
  const rows = activeMembers.filter(
    (m) =>
      !q ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.membershipNo.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q),
  );

  const rate = activeMembers.length ? Math.round((present.size / activeMembers.length) * 100) : 0;
  const history = recentServiceDates(db, 10);

  function toggle(id: string) {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    saveAttendance(date, service, present);
    setFlash(`${present.size} member(s) marked present for ${service} on ${formatDate(date)}.`);
    window.setTimeout(() => setFlash(""), 5000);
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Mark the roll for each service and track member faithfulness"
        actions={
          <>
            <Button variant="secondary" onClick={() => setPresent(new Set(activeMembers.map((m) => m.id)))}>
              <CheckCheck className="h-4 w-4" /> Mark all present
            </Button>
            <Button variant="secondary" onClick={() => setPresent(new Set())}>
              <X className="h-4 w-4" /> Clear
            </Button>
            <Button onClick={save}>
              <Save className="h-4 w-4" /> Save attendance
            </Button>
          </>
        }
      />

      {flash && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {flash}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="On register (active)" value={String(activeMembers.length)} sub="Expected at service" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Present" value={String(present.size)} sub={formatDate(date)} icon={<CalendarCheck className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Turnout" value={`${rate}%`} sub={service} icon={<CheckCheck className="h-5 w-5" />} tone={rate >= 60 ? "emerald" : "amber"} />
        <StatCard label="Services recorded" value={String(history.length)} sub="Recent sessions below" icon={<History className="h-5 w-5" />} tone="indigo" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card padded={false}>
          <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
            <Field label="Service date" className="w-44">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Service" className="w-48">
              <select className={inputCls} value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
                {SERVICE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <SearchInput value={search} onChange={setSearch} placeholder="Search member…" className="w-full sm:w-56" />
            <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">
              {present.size}/{activeMembers.length} present
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Users className="h-6 w-6" />} title="No members match the search" hint="Clear the search box to see the full register." />
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead className="sticky top-0 bg-brand-50/95">
                  <tr>
                    <th className={thCls}>Member</th>
                    <th className={thCls}>Role</th>
                    <th className={thCls}>Attendance (last 12)</th>
                    <th className={`${thCls} text-right`}>Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const isPresent = present.has(m.id);
                    const pct = attendanceRate(db, m.id);
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
                        <td className={tdCls}>{m.role}</td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-2">
                            <div className="w-28">
                              <ProgressBar
                                value={pct ?? 0}
                                max={100}
                                tone={(pct ?? 0) >= 70 ? "emerald" : (pct ?? 0) >= 40 ? "brand" : "amber"}
                              />
                            </div>
                            <span className="text-xs font-bold text-brand-800/70">{pct ?? "—"}%</span>
                          </div>
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <button
                            onClick={() => toggle(m.id)}
                            className={
                              isPresent
                                ? "inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                                : "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 hover:border-neutral-300 hover:text-ink"
                            }
                          >
                            {isPresent ? "Present ✓" : "Absent"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="h-fit">
          <CardTitle title="Recent services" hint="Click a session to load it" />
          {history.length === 0 ? (
            <p className="text-xs text-brand-800/60">No attendance recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => {
                const active = h.date === date && h.service === service;
                return (
                  <li key={`${h.date}-${h.service}`}>
                    <button
                      onClick={() => {
                        setDate(h.date);
                        setService(h.service as ServiceType);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        active ? "border-brand-300 bg-brand-50" : "border-brand-100 hover:bg-brand-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">{h.service}</span>
                        <Badge tone={active ? "solid" : "neutral"}>{h.count} present</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-brand-800/60">{formatDate(h.date)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
