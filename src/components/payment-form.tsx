"use client";

// Reusable payment entry form — dues, donations, funeral levy, building fund, other.

import { useMemo, useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import type { PaymentInput } from "@/lib/store";
import {
  DONATION_FUNDS,
  OTHER_PAYMENT_CATEGORIES,
  PAYMENT_METHODS,
  type Payment,
  type PaymentMethod,
  type PaymentType,
  type Settings,
} from "@/lib/types";
import { currentMonthKey, formatMoney, monthLabel, todayISO } from "@/lib/format";
import { Button, Field, inputCls } from "./ui";

const TYPE_WORDS: Record<PaymentType, string> = {
  dues: "Dues",
  donation: "Donation",
  funeral: "Funeral levy",
  building: "Building fund",
  other: "Payment",
};

const REF_PREFIX: Record<PaymentType, string> = {
  dues: "DUE",
  donation: "DON",
  funeral: "FNL",
  building: "BLD",
  other: "OTH",
};

export function autoRef(type: PaymentType): string {
  return `${REF_PREFIX[type]}-${Math.floor(100000 + Math.random() * 899999)}`;
}

export function defaultCategory(type: PaymentType, s: Settings): string {
  if (type === "dues") return "Monthly Dues";
  if (type === "donation") return "General Fund";
  if (type === "building") return s.buildingFundName;
  if (type === "other") return "Event Fee";
  return "";
}

function alertMessage(
  type: PaymentType,
  first: string,
  amount: string,
  category: string,
  period: string,
  ref: string,
  sender: string,
): string {
  switch (type) {
    case "dues":
      return `Dear ${first}, your ${monthLabel(period)} dues of ${amount} have been received (ref ${ref}). Thank you for keeping your account regular. — ${sender}`;
    case "donation":
      return `Dear ${first}, thank you for your generous donation of ${amount} to the ${category}. Ref ${ref}. God bless you. — ${sender}`;
    case "funeral":
      return `Dear ${first}, your funeral levy contribution of ${amount} in respect of "${category}" has been received (ref ${ref}). — ${sender}`;
    case "building":
      return `Dear ${first}, your contribution of ${amount} toward ${category} has been received (ref ${ref}). Thank you for building with us. — ${sender}`;
    default:
      return `Dear ${first}, your payment of ${amount} for ${category} has been received (ref ${ref}). — ${sender}`;
  }
}

export function PaymentForm({
  type,
  preset,
  onDone,
}: {
  type: PaymentType;
  preset?: Partial<PaymentInput>;
  onDone: (payment: Payment | null) => void;
}) {
  const { db, addPayment, addAlerts } = useStore();
  const s = db.settings;
  const defaultAmount = type === "dues" ? s.duesMonthlyAmount : type === "funeral" ? s.funeralLevyAmount : "";

  const members = useMemo(
    () =>
      [...db.members]
        .filter((m) => m.status === "active")
        .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [db.members],
  );

  const [memberId, setMemberId] = useState(preset?.memberId ?? "");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [date, setDate] = useState(preset?.date ?? todayISO());
  const [method, setMethod] = useState<PaymentMethod>(preset?.method ?? "Mobile Money");
  const [reference, setReference] = useState(preset?.reference ?? autoRef(type));
  const [category, setCategory] = useState(preset?.category ?? defaultCategory(type, s));
  const [period, setPeriod] = useState(preset?.period ?? currentMonthKey());
  const [note, setNote] = useState(preset?.note ?? "");
  const [alertOn, setAlertOn] = useState(true);
  const [error, setError] = useState("");

  const member = db.members.find((m) => m.id === memberId);
  const anonymousAllowed = type === "donation";

  function submit(e: FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!memberId && !anonymousAllowed) {
      setError(`Select the member this ${TYPE_WORDS[type].toLowerCase()} belongs to.`);
      return;
    }
    if (type === "funeral" && !category.trim()) {
      setError("State who the levy is in respect of (e.g. the bereaved family).");
      return;
    }
    const input: PaymentInput = {
      memberId,
      type,
      amount: amt,
      date,
      method,
      reference: reference.trim() || autoRef(type),
      category: category.trim(),
      note: note.trim(),
      ...(type === "dues" ? { period } : {}),
    };
    const payment = addPayment(input);
    if (alertOn && member) {
      addAlerts([
        {
          kind: "payment",
          memberId: member.id,
          title: `${TYPE_WORDS[type]} payment received`,
          message: alertMessage(
            type,
            member.firstName,
            formatMoney(amt, s.currencySymbol),
            category.trim() || TYPE_WORDS[type],
            period,
            input.reference,
            s.alertSender,
          ),
          channel: "SMS",
        },
      ]);
    }
    onDone(payment);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={anonymousAllowed ? "Member (optional for basket offerings)" : "Member *"} className="sm:col-span-2">
          <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {anonymousAllowed && <option value="">Anonymous donor</option>}
            {!anonymousAllowed && <option value="">— Select member —</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} · {m.membershipNo}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Amount (${s.currency}) *`}>
          <input
            type="number"
            min="0"
            step="any"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Date received">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Payment method">
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference / receipt no.">
          <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>

        {type === "dues" && (
          <Field label="Dues period" hint="The month this payment settles">
            <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
        )}

        {type === "donation" && (
          <Field label="Fund / cause">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {DONATION_FUNDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        )}

        {type === "funeral" && (
          <Field label="In respect of *" hint="Bereaved member, family or event">
            <input
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Late Madam Akosua Frimpong"
              required
            />
          </Field>
        )}

        {type === "building" && (
          <Field label="Project / campaign">
            <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
        )}

        {type === "other" && (
          <Field label="Category">
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {OTHER_PAYMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Note" className="sm:col-span-2">
          <input
            className={inputCls}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional remark"
          />
        </Field>
      </div>

      <label className="flex items-start gap-2.5 rounded-lg bg-brand-50 p-3 ring-1 ring-brand-100">
        <input
          type="checkbox"
          checked={alertOn}
          onChange={(e) => setAlertOn(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500"
        />
        <span className="text-xs">
          <span className="font-bold text-ink">Send payment alert</span>
          <span className="block text-brand-800/65">
            {member
              ? `SMS notification to ${member.firstName} on ${member.phone}.`
              : "Select a member to enable alerts."}
          </span>
        </span>
      </label>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-brand-100 pt-4">
        <Button variant="secondary" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <Button type="submit">Record {TYPE_WORDS[type].toLowerCase()}</Button>
      </div>
    </form>
  );
}
