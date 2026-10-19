"use client";

// Authentication session store.
//
// Today this is a UI-level stub: any credentials sign you in and the session is
// kept in localStorage. To wire real authentication later, replace the body of
// `signIn` with your provider call (e.g. POST /api/login, NextAuth, Clerk…)
// and, if sessions become server-issued, swap the snapshot for a fetch/use hook.
// Nothing else in the app needs to change — every page reads `useAuth()`.

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

const SESSION_KEY = "diocese-network-session-v1";

export interface Session {
  email: string;
  name: string;
  role: string;
  since: string;
}

interface AuthState {
  ready: boolean;
  session: Session | null;
}

/* ------------------------------ external store ----------------------------- */

let state: AuthState = { ready: false, session: null };
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthState {
  return state;
}

function getServerSnapshot(): AuthState {
  return { ready: false, session: null };
}

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (parsed && typeof parsed.email === "string" && parsed.email.includes("@")) {
      return {
        email: parsed.email,
        name: parsed.name ?? nameFromEmail(parsed.email),
        role: parsed.role ?? "Diocesan Admin",
        since: parsed.since ?? new Date().toISOString().slice(0, 10),
      };
    }
  } catch {
    /* corrupt payload — treat as signed out */
  }
  return null;
}

function persist(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — session stays in memory */
  }
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Admin";
  return local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* ---------------------------------- API ------------------------------------ */

interface AuthValue extends AuthState {
  signIn(email: string): Session;
  signOut(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!state.ready) {
      setState({ ready: true, session: readStoredSession() });
    }
    // Keep tabs in sync (e.g. sign out in one tab signs out the others).
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setState({ ready: true, session: readStoredSession() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signIn = useCallback((email: string) => {
    const session: Session = {
      email,
      name: nameFromEmail(email),
      role: "Diocesan Admin",
      since: new Date().toISOString().slice(0, 10),
    };
    persist(session);
    setState({ ready: true, session });
    return session;
  }, []);

  const signOut = useCallback(() => {
    persist(null);
    setState({ ready: true, session: null });
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ ready: snapshot.ready, session: snapshot.session, signIn, signOut }),
    [snapshot.ready, snapshot.session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
