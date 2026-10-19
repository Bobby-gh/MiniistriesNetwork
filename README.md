# Diocese Network — Church Management System

A complete church **diocese network** web application built with Next.js (App Router), TypeScript and Tailwind CSS. Brand colours are **blue & white**, with a custom shield-and-cross logo (`src/components/logo.tsx` + `src/app/icon.svg`).

## Features

| Area | Page | What it does |
| --- | --- | --- |
| Dashboard | `/` | Live stats: members, dues compliance, donations, defaulters, building fund, last Sunday's turnout, income chart, recent payments, "needs attention" panel |
| Member register | `/members` | Register members (auto membership numbers), search/filter, full profile with dues status, attendance rate and lifetime giving per category, edit/remove, CSV export |
| Parishes | `/parishes` | Every church in the network with member counts, monthly dues and dues-compliance bars; add parishes |
| Transfers | `/transfers` | Members moving between parishes — request, approve/reject workflow |
| Attendance | `/attendance` | Mark the roll per service (Sunday worship, Bible study, prayer meeting…), mark-all/clear, save, turnout stats, service history, per-member attendance rates |
| Monthly dues | `/dues` | Expected vs collected vs outstanding per month, compliance bar, mark paid, remind one or all unpaid, dues-sheet CSV |
| Donations | `/donations` | Giving ledger incl. anonymous basket offerings, funds (missions, welfare…), top donor, CSV export |
| Funeral levy | `/funeral-levy` | Levy ledger per bereavement + **compliance panel** listing members who have not paid this month with one-click bulk reminders |
| Building project | `/building-fund` | Project contributions tracked against a target with progress bar and projections |
| Other payments | `/payments` | Event fees, subscriptions, hall rental, welfare, penalties — categorised miscellaneous income |
| Defaulters | `/defaulters` | Identity list of members in arrears (name, number, parish, phone, months owed, amount), configurable threshold, generate defaulter alerts, export |
| Alerts | `/alerts` | Payment alerts (auto-created when payments are recorded) and defaulter notices; compose with templates, channel (SMS/WhatsApp/Email/Print), queue → mark sent |
| Reports | `/reports` | 3/6/12-month income by category (stacked chart + table), attendance trend, top donors, parish performance, CSV export |
| Settings | `/settings` | Diocese name, currency, dues amount, funeral levy amount, building target, arrears threshold, JSON backup, reset demo data |

## Getting started

```bash
npm install
npm run dev        # development on http://localhost:3000
npm run build      # production build
npm start          # serve the production build
```

The app opens on the **login page** (`/login`). Authentication is a stub for now: any
valid email with a 4+ character password signs you in (try `admin@diocese.org` /
`demo1234`), and the session is kept in `localStorage`. Signing out is the button
next to your name in the top bar. Every other route is protected by
`src/components/auth-gate.tsx`.

**Adding real authentication later:** replace the placeholder in `signIn()` in
`src/lib/auth.tsx` with your provider call (NextAuth, Clerk, custom `/api/login`).
All pages read `useAuth()`, so nothing else needs to change — optionally issue
server-side session cookies there instead of localStorage.

On first load the app seeds a realistic demo diocese (5 parishes, 28 members, 7 months of payments and attendance). **All data is stored in the browser's `localStorage`** under `diocese-network-db-v1`, so the app runs instantly with no backend. Use *Settings → Reset demo data* to restore the seed, or *Download backup* for a JSON snapshot.

## Smoke test

A headless-Chrome test drives the real UI (auth gate redirect, demo login, register a member, record dues, generate defaulter alerts, save attendance, verify persistence, sign out):

```bash
npm start                # in one terminal
node scripts/smoke-test.mjs   # in another
```

## Project structure

```
src/
  app/            15 pages (login, dashboard, members, parishes, transfers,
                  attendance, dues, donations, funeral-levy, building-fund,
                  payments, defaulters, alerts, reports, settings)
  components/     auth gate, shell (sidebar/topbar), logo, UI kit, member form,
                  payment form, generic finance ledger page
  lib/            types, seed data, selectors (dues/defaulters/analytics),
                  persistent store (useSyncExternalStore + localStorage),
                  auth session store, formatting & CSV helpers
```

The four money ledgers (donations, funeral levy, building fund, other payments) share one battle-tested `FinancePage` component; dues has its own reconciliation screen.
