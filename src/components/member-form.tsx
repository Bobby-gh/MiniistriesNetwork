"use client";

// Member registration / edit form used by the Member Register page.

import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { MEMBER_ROLES, type Member, type MemberRole, type MemberStatus } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { Button, Field, inputCls } from "./ui";

export function MemberForm({
  existing,
  onDone,
}: {
  existing?: Member | null;
  onDone: () => void;
}) {
  const { db, addMember, updateMember } = useStore();
  const [form, setForm] = useState({
    firstName: existing?.firstName ?? "",
    lastName: existing?.lastName ?? "",
    gender: existing?.gender ?? "Male",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    address: existing?.address ?? "",
    parishId: existing?.parishId ?? db.parishes[0]?.id ?? "",
    role: (existing?.role ?? "Member") as MemberRole,
    joinDate: existing?.joinDate ?? todayISO(),
    dob: existing?.dob ?? "",
    occupation: existing?.occupation ?? "",
    status: (existing?.status ?? "active") as MemberStatus,
    notes: existing?.notes ?? "",
    membershipNo: existing?.membershipNo ?? "",
  });
  const [error, setError] = useState("");

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!form.phone.trim()) {
      setError("A phone number is required for payment & defaulter alerts.");
      return;
    }
    const payload = {
      ...form,
      gender: form.gender as Member["gender"],
      role: form.role,
      status: form.status,
      parishId: form.parishId,
    };
    if (existing) updateMember(existing.id, payload);
    else addMember(payload);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name *">
          <input
            className={inputCls}
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="e.g. Kwame"
            required
          />
        </Field>
        <Field label="Last name *">
          <input
            className={inputCls}
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="e.g. Asante"
            required
          />
        </Field>
        <Field label="Gender">
          <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option>Male</option>
            <option>Female</option>
          </select>
        </Field>
        <Field label="Phone * (for alerts)">
          <input
            className={inputCls}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+233 24 000 0000"
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@example.com"
          />
        </Field>
        <Field label="Occupation">
          <input
            className={inputCls}
            value={form.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            placeholder="e.g. Teacher"
          />
        </Field>
        <Field label="Parish">
          <select className={inputCls} value={form.parishId} onChange={(e) => set("parishId", e.target.value)}>
            {db.parishes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Role / group">
          <select className={inputCls} value={form.role} onChange={(e) => set("role", e.target.value)}>
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date joined">
          <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
        </Field>
        <Field label="Date of birth">
          <input type="date" className={inputCls} value={form.dob} onChange={(e) => set("dob", e.target.value)} />
        </Field>
        <Field label="Membership no." hint="Leave blank to auto-generate">
          <input
            className={inputCls}
            value={form.membershipNo}
            onChange={(e) => set("membershipNo", e.target.value)}
            placeholder="DN-0000"
            disabled={Boolean(existing)}
          />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
          </select>
        </Field>
        <Field label="Residential address" className="sm:col-span-2">
          <input
            className={inputCls}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House number, landmark, city"
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            className={`${inputCls} min-h-[70px]`}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Health needs, family info, ministry gifts…"
          />
        </Field>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-brand-100 pt-4">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{existing ? "Save changes" : "Register member"}</Button>
      </div>
    </form>
  );
}
