"use client";

// Global client-side database: seeded on first run, persisted to localStorage.
// Modelled as a tiny external store so SSR/CSR hydration stays consistent.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  Alert,
  AlertChannel,
  AlertKind,
  AttendanceRecord,
  DB,
  Member,
  Parish,
  Payment,
  Settings,
  Transfer,
} from "./types";
import { buildSeedDB, DEFAULT_SETTINGS } from "./seed";
import { uid } from "./format";

const STORAGE_KEY = "diocese-network-db-v1";

/* ------------------------------ external store ----------------------------- */

let dbSnapshot: DB | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): DB | null {
  return dbSnapshot;
}

function getServerSnapshot(): DB | null {
  return null;
}

function commit(next: DB) {
  dbSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — keep working in memory */
  }
  listeners.forEach((l) => l());
}

function readStoredDB(): DB | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DB>;
    if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.parishes)) {
      return {
        parishes: parsed.parishes,
        members: parsed.members,
        attendance: parsed.attendance ?? [],
        payments: parsed.payments ?? [],
        transfers: parsed.transfers ?? [],
        alerts: parsed.alerts ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      };
    }
  } catch {
    /* corrupt payload — fall back to seed */
  }
  return null;
}

/* ---------------------------------- API ------------------------------------ */

export type MemberInput = Omit<Member, "id" | "membershipNo"> & { membershipNo?: string };
export type PaymentInput = Omit<Payment, "id" | "createdBy">;
export type TransferInput = Omit<Transfer, "id" | "status"> & { status?: Transfer["status"] };
export type AlertInput = Omit<Alert, "id" | "date" | "status"> & { date?: string };

interface StoreValue {
  db: DB;
  addMember(input: MemberInput): Member;
  updateMember(id: string, patch: Partial<Member>): void;
  removeMember(id: string): void;
  addParish(input: Omit<Parish, "id">): Parish;
  updateParish(id: string, patch: Partial<Parish>): void;
  saveAttendance(date: string, service: string, presentMemberIds: Set<string>): void;
  addPayment(input: PaymentInput): Payment;
  removePayment(id: string): void;
  addTransfer(input: TransferInput): Transfer;
  setTransferStatus(id: string, status: Transfer["status"]): void;
  removeTransfer(id: string): void;
  addAlerts(inputs: AlertInput[]): Alert[];
  markAlertSent(id: string): void;
  removeAlert(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  resetDemoData(): void;
}

const StoreContext = createContext<StoreValue | null>(null);

function nextMembershipNo(db: DB): string {
  const nums = db.members
    .map((m) => Number(m.membershipNo.replace(/\D/g, "")))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `DN-${String(next).padStart(4, "0")}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const db = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Hydrate from localStorage (or seed) once the client takes over.
  useEffect(() => {
    if (!hydrated) {
      hydrated = true;
      commit(readStoredDB() ?? buildSeedDB());
    }
    // Keep tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) commit(readStoredDB() ?? buildSeedDB());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: DB) => DB) => {
    if (!dbSnapshot) return;
    commit(fn(dbSnapshot));
  }, []);

  const api = useMemo<StoreValue | null>(() => {
    if (!db) return null;
    const current = db;

    return {
      db: current,
      addMember(input) {
        const member: Member = {
          ...input,
          id: uid("mem"),
          membershipNo: input.membershipNo?.trim() || nextMembershipNo(current),
        };
        update((prev) => ({ ...prev, members: [...prev.members, member] }));
        return member;
      },
      updateMember(id, patch) {
        update((prev) => ({
          ...prev,
          members: prev.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },
      removeMember(id) {
        update((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.id !== id),
          attendance: prev.attendance.filter((a) => a.memberId !== id),
        }));
      },
      addParish(input) {
        const parish: Parish = { ...input, id: uid("par") };
        update((prev) => ({ ...prev, parishes: [...prev.parishes, parish] }));
        return parish;
      },
      updateParish(id, patch) {
        update((prev) => ({
          ...prev,
          parishes: prev.parishes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },
      saveAttendance(date, service, presentMemberIds) {
        update((prev) => {
          const others = prev.attendance.filter((a) => !(a.serviceDate === date && a.service === service));
          const records: AttendanceRecord[] = [...presentMemberIds].map((memberId) => ({
            id: uid("att"),
            memberId,
            serviceDate: date,
            service: service as AttendanceRecord["service"],
          }));
          return { ...prev, attendance: [...others, ...records] };
        });
      },
      addPayment(input) {
        const payment: Payment = { ...input, id: uid("pay"), createdBy: current.settings.alertSender };
        update((prev) => ({ ...prev, payments: [payment, ...prev.payments] }));
        return payment;
      },
      removePayment(id) {
        update((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }));
      },
      addTransfer(input) {
        const transfer: Transfer = { ...input, id: uid("trf"), status: input.status ?? "pending" };
        update((prev) => ({ ...prev, transfers: [transfer, ...prev.transfers] }));
        return transfer;
      },
      setTransferStatus(id, status) {
        update((prev) => ({
          ...prev,
          transfers: prev.transfers.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
      },
      removeTransfer(id) {
        update((prev) => ({ ...prev, transfers: prev.transfers.filter((t) => t.id !== id) }));
      },
      addAlerts(inputs) {
        const today = new Date().toISOString().slice(0, 10);
        const created: Alert[] = inputs.map((i) => ({
          ...i,
          id: uid("alr"),
          date: i.date ?? today,
          status: "queued",
        }));
        update((prev) => ({ ...prev, alerts: [...created, ...prev.alerts] }));
        return created;
      },
      markAlertSent(id) {
        const today = new Date().toISOString().slice(0, 10);
        update((prev) => ({
          ...prev,
          alerts: prev.alerts.map((a) => (a.id === id ? { ...a, status: "sent", sentAt: today } : a)),
        }));
      },
      removeAlert(id) {
        update((prev) => ({ ...prev, alerts: prev.alerts.filter((a) => a.id !== id) }));
      },
      updateSettings(patch) {
        update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
      },
      resetDemoData() {
        commit(buildSeedDB());
      },
    };
  }, [db, update]);

  if (!api) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-700" />
          <p className="text-sm text-brand-700">Preparing the diocesan register…</p>
        </div>
      </div>
    );
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function useMoney(): (amount: number) => string {
  const { db } = useStore();
  return useCallback(
    (amount: number) =>
      `${db.settings.currencySymbol}${(amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`,
    [db.settings.currencySymbol],
  );
}

export type { AlertKind, AlertChannel };
