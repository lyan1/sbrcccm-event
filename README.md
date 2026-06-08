# Church Pickleball

A lightweight responsive web app for church pickleball group registration and balance tracking.

## Features

- **Public (no login):** Select/add family name, register for events, view balance & transactions, payment QR codes
- **Admin:** Event management, settlement, payments, adjustments, CSV export, QR image upload
- **Bilingual:** Chinese (default) and English

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui components
- PostgreSQL + Prisma
- Supabase Storage (QR images)
- iron-session (admin auth)
- Vercel deployment

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required:
- `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres connection strings
- `ADMIN_SESSION_SECRET` — at least 32 random characters
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`

### 3. Database setup

```bash
npm run db:migrate
npm run db:seed
```

Default admin credentials (from seed):
- Username: `admin` (or `ADMIN_USERNAME` env)
- Password: `admin123` (or `ADMIN_PASSWORD` env) — **change in production**

### 4. Supabase Storage

Create a public bucket named `pickleball-images` (or match `SUPABASE_STORAGE_BUCKET`).

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push repo to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env.example`
4. Set build command: `npm run build`
5. Add `npm run db:migrate` as a post-deploy step or run migrations manually

## Project Structure

```
src/
  app/              # Pages and API routes
  components/       # UI and layout components
  lib/              # DB, auth, settlement, i18n, validation
prisma/
  schema.prisma     # Data model
  seed.ts           # Sample data + admin user
```

## Key Routes

| Public | Admin |
|--------|-------|
| `/` | `/admin/login` |
| `/select-name` | `/admin` |
| `/add-name` | `/admin/members` |
| `/events` | `/admin/events` |
| `/my-registrations` | `/admin/transactions` |
| `/balance` | `/admin/images` |
| `/payment-info` | |

## Settlement

Court cost is split using deterministic cent distribution:
1. Base per-person cost = floor(total / participants)
2. Remainder cents distributed one at a time by registration ID order
3. Admin can override individual deductions before confirming
