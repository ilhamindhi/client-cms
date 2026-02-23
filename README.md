# CMS Web (Admin + Superadmin)

CMS berbasis Next.js App Router untuk kebutuhan backend operation.

Fokus saat ini:
- Login admin/superadmin ke backend `C:\np\service`
- Role-based dashboard (`admin`, `superadmin`)
- Halaman `Admin Users` (list + create/promote admin + suspend/activate + force logout + reset password oleh superadmin)
- Halaman `Audit Logs` (superadmin only)
- Halaman `Memberships` untuk CRUD plan/coupon membership
- Halaman `Gift Codes` untuk CRUD campaign gift code
- Halaman `Products` untuk list/create/update/archive produk
- Halaman `Orders` untuk list, update shipment, complete/cancel/refund
- Halaman `Payments` untuk payment methods, wallet topup, reconcile/refund log
- Halaman `Rewards` untuk reward catalog + fulfillment redemption
- Halaman `Referrals` untuk payouts + attribution commission
- Halaman `Notifications` untuk templates, preferences, broadcast, device test
- Halaman `Challenges` untuk challenge + badge management
- Halaman `Nutrition` untuk food catalog management (CRUD + verification)
- Halaman `Content` untuk articles/events/marketplace + publish workflow
- Halaman `Media` untuk upload/list/delete media via Cloudinary
- Halaman `Ops` untuk health summary, alert thresholds, dan operational tools
- Dashboard analytics dengan export CSV + auto-refresh + panel ops alerts threshold (superadmin)

Tidak ada fitur yang berhubungan dengan crypto.

## Tech Stack

- Next.js `16.1.6`
- React `19.2.4`
- Tailwind CSS `4.x`
- TypeScript `5.x`
- Zustand (auth state)
- Recharts `3.7.x` (analytics charts)
- Tiptap `3.20.x` (rich text editor artikel)
- Framer Motion (animasi ringan)
- Lucide React (icon set)
- Playwright `1.58.x` (smoke E2E)
- Bun (package manager / runner)

## Requirements

- Node.js `>= 20.9.0` (sesuai engine `next@16.1.6`)
- Bun `>= 1.3`

## Quick Start

1. Install dependency

```bash
bun install
```

2. Siapkan env

```bash
cp .env.example .env
```

3. Jalankan dev server

```bash
bun run dev
```

4. Buka:

```text
http://localhost:3000/auth/login
```

## Environment

`NEXT_PUBLIC_API_BASE_URL`
- Default lokal: `http://localhost:3000/api/v1`
- Arahkan ke backend service kamu yang aktif

`NEXT_PUBLIC_CMS_SESSION_MODE`
- `hybrid` (default, direkomendasikan): token akses di memory, sinkron cookie session via API internal.
- `http_only`: ketat untuk production, wajib route cookie internal.
- `legacy`: mode lama (persist token di localStorage + non-HttpOnly cookie).

Opsional server-side:
- `CMS_API_BASE_URL` override base URL backend untuk route internal session.
- `CMS_SESSION_MODE` override server-side session mode.
- `CMS_SESSION_COOKIE_SECURE` (`true/false`) paksa flag secure cookie.
- `CMS_SESSION_COOKIE_DOMAIN` domain cookie lintas subdomain (mis. `.example.com`).
- `CMS_REFRESH_COOKIE_MAX_AGE_SEC` umur refresh cookie (default 30 hari).

Opsional untuk smoke test:
- `CMS_E2E_BASE_URL` (default `http://127.0.0.1:3100`)
- `CMS_E2E_ADMIN_EMAIL`
- `CMS_E2E_ADMIN_PASSWORD`

## Seed Account (backend)

Jika backend `service` sudah migrate + seed:
- `superadmin@example.test` / `superadmin123456`
- `admin@example.test` / `admin123456`

## Halaman Utama

- `/auth/login`
- `/` analytics dashboard (summary + trend charts)
- `/admins` list internal users + create/promote admin + lifecycle controls (superadmin)
- `/audit-logs` audit action feed (superadmin)
- `/memberships` CRUD plan + coupon membership
- `/gift-codes` CRUD gift code campaign
- `/products` CRUD lifecycle produk
- `/orders` lifecycle order + shipment + refund
- `/payments` methods + topup + reconciliation
- `/rewards` reward redemption fulfillment
- `/referrals` payout + attribution monitoring
- `/notifications` template + preference + broadcast
- `/challenges` challenge + badge setup
- `/nutrition` food catalog management
- `/content` article/event/marketplace moderation
- `/media` cloud media management
- `/ops` operational summary + guard rails

## Role Matrix

`admin`
- Akses dashboard umum
- Akses `Admin Users` list
- Tidak bisa create/promote admin
- Tidak bisa lihat audit logs superadmin endpoint

`superadmin`
- Semua akses admin
- Bisa `POST /auth/superadmin/admin-users`
- Bisa `GET /auth/superadmin/audit-logs`
- Bisa `PATCH /auth/superadmin/users/:userId/status`
- Bisa `POST /auth/superadmin/users/:userId/force-logout`
- Bisa `POST /auth/superadmin/users/:userId/reset-password`

## Backend API yang Dipakai

Auth/session:
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/logout`

Admin/superadmin:
- `GET /auth/admin/users`
- `POST /auth/superadmin/admin-users`
- `GET /auth/superadmin/audit-logs`
- `PATCH /auth/superadmin/users/:userId/status`
- `POST /auth/superadmin/users/:userId/force-logout`
- `POST /auth/superadmin/users/:userId/reset-password`
- `PATCH /auth/superadmin/users/:userId/roles`
- `GET|POST|PATCH|DELETE /memberships/admin/plans`
- `GET|POST|PATCH|DELETE /memberships/admin/coupons`
- `GET|POST|PATCH /points/admin/gift-codes`
- `GET /ops/alerts` (superadmin)
- `GET|POST|PATCH /products/admin`
- `GET|PATCH /orders/admin` + shipment/refund actions
- `GET|POST|PATCH /payments/admin/methods` + reconcile
- `GET|POST|PATCH /points/admin/rewards` + redemption fulfillment
- `GET|POST|PATCH /referrals/admin/*` (commission, payout)
- `GET|POST|PATCH /notifications/admin/*` (template, broadcast, preference)
- `GET|POST|PATCH /challenges/admin/*`
- `GET|POST|PATCH|DELETE /nutrition/foods`
- `GET|POST|PATCH /content/admin/*`
- `GET|POST|DELETE /media/admin/*`

## Struktur Project

```text
app/
  auth/login/page.tsx
  (dashboard)/
    layout.tsx
    page.tsx
    admins/page.tsx
    audit-logs/page.tsx
    memberships/page.tsx
    gift-codes/page.tsx
    products/page.tsx
    orders/page.tsx
    payments/page.tsx
    rewards/page.tsx
    referrals/page.tsx
    notifications/page.tsx
    challenges/page.tsx
    nutrition/page.tsx
    content/page.tsx
    media/page.tsx
    ops/page.tsx
  globals.css
  layout.tsx
  error.tsx
  global-error.tsx
components/
  AuthGuard.tsx
  Sidebar.tsx
  TopBar.tsx
  TokenRefreshProvider.tsx
  ui/
    Badge.tsx
    Button.tsx
    Card.tsx
    EmptyState.tsx
    Input.tsx
    Select.tsx
    Table.tsx
    Textarea.tsx
    ToastViewport.tsx
lib/
  api/
    admin.ts
    auth.ts
    membership.ts
    points.ts
    products.ts
    orders.ts
    payments.ts
    rewards.ts
    referrals.ts
    notifications.ts
    challenges.ts
    nutrition.ts
    content.ts
    media.ts
    ops.ts
  stores/
    auth-store.ts
  auth-cookie.ts
  http.ts
  types.ts
  utils.ts
proxy.ts
```

## Security & Auth Notes

- Session mode default `hybrid`: akses token di memory state + cookie session (`cms_access_token`, `cms_refresh_token`) via API internal.
- Untuk production, set `NEXT_PUBLIC_CMS_SESSION_MODE=http_only` agar cookie `HttpOnly` aktif penuh.
- Mode `legacy` tetap tersedia untuk fallback development lama.
- `proxy.ts` memproteksi route dashboard di server edge level
- `AuthGuard` melakukan verifikasi ulang di client
- `TokenRefreshProvider` melakukan bootstrap session dari cookie + refresh token berkala

## Scripts

- `bun run dev` - start dev server
- `bun run build` - production build
- `bun run start` - run production server
- `bun run lint` - eslint check
- `bun run test:e2e:smoke` - playwright smoke test (headless)
- `bun run test:e2e:smoke:headed` - playwright smoke test (headed)

## Smoke Test

1. Install browser runner sekali:

```bash
bunx playwright install chromium
```

2. Jalankan app:

```bash
bun run dev
```

3. Jalankan smoke:

```bash
bun run test:e2e:smoke
```

Catatan:
- test login authenticated akan otomatis `skip` jika `CMS_E2E_ADMIN_EMAIL` atau `CMS_E2E_ADMIN_PASSWORD` belum di-set.

## Status Implementasi

Sudah production-ready untuk:
- login + role aware navigation
- admin/superadmin access separation
- admin user lifecycle flow (create/promote + status + force logout + reset password)
- audit log viewer flow
- membership plan/coupon CRUD flow
- gift code campaign CRUD flow
- products lifecycle flow
- order operations flow (shipment + status + refund admin action)
- payment operations flow (methods + reconcile tools)
- reward redemption fulfillment flow
- referrals payout + attribution operation flow
- notification template + broadcast operation flow
- challenge + badge operation flow
- nutrition food catalog operation flow
- content moderation + publication flow
- article rich text editor (Tiptap) dengan sinkronisasi ke create/update JSON
- media management flow (Cloudinary-backed)
- ops health + threshold panel
- form workflow terstruktur (tanpa browser prompt) untuk orders/rewards/referrals/content
- admin user lifecycle actions (status/roles/force logout/reset password) via modal form terstruktur
- aksi sensitif admin lifecycle memakai konfirmasi ringan (checkbox acknowledgement)
- stock adjustment produk via modal form + konfirmasi ringan untuk perubahan sensitif
- content JSON tools dengan validate/format + prefill dari tabel untuk update/archive
- global toast notification konsisten untuk feedback action
- segment error boundary + loading fallback untuk dashboard
- analytics dashboard (summary + timeseries chart)
- export CSV analytics (summary + timeseries)
- export CSV ops alerts (summary + breaches + detail)
- auto-refresh dashboard (off/30s/60s/120s)
- ops alerts threshold panel untuk superadmin

## Catatan

- Nama produk masih netral (`CMS Portal`) sesuai permintaan kamu.
- Jika mau, tahap berikutnya bisa saya lanjutkan ke:
  - moderation workflow (approval/rejection) untuk perubahan sensitif
  - analytics membership/gift-code (daily redeem + cohort)
  - hardening token refresh strategy + inactivity timeout
