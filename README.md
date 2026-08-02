# JanShram Admin

Master admin console for the **SevaSetu / JanShram** service marketplace. A single
console to manage both sides of the marketplace — customers and providers — and
every operational entity between them.

Built to mirror the [`janshram-frontend`](../janshram-frontend) design system
(same Tailwind v4 theme, `#0A84FF` primary, shadcn/ui components) and the
[`janshram-backend`](../janshram-backend) Prisma domain model.

## Stack

- React 18 + Vite 6 + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix) — theme copied verbatim from the frontend
- React Router 7, Recharts, Sonner (toasts), lucide-react

## Running

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Demo login: any credentials (pre-filled `admin@janshram.in` / `admin123`).

## Data layer

Two interchangeable adapters implement the same typed `AdminApi` surface, so
every screen is transport-agnostic:

- **Mock** (`src/lib/mock/`) — a full in-memory dataset seeded from the real
  catalog. The panel runs standalone with zero backend. Mutations (verify,
  refund, adjust wallet, CRUD…) persist for the session and reset on reload.
  This is the default (`VITE_USE_MOCK=true`).
- **HTTP** (`src/lib/http/`) — talks to the backend's authenticated `/admin/*`
  routes. Enable with `VITE_USE_MOCK=false` and set `VITE_API_URL`.

### Running against live data

```bash
# 1. Backend — create the admin account and start the API
cd ../janshram-backend
npm run create-admin        # seeds admin@janshram.in / admin123 (override via env)
npm run dev                 # http://localhost:4000

# 2. Admin — point at the backend
cd ../janshram-admin
echo "VITE_USE_MOCK=false" > .env
echo "VITE_API_URL=http://localhost:4000/api/v1" >> .env
npm run dev                 # http://localhost:5174
```

Admins authenticate with **email + password** (not the OTP flow customers and
providers use). The backend enforces `requireRole('ADMIN')` on every route.

## Requirements covered

Derived by auditing the frontend screens and backend Prisma models:

| Area | Capabilities |
|------|--------------|
| **Dashboard** | Users / providers / revenue / bookings KPIs, 14-day revenue area chart, daily signups, category breakdown pie, recent bookings, admin audit log |
| **Users** | Search + filter by role/status, activate / deactivate, per-user detail with wallet, activity and notification prefs |
| **Providers** | Verify / revoke, availability toggle, feature badges, ratings, earnings, categories & specialties |
| **Categories** | Create / edit / delete with icon picker |
| **Services** | Browse all listings, filter by category, delist |
| **Bookings** | Filter by status, drill-down detail, change status, issue refunds |
| **Tenders & Bids** | Tender list + detail, view all bids, change tender status |
| **Reviews** | Moderate — hide / restore / delete, filter flagged & by rating |
| **Wallets** | Balances + transaction ledger, manual credit / debit adjustments |
| **Coupons** | Full CRUD — flat/percent, min order, cap, expiry, active toggle |
| **Notifications** | Broadcast announcements to targeted audiences + sent history |
| **Support Tickets** | Triage queue (status/priority/category filters), threaded conversation, assign, set priority, reply, resolve/close |
| **Support Chats** | Read-only monitoring of customer ↔ provider conversations |
| **Settings** | Admin profile, dark mode, platform config (commission, referral, maintenance mode) |

## Structure

```
src/
  components/        # shell (Sidebar, Topbar, AdminLayout) + shared primitives
    ui/              # shadcn components (copied from frontend)
  context/           # AuthContext, ThemeContext
  lib/
    api.ts           # adminApi entry (mock ↔ http switch)
    types.ts         # domain types (mirror backend + admin extensions)
    money.ts         # paise ↔ rupee helpers
    mock/            # in-memory dataset + adapter
  screens/           # one file per route
```
