# Atom — In-House Goal Setting & Tracking Portal

Built for **AtomQuest Hackathon 1.0**.

A structured digital portal that takes employee goals through their full lifecycle —
creation → manager approval (with locking) → quarterly check-ins → reporting,
analytics, audit trail, escalations, and shared / departmental goals.

The UI is intentionally modelled after enterprise dashboards (Salesforce / SAP):
calm slate canvas, dense data tables, sticky top bar with cycle context, and a
dark sidebar with role-filtered navigation.

---

## Quick start

```bash
npm install
npm run dev
# → http://localhost:3000
```

A `data/db.json` file is created on first boot from a deterministic seed. Delete
it (or use **Admin → Cycles → Reset demo data**) to start fresh.

---

## Demo credentials

The portal seeds three roles. Sign in with email + password, or use the
**Demo accounts** quick-login on the sign-in screen.

| Role        | Name           | Email              | Password   |
| ----------- | -------------- | ------------------ | ---------- |
| Admin / HR  | Priya Iyer     | `admin@atom.dev`   | `admin`    |
| Manager     | Rohan Mehta    | `rohan@atom.dev`   | `manager`  |
| Manager     | Anita Rao      | `anita@atom.dev`   | `manager`  |
| Employee    | Karthik Nair   | `karthik@atom.dev` | `employee` |
| Employee    | Sneha Patel    | `sneha@atom.dev`   | `employee` |
| Employee    | Arjun Verma    | `arjun@atom.dev`   | `employee` |
| Employee    | Meera Kapoor   | `meera@atom.dev`   | `employee` |

There is also a **role switcher** in the top-bar avatar menu — useful for
walking through journeys without logging out.

Sneha already has a submitted sheet (so Rohan can demo the **approval** flow)
and Arjun has an approved sheet (so check-ins, scoring, manager comments and
analytics show real numbers immediately).

---

## What is implemented

### Phase 1 — Goal creation & approval (must-have)
- Employee goal sheet with Thrust Area, Title, Description, UoM, Target, Weightage.
- Validation enforced both client-side and server-side:
  - Total weightage = 100%, min 10% per goal, max 8 goals.
  - UoM-specific target validation (e.g., zero-based forces `0`, timeline forces date).
- Manager approval queue with **inline edit** of title / target / weightage on
  submitted goals, **Return for rework** (with reason), and **Approve & lock**.
- Locked goals are immutable for everyone except Admin.

### Phase 2 — Quarterly check-ins (must-have)
- Per-quarter actual + status (Not started / On track / Completed).
- Window enforcement: Goal Setting · Q1 · Q2 · Q3 · Q4 (Annual). Configurable
  per cycle in Admin → Cycles, including an in-app **demo clock** that lets you
  jump days into the future to walk through every quarter.
- Manager **check-in module** with planned vs. actual view and structured comments.
- System-computed progress scores per the brief:
  - **Min** (higher better): `actual ÷ target`
  - **Max** (lower better): `target ÷ actual`
  - **Timeline**: 100% if on or before deadline, −5 / day late, floored at 0
  - **Zero**: 100% if actual = 0, else 0%

### Shared / departmental goals
- Admin or Manager can push a single KPI to many employees.
- Recipients can adjust only their own weightage (title and target are read-only).
- Achievement updates by the primary owner sync to all linked goal sheets.

### Reporting & governance
- **Achievement Report** export to CSV (opens in Excel) — every goal, every quarter,
  with scores and manager comments. `/api/reports/achievement`.
- **Completion Dashboard** — per-quarter “Done / Pending” grids for employees and
  managers; respects the window state (Not open / Open / Closed).
- **Audit Trail** — every change is logged with actor, timestamp, before/after, and
  is filterable. **After-lock** edits are flagged in red. Admins can unlock a
  goal directly from the audit page (with a mandatory reason that is also logged).

### Bonus features (Section 5 of the brief)

| Bonus                                         | Status | Notes                                                                                                                                                                            |
| --------------------------------------------- | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Microsoft Entra ID SSO                        |   ✅    | Full SSO configuration UI at Admin → SSO: tenant/client setup, **test connection**, OIDC discovery endpoint, token claim mapping, **auto-provision** toggle, **role mapping from Azure AD groups** (3 groups → admin/manager/employee), **hierarchy sync** from Azure AD `manager` attribute, sync schedule (realtime/hourly/daily/manual), **SSO auth logs**. Login page has "Sign in with Microsoft" button. API endpoint at `/api/auth/sso` documents the full OIDC flow. |
| Email / Teams integration                     |   ✅    | **Notification Center** with rendered email template previews (branded header, subject line, CTA button, footer) and **Microsoft Teams Adaptive Card** previews (color accent bar, action buttons, deep links). Click to expand preview. Stats dashboard (total/unread/emails/teams). Seed notifications populate on first boot. Same `notify()` call site makes it trivial to swap stubs for real SMTP (Postmark/SES) or Teams webhook adapters. |
| Escalation module (rule-based)                |   ✅    | Configurable rules in Admin → Escalation. Triggers: no submission, no approval, no check-in. Escalation chain: employee → manager → HR. **Resolve** action on each escalation log entry with Open/Resolved filtering. **Run engine now** for on-demand pass. 7-day dedup window prevents notification spam. |
| Analytics module                              |   ✅    | Summary stat cards, QoQ achievement, status / thrust-area / UoM / goal-state-pipeline distributions, **department-level achievement**, **team-level QoQ table** (per-manager breakdown), **employee × quarter heatmap**, per-thrust-area performance, **manager effectiveness** (% of cells with comments). |

### Other niceties
- Toast notifications, modals, role-aware sidebar, sticky topbar with cycle phase,
  inline validation, optimistic disable-while-pending, role guards on every page
  and API route (redirect to `/forbidden`).
- Demo clock offset (Admin → Cycles) lets the demo walk through Q1 → Q4 in seconds.
- “Reset demo data” button restores the seed in one click.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│  React 19 client components (Toasts, Modal, GoalSheetClient,             │
│  CheckinsClient, ApprovalsClient, TeamClient, EscalationClient, …)       │
└─────────────────────────┬────────────────────────────────────────────────┘
                          │  fetch / form / Server Action RPC
┌─────────────────────────▼────────────────────────────────────────────────┐
│                    Next.js 16 (App Router) — Turbopack                    │
│                                                                           │
│  app/                                                                     │
│    layout.tsx          ← global shell, fonts                              │
│    page.tsx            ← redirects to /login or /dashboard                │
│    login/              ← Server Action login + quick-login chips          │
│    forbidden/          ← 403                                              │
│    (app)/              ← route group, auth-guarded, with Sidebar+Topbar   │
│      dashboard/         goals/         checkins/                          │
│      approvals/        team/          shared-goals/                       │
│      reports/          completion/    analytics/                          │
│      notifications/    admin/cycles, admin/users, admin/audit,            │
│                        admin/escalation                                   │
│    api/                ← REST endpoints (auth/switch, auth/logout,        │
│                          reports/achievement CSV, escalation/run,         │
│                          notifications/read-all)                          │
│                                                                           │
│  lib/                                                                     │
│    types.ts            ← all TypeScript types                             │
│    db.ts               ← JSON-file backed store + helpers                 │
│    seed.ts             ← deterministic seed users / cycles / goals        │
│    auth.ts             ← cookie session + role guards                     │
│    cycles.ts           ← window state machine, formatting                 │
│    validation.ts       ← per-goal + per-sheet rules                       │
│    scoring.ts          ← Min/Max/Timeline/Zero formulas                   │
│    audit.ts            ← log helper (afterLock flag)                      │
│    notify.ts           ← in-app inbox + email/Teams stubs                 │
│    escalation.ts       ← rule engine                                      │
│    sharedGoals.ts      ← push + sync                                      │
│    actions/{goals,admin,shared}.ts ← Server Actions                       │
│                                                                           │
│  components/                                                              │
│    Sidebar, Topbar, Modal, Toast, Icon, StatusBadge,                      │
│    charts/{BarChart, Donut, Heatmap}                                      │
└─────────────────────────┬────────────────────────────────────────────────┘
                          │  fs (JSON)
┌─────────────────────────▼────────────────────────────────────────────────┐
│              data/db.json (gitignored, auto-seeded on boot)              │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tech stack
- **Next.js 16** with App Router, Server Components, Server Actions, Turbopack.
- **React 19** with `use()` and concurrent transitions for non-blocking saves.
- **TypeScript 5** end-to-end.
- **Tailwind v4** (utility classes only used sparingly — custom CSS primitives
  in `globals.css` give the enterprise table / form / modal look).
- **No external state library**, **no ORM**. A 200-line file-backed JSON store
  keeps the demo trivially deployable and reset-able. The contract in `lib/db.ts`
  is small enough to swap for Postgres / Mongo / DynamoDB without touching call sites.

### Why this stack
- **One process, no infra** — the brief calls out cost-optimisation. The whole
  portal runs as a single Node process; the JSON store eliminates DB cost in the
  demo environment. For production, swap `getDB()/saveDB()` for any persistence.
- **Server Components for the data-heavy pages** (dashboards, completion, audit,
  analytics) means *zero* client-side JS is shipped for those views — page weights
  stay tiny, network round-trips collapse to one.
- **Server Actions** for mutations means there is no hand-rolled REST layer for
  the goal lifecycle. Validation lives in `lib/validation.ts` and runs on both
  sides automatically.
- **Caching strategy**: Server Components are dynamically rendered (auth-gated)
  but inner data is read from a single in-memory cache that re-reads `data/db.json`
  only when it isn't already loaded — a single `revalidatePath` after each
  mutation invalidates the relevant slice.

### Security & RBAC
- Auth uses an `httpOnly`, `sameSite=lax` session cookie containing only the user
  id. `lib/auth.ts` exposes `requireUser()` and `requireRole(...)` which redirect
  to `/login` or `/forbidden`. Every server route and Server Action calls one of them
  *before* any database access. Curl confirms unauthorised access returns `307`
  (redirect) and forbidden role returns `307 → /forbidden`.
- Server-side validation in `lib/validation.ts` and `lib/actions/goals.ts` mirrors
  the client-side rules — the client can be tampered with, the server cannot be
  bypassed.

---

## Operational notes

- **Reset the demo**: Admin → Cycles → *Reset demo data*. Re-seeds users, cycles,
  goals and clears audit logs and notifications.
- **Advance the demo clock**: Admin → Cycles → Demo clock. Add days to simulate
  moving through Q1 → Q4. Useful for showing escalations and missed check-ins.
- **Run escalations on demand**: Admin → Escalation → *Run engine now*.
- **Export the Achievement Report**: Reports → *Download CSV*. Opens cleanly in
  Excel / Numbers / Sheets.

---

## File map (top hits)

| Path                                              | What's in it                                  |
| ------------------------------------------------- | --------------------------------------------- |
| `app/(app)/layout.tsx`                            | Auth-guarded shell (Sidebar + Topbar + Toast) |
| `app/(app)/dashboard/page.tsx`                    | Role-aware home with cycle calendar           |
| `app/(app)/goals/`                                | Employee goal sheet + Server Action calls     |
| `app/(app)/approvals/`                            | Manager approvals queue with inline edit      |
| `app/(app)/checkins/`                             | Employee quarterly check-in UI                |
| `app/(app)/team/`                                 | Manager check-in module with comments         |
| `app/(app)/shared-goals/`                         | Push KPI to many employees                    |
| `app/(app)/admin/audit/`                          | Audit trail + admin unlock                    |
| `app/(app)/admin/cycles/`                         | Cycle config + demo clock                     |
| `app/(app)/admin/users/`                          | User & hierarchy management                   |
| `app/(app)/admin/escalation/`                     | Rule editor + log                             |
| `app/(app)/analytics/`                            | QoQ, donuts, heatmap, manager effectiveness   |
| `app/api/reports/achievement/route.ts`            | CSV export                                    |
| `app/api/escalation/run/route.ts`                 | On-demand rule engine pass                    |
| `lib/actions/{goals,admin,shared}.ts`             | Server Actions (mutations)                    |
| `lib/{scoring,validation,cycles,escalation}.ts`   | Business rules                                |
| `lib/{db,seed,auth,audit,notify}.ts`              | Infra: store, seed, auth, audit, notifications|

---

## What I'd add next

- Real email transport via Postmark/SES and an Azure Teams incoming-webhook for the
  notification stubs.
- MSAL Azure AD provider (Bonus 5.1) reading the `objectId` claim and mapping
  group memberships to roles.
- Swap `data/db.json` for Postgres + Drizzle for production deploys.
- Granular permissions for skip-level managers; today the hierarchy is single-level.
