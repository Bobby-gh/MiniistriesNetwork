"use client";

// Route guard: signed-out visitors are sent to /login; the login route itself
// renders bare (no sidebar). Everything else sits inside the app shell.

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AppShell } from "./shell";

function PleaseWait({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-700" />
        <p className="text-sm text-brand-700">{label}</p>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onLoginRoute = pathname === "/login";

  useEffect(() => {
    if (!ready) return;
    if (!session && !onLoginRoute) router.replace("/login");
    if (session && onLoginRoute) router.replace("/");
  }, [ready, session, onLoginRoute, router]);

  // Login route: show the form only once we know there is no session.
  if (onLoginRoute) {
    return ready ? session ? <PleaseWait label="Signing you in…" /> : children : <PleaseWait label="Checking your session…" />;
  }

  // Protected routes.
  if (!ready || !session) return <PleaseWait label={ready ? "Redirecting to sign in…" : "Checking your session…"} />;

  return <AppShell>{children}</AppShell>;
}
