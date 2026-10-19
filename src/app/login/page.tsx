"use client";

// Sign-in page — church imagery leads the layout instead of a blue text panel.
// Credentials validate locally for now; real authentication
// plugs into signIn() in src/lib/auth.tsx later.

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Button, Field, inputCls } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { db } = useStore();
  const [email, setEmail] = useState("admin@diocese.org");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setError("");
    setBusy(true);
    // Placeholder for the real authentication call — swap this for your
    // provider (NextAuth, Clerk, custom /api/login) when authentication lands.
    window.setTimeout(() => {
      signIn(email.trim());
      router.replace("/");
    }, 450);
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1fr_1.05fr]">
      {/* Full-height church image panel */}
      <aside className="relative hidden min-h-screen overflow-hidden bg-neutral-950 lg:block">
        <Image
          src="/church-login.jpg"
          alt="Congregation gathered for worship in a contemporary church"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src="/ministries_logo.jpeg"
              alt="Ministries logo"
              width={640}
              height={640}
              priority
              className="h-14 w-14 rounded-2xl border border-neutral-200 bg-white object-cover"
            />
            <div>
              <p className="text-base font-semibold tracking-tight text-ink">Diocese Network</p>
              <p className="text-xs text-neutral-500">{db.settings.dioceseName}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Access the register, attendance and finance pages.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email address">
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  autoComplete="email"
                  className={`${inputCls} pl-9`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@diocese.org"
                  required
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${inputCls} pr-10 pl-9`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-ink">Demo mode</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Authentication is not wired up yet — any valid email and a 4+ character
              password will sign you in. Try <span className="font-semibold text-[#344054]">admin@diocese.org</span> /{" "}
              <span className="font-semibold text-[#344054]">demo1234</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
