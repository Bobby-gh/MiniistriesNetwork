"use client";

// App chrome: light sidebar navigation + minimal top bar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  BellRing,
  Building2,
  CalendarCheck,
  HandCoins,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  PiggyBank,
  Repeat2,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
  X,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Logo, BrandLogo } from "./logo";
import { cn } from "./ui";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { defaulters } from "@/lib/selectors";
import { currentMonthKey } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "defaulters" | "alerts";
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "People",
    items: [
      { href: "/members", label: "Member Register", icon: Users },
      { href: "/parishes", label: "Parishes", icon: Building2 },
      { href: "/transfers", label: "Transfers", icon: Repeat2 },
    ],
  },
  {
    section: "Stewardship",
    items: [
      { href: "/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/dues", label: "Monthly Dues", icon: Wallet },
    ],
  },
  {
    section: "Finance",
    items: [
      { href: "/donations", label: "Donations", icon: HandCoins },
      { href: "/funeral-levy", label: "Funeral Levy", icon: Landmark },
      { href: "/building-fund", label: "Building Project", icon: PiggyBank },
      { href: "/payments", label: "Other Payments", icon: Wallet },
    ],
  },
  {
    section: "Compliance",
    items: [
      { href: "/defaulters", label: "Defaulters", icon: ShieldAlert, badge: "defaulters" },
      { href: "/alerts", label: "Alerts", icon: BellRing, badge: "alerts" },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Diocesan Dashboard", sub: "Network overview" },
  "/members": { title: "Member Register", sub: "Membership records across all parishes" },
  "/parishes": { title: "Parishes", sub: "Churches in the diocese network" },
  "/transfers": { title: "Transfers", sub: "Members moving between parishes" },
  "/attendance": { title: "Attendance", sub: "Mark and track service attendance" },
  "/dues": { title: "Monthly Dues", sub: "Collect and reconcile member dues" },
  "/donations": { title: "Donations", sub: "Giving and offertory ledger" },
  "/funeral-levy": { title: "Funeral Levy", sub: "Levy contributions and compliance" },
  "/building-fund": { title: "Building Project Fund", sub: "Project pledges and contributions" },
  "/payments": { title: "Other Payments", sub: "Fees, subscriptions and miscellaneous income" },
  "/defaulters": { title: "Defaulters", sub: "Members owing dues beyond threshold" },
  "/alerts": { title: "Alerts", sub: "Payment notices and defaulter communications" },
  "/reports": { title: "Reports", sub: "Financial and stewardship analytics" },
  "/settings": { title: "Settings", sub: "Diocese profile and configuration" },
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { db } = useStore();
  const { session } = useAuth();
  const defaulterCount = defaulters(db).length;
  const queuedAlerts = db.alerts.filter((a) => a.status === "queued").length;
  const month = currentMonthKey();
  const paidThisMonth = db.payments.filter((p) => p.type === "dues" && p.period === month).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        {onNavigate && (
          <button
            onClick={onNavigate}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const count =
                  item.badge === "defaulters" ? defaulterCount : item.badge === "alerts" ? queuedAlerts : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-[#475467] hover:bg-neutral-50 hover:text-ink",
                      )}
                    >
                      <item.icon
                        className={cn("h-[17px] w-[17px]", active ? "text-brand-600" : "text-neutral-400")}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "tabular rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                            active ? "bg-rose-50 text-rose-600" : "bg-rose-50 text-rose-500",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-100 px-5 py-4">
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="text-xs font-semibold text-ink">{db.settings.dioceseName}</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            {paidThisMonth} dues payments this month
          </p>
          <p className="mt-2 text-[11px] text-neutral-400">
            Signed in as {session?.name ?? "Diocesan Office"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { db } = useStore();
  const { session, signOut } = useAuth();

  const heading = TITLES[pathname] ?? { title: "Diocese Network", sub: "" };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-neutral-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#101828]/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-[290px] max-w-[85vw] border-r border-neutral-200 bg-white shadow-pop">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-neutral-200 p-2 text-[#344054] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="lg:hidden">
              <BrandLogo className="h-8 w-8 rounded-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-ink">{heading.title}</h1>
              <p className="hidden truncate text-xs text-neutral-500 sm:block">{heading.sub}</p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/defaulters"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <AlertCircle className="h-4 w-4 text-rose-500" />
                Defaulter centre
              </Link>
            </div>
            <div className="flex items-center gap-2 border-l border-neutral-100 pl-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
                {(session?.name ?? "DO")
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="hidden leading-tight md:block">
                <p className="max-w-[130px] truncate text-xs font-semibold text-ink">
                  {session?.name ?? "Diocesan Office"}
                </p>
                <p className="text-[10px] text-neutral-500">{db.settings.currency}</p>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[1200px] px-4 pb-8 sm:px-6">
          <p className="text-center text-[11px] text-neutral-400">
            © {new Date().getFullYear()} {db.settings.dioceseName} · Diocese Network Management System
          </p>
        </footer>
      </div>
    </div>
  );
}
