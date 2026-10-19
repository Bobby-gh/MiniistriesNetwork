"use client";

// Sign-in page. Credentials are validated locally for now — real authentication
// (NextAuth/Clerk/custom API) plugs into signIn() in src/lib/auth.tsx later.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Landmark, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { LogoMark } from "@/components/logo";
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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-ink p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 60%, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11" />
            <div>
              <p className="text-lg font-extrabold tracking-tight">Diocese Network</p>
              <p className="text-xs font-medium tracking-wide text-brand-200">
                {db.settings.dioceseSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight">
            {db.settings.dioceseName}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-100/90">
            One register for the whole network — members, attendance, dues, donations,
            levies, building funds, defaulters and alerts.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Landmark, text: `${db.parishes.length} parishes · ${db.members.length} members on the register` },
              { icon: ShieldCheck, text: "Dues compliance and defaulter tracking, diocese-wide" },
              { icon: LockKeyhole, text: "Your data stays in this browser until the server backend arrives" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-brand-100">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-300">
          © {new Date().getFullYear()} {db.settings.dioceseName}
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-brand-50/60 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-base font-extrabold text-ink">Diocese Network</p>
              <p className="text-xs text-brand-800/60">{db.settings.dioceseName}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-brand-800/65">
              Access the diocesan register, attendance and finance pages.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Email address">
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-400" />
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
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-400" />
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
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-brand-400 hover:text-brand-700"
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

            <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
              <p className="text-xs font-bold text-brand-900">Demo mode</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-800/70">
                Authentication is not wired up yet — any valid email and a 4+ character
                password will sign you in. Try <span className="font-semibold">admin@diocese.org</span> /{" "}
                <span className="font-semibold">demo1234</span>.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-brand-800/50">
            {db.settings.dioceseName} · Diocese Network Management
          </p>
        </div>
      </main>
    </div>
  );
}
