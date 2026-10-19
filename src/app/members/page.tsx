"use client";

// Member register: registration, directory and per-member profiles.

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  FileSpreadsheet,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
  UserX,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Member, PaymentType } from "@/lib/types";
import { currentMonthKey, downloadCSV, formatDate, formatMoney, fullName, todayISO } from "@/lib/format";
import { attendanceRate, defaulters, duesForMonth, paymentsFor } from "@/lib/selectors";
import { MemberForm } from "@/components/member-form";
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

type ModalState = { mode: "profile" | "register" | "edit"; member?: Member } | null;

const TYPE_LABEL: Record<PaymentType, string> = {
  dues: "Dues",
  donation: "Donation",
  funeral: "Funeral levy",
  building: "Building fund",
  other: "Other",
};

export default function MembersPage() {
  const { db, removeMember } = useStore();
  const [search, setSearch] = useState("");
  const [parishFilter, setParishFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [payFor, setPayFor] = useState<Member | null>(null);

  const month = currentMonthKey();
  const statuses = duesForMonth(db, month);
  const defaulterIds = new Set(defaulters(db).map((d) => d.member.id));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.members
      .filter((m) => {
        if (parishFilter !== "all" && m.parishId !== parishFilter) return false;
        if (statusFilter !== "all" && m.status !== statusFilter) return false;
        if (!q) return true;
        return (
          fullName(m).toLowerCase().includes(q) ||
          m.membershipNo.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [db.members, search, parishFilter, statusFilter]);

  const activeCount = db.members.filter((m) => m.status === "active").length;
  const newThisYear = db.members.filter((m) => m.joinDate.slice(0, 4) === String(new Date().getFullYear())).length;
  const profile = modal?.mode === "profile" ? modal.member : undefined;
  const editing = modal?.mode === "edit" ? modal.member : undefined;

  function exportCSV() {
    downloadCSV(
      `member-register-${todayISO()}`,
      ["Membership No.", "Name", "Gender", "Phone", "Email", "Parish", "Role", "Status", "Joined", "Address"],
      rows.map((m) => [
        m.membershipNo,
        fullName(m),
        m.gender,
        m.phone,
        m.email,
        db.parishes.find((p) => p.id === m.parishId)?.name ?? "",
        m.role,
        m.status,
        m.joinDate,
        m.address,
      ]),
    );
  }

  return (
    <div>
      <PageHeader
        title="Member Register"
        subtitle={`${db.members.length} registered members across ${db.parishes.length} parishes`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => setModal({ mode: "register" })}>
              <UserPlus className="h-4 w-4" /> Register member
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={String(db.members.length)}
          sub={`${activeCount} active`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Dues defaulters"
          value={String(defaulterIds.size)}
          sub={`Owing ≥ ${db.settings.defaulterThresholdMonths} months`}
          icon={<UserX className="h-5 w-5" />}
          tone={defaulterIds.size ? "rose" : "emerald"}
        />
        <StatCard
          label="New this year"
          value={String(newThisYear)}
          sub={`${db.parishes.length} parishes in network`}
          icon={<Plus className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Paid dues — this month"
          value={String([...statuses.values()].filter((s) => s.paid).length)}
          sub={`of ${statuses.size} active members`}
          icon={<Wallet className="h-5 w-5" />}
          tone="indigo"
        />
      </div>

      <Card className="mt-4" padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, membership no. or phone…"
            className="w-full sm:w-72"
          />
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
          <Field label="Status" className="w-36">
            <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="transferred">Transferred</option>
            </select>
          </Field>
          <p className="ml-auto pb-2 text-xs font-semibold text-brand-800/60">{rows.length} member(s)</p>
        </div>

        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No members match your search"
              hint="Adjust the filters, or register a new member into the diocesan register."
              action={
                <Button onClick={() => setModal({ mode: "register" })}>
                  <UserPlus className="h-4 w-4" /> Register member
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead className="bg-brand-50/60">
                <tr>
                  <th className={thCls}>Member</th>
                  <th className={thCls}>Membership no.</th>
                  <th className={thCls}>Parish</th>
                  <th className={thCls}>Role</th>
                  <th className={thCls}>Phone</th>
                  <th className={thCls}>Dues ({month})</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const dues = statuses.get(m.id);
                  const parish = db.parishes.find((p) => p.id === m.parishId);
                  return (
                    <tr key={m.id} className={rowCls}>
                      <td className={tdCls}>
                        <button
                          onClick={() => setModal({ mode: "profile", member: m })}
                          className="flex items-center gap-3 text-left"
                        >
                          <Avatar first={m.firstName} last={m.lastName} />
                          <span>
                            <span className="block font-bold text-ink hover:text-brand-700">{fullName(m)}</span>
                            <span className="block text-xs text-brand-800/55">{m.occupation || "—"}</span>
                          </span>
                        </button>
                      </td>
                      <td className={`${tdCls} font-mono text-xs`}>{m.membershipNo}</td>
                      <td className={tdCls}>
                        <span className="block max-w-[180px] truncate">{parish?.name ?? "—"}</span>
                      </td>
                      <td className={tdCls}>{m.role}</td>
                      <td className={`${tdCls} whitespace-nowrap text-xs`}>{m.phone}</td>
                      <td className={tdCls}>
                        {m.status !== "active" ? (
                          <Badge tone="neutral">n/a</Badge>
                        ) : dues?.paid ? (
                          <Badge tone="success">Paid</Badge>
                        ) : defaulterIds.has(m.id) ? (
                          <Badge tone="danger">Arrears</Badge>
                        ) : (
                          <Badge tone="warn">Unpaid</Badge>
                        )}
                      </td>
                      <td className={tdCls}>
                        <Badge tone={m.status === "active" ? "success" : m.status === "inactive" ? "warn" : "info"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View profile" onClick={() => setModal({ mode: "profile", member: m })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit member" onClick={() => setModal({ mode: "edit", member: m })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Remove member"
                            onClick={() => {
                              if (window.confirm(`Remove ${fullName(m)} from the register?`)) removeMember(m.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
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

      {/* Member profile */}
      <Modal
        open={modal?.mode === "profile"}
        onClose={() => setModal(null)}
        title={profile ? fullName(profile) : ""}
        description={profile ? `${profile.membershipNo} · ${profile.role}` : ""}
        wide
        footer={
          profile && (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Remove ${fullName(profile)} from the register?`)) {
                    removeMember(profile.id);
                    setModal(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
              <Button variant="secondary" onClick={() => setPayFor(profile)}>
                <Wallet className="h-4 w-4" /> Record payment
              </Button>
              <Button onClick={() => setModal({ mode: "edit", member: profile })}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </>
          )
        }
      >
        {profile && <MemberProfile member={profile} />}
      </Modal>

      {/* Register / edit */}
      <Modal
        open={modal?.mode === "register" || modal?.mode === "edit"}
        onClose={() => setModal(null)}
        title={editing ? `Edit ${fullName(editing)}` : "Register new member"}
        description="Capture the member into the diocesan register"
        wide
      >
        <MemberForm
          key={`${modal?.mode}-${editing?.id ?? "new"}`}
          existing={editing}
          onDone={() => setModal(null)}
        />
      </Modal>

      {/* Quick payment from profile */}
      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title={payFor ? `Record payment — ${fullName(payFor)}` : ""}
        description="Dues, donations, levies or project contributions"
      >
        {payFor && (
          <PaymentForm
            key={payFor.id}
            type="dues"
            preset={{ memberId: payFor.id }}
            onDone={(p) => {
              if (p) setModal({ mode: "profile", member: payFor });
              setPayFor(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function MemberProfile({ member }: { member: Member }) {
  const { db } = useStore();
  const month = currentMonthKey();
  const dues = duesForMonth(db, month).get(member.id);
  const rate = attendanceRate(db, member.id);
  const payments = paymentsFor(db, member.id);
  const byType = (t: PaymentType) => payments.filter((p) => p.type === t).reduce((s, p) => s + p.amount, 0);
  const symbol = db.settings.currencySymbol;
  const parish = db.parishes.find((p) => p.id === member.parishId);
  const isDefaulter = defaulters(db).some((d) => d.member.id === member.id);

  const info: [string, string][] = [
    ["Phone", member.phone],
    ["Email", member.email || "—"],
    ["Gender", member.gender],
    ["Date of birth", formatDate(member.dob)],
    ["Date joined", formatDate(member.joinDate)],
    ["Occupation", member.occupation || "—"],
    ["Parish", parish?.name ?? "—"],
    ["Address", member.address || "—"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar first={member.firstName} last={member.lastName} size="lg" />
        <div className="flex flex-wrap gap-2">
          <Badge tone={member.status === "active" ? "success" : member.status === "inactive" ? "warn" : "info"}>
            {member.status}
          </Badge>
          {dues?.paid ? <Badge tone="success">Dues paid — {month}</Badge> : <Badge tone="warn">Dues unpaid — {month}</Badge>}
          {isDefaulter && <Badge tone="danger">Dues defaulter</Badge>}
          <Badge tone="info">Attendance {rate ?? "—"}%</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {info.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-brand-50/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700/60">{label}</p>
            <p className="mt-0.5 text-sm font-semibold break-words text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand-700/70">Lifetime giving</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["dues", "donation", "funeral", "building", "other"] as PaymentType[]).map((t) => (
            <div key={t} className="rounded-lg border border-brand-100 px-3 py-2 text-center">
              <p className="text-[10px] font-semibold text-brand-800/60">{TYPE_LABEL[t]}</p>
              <p className="mt-0.5 text-sm font-extrabold text-ink">{formatMoney(byType(t), symbol)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700/70">
          <CalendarDays className="h-3.5 w-3.5" /> Recent payments
        </p>
        {payments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-200 px-3 py-4 text-center text-xs text-brand-800/60">
            No payments recorded yet.
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-brand-100">
            <table className="w-full border-collapse">
              <tbody>
                {payments.slice(0, 12).map((p) => (
                  <tr key={p.id} className="border-b border-brand-50 last:border-0">
                    <td className="px-3 py-2 text-xs text-brand-800/70">{p.date}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-ink">{TYPE_LABEL[p.type]}</td>
                    <td className="px-3 py-2 text-xs text-brand-800/60">{p.category}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-ink">{formatMoney(p.amount, symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {member.notes && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Phone className="mr-1 inline h-3.5 w-3.5" />
          {member.notes}
        </p>
      )}
    </div>
  );
}
