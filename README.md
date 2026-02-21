# CMS Web (Admin + Superadmin)

CMS berbasis Next.js App Router untuk kebutuhan backend operation.

Fokus saat ini:
- Login admin/superadmin ke backend `C:\np\service`
- Role-based dashboard (`admin`, `superadmin`)
- Halaman `Admin Users` (list + create/promote admin oleh superadmin)
- Halaman `Audit Logs` (superadmin only)

Tidak ada fitur yang berhubungan dengan crypto.

## Tech Stack

- Next.js `16.1.6`
- React `19.2.4`
- Tailwind CSS `4.x`
- TypeScript `5.x`
- Zustand (auth state)
- Framer Motion (animasi ringan)
- Lucide React (icon set)
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

## Seed Account (backend)

Jika backend `service` sudah migrate + seed:
- `superadmin@example.test` / `superadmin123456`
- `admin@example.test` / `admin123456`

## Halaman Utama

- `/auth/login`
- `/` dashboard
- `/admins` list internal users + create/promote admin (superadmin)
- `/audit-logs` audit action feed (superadmin)
- `/memberships` placeholder coupon membership
- `/gift-codes` placeholder gift code campaign

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
  globals.css
  layout.tsx
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
    Table.tsx
lib/
  api/
    admin.ts
    auth.ts
  stores/
    auth-store.ts
  auth-cookie.ts
  http.ts
  types.ts
  utils.ts
proxy.ts
```

## Security & Auth Notes

- Auth state disimpan via Zustand (`localStorage`) + sync cookie (`cms_access_token`)
- `proxy.ts` memproteksi route dashboard di server edge level
- `AuthGuard` melakukan verifikasi ulang di client
- `TokenRefreshProvider` menjalankan refresh token berkala

## Scripts

- `bun run dev` - start dev server
- `bun run build` - production build
- `bun run start` - run production server
- `bun run lint` - eslint check

## Status Implementasi

Sudah production-ready untuk:
- login + role aware navigation
- admin/superadmin access separation
- admin user creation/promotion flow
- audit log viewer flow

Belum diaktifkan (UI placeholder sudah ada):
- CMS CRUD lengkap membership coupons
- CMS CRUD lengkap gift codes + analytics redeem

## Catatan

- Nama produk masih netral (`CMS Portal`) sesuai permintaan kamu.
- Jika mau, tahap berikutnya bisa saya lanjutkan ke:
  - CRUD role management real (bukan hanya `admin/superadmin`)
  - halaman campaign gift code end-to-end
  - halaman coupon membership end-to-end
  - hardening token refresh strategy + inactivity timeout
