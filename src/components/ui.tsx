"use client";

// Shared UI primitives — neutral-first, type-led styling with a single blue accent.

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export const inputCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:bg-neutral-50 disabled:text-ink/50";

export const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500";

export const thCls =
  "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap";
export const tdCls = "px-4 py-3 text-sm text-[#475467] align-middle";
export const rowCls = "border-t border-neutral-100 transition-colors hover:bg-neutral-50/70";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "icon";
};

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border border-neutral-200 bg-white text-[#344054] hover:border-neutral-300 hover:bg-neutral-50",
    ghost: "text-neutral-500 hover:bg-neutral-100 hover:text-ink",
    subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-sm gap-2",
    icon: "p-2",
  };
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-neutral-200/70 bg-white shadow-card", padded && "p-5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ title, hint, actions }: { title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-brand-50", text: "text-brand-600", ring: "ring-brand-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-500", ring: "ring-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-500", ring: "ring-rose-100" },
  sky: { bg: "bg-sky-50", text: "text-sky-500", ring: "ring-sky-100" },
};

export function IconWell({
  icon,
  tone = "blue",
  className,
}: {
  icon: ReactNode;
  tone?: keyof typeof TONES | string;
  className?: string;
}) {
  const t = TONES[tone] ?? TONES.blue;
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
        t.bg,
        t.text,
        t.ring,
        className,
      )}
    >
      {icon}
    </span>
  );
}

/** Type-led stat block: micro label, large tabular figure, quiet sub-line. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "blue",
  valueClassName = "text-[26px]",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES | string;
  valueClassName?: string;
}) {
  const t = TONES[tone] ?? TONES.blue;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">{label}</p>
        {icon && <span className={cn("shrink-0 [&>svg]:h-4 [&>svg]:w-4", t.text)}>{icon}</span>}
      </div>
      <p className={cn("tabular mt-2 leading-none font-semibold tracking-tight text-ink", valueClassName)}>{value}</p>
      {sub && <p className="mt-2 text-xs text-neutral-500">{sub}</p>}
    </Card>
  );
}

const BADGE_TONES: Record<string, string> = {
  neutral: "bg-neutral-100 text-neutral-600",
  success: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  info: "bg-brand-50 text-brand-700",
  solid: "bg-brand-600 text-white",
};

/** Compact chip — squared-off radius and muted fills read calmer than pills. */
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES | string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        BADGE_TONES[tone] ?? BADGE_TONES.neutral,
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && <span className={labelCls}>{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-neutral-400">{hint}</span>}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Portal to <body>: page wrappers carry entry animations (transforms), and a
  // transformed ancestor would otherwise become the containing block for this
  // fixed-position overlay, pushing the popup off-screen.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-[#101828]/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-fade-up relative z-10 w-full rounded-2xl border border-neutral-200/60 bg-white shadow-pop",
          wide ? "max-w-3xl" : "max-w-lg",
          "max-h-[92vh] overflow-y-auto",
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-neutral-100 bg-white px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/60 px-6 py-14 text-center">
      {icon && <IconWell icon={icon} tone="blue" className="mb-3 h-11 w-11" />}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-neutral-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "brand",
}: {
  value: number;
  max: number;
  tone?: "brand" | "emerald" | "amber";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-brand-600";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70" role="progressbar" aria-valuenow={pct}>
      <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({
  first,
  last,
  size = "md",
}: {
  first: string;
  last: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-8 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-lg" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100",
        sizes[size],
      )}
    >
      {`${(first || "?")[0]}${(last || " ")[0] || ""}`.toUpperCase()}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, "pl-9")}
      />
    </div>
  );
}
