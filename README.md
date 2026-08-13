# 3D Print ERP — System for 3D Printing Business Management

A modular monolith web application designed to run inside Telegram Mini App for managing a small 3D printing home business. Hosted locally in a homelab environment.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Telegram WebApp SDK
- **Backend**: Node.js, NestJS, TypeScript, Prisma ORM, REST API
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker, Docker Compose, NPM Workspaces monorepo

---

## 💰 Architectural Rationale: Financial Precision

All monetary values (`price_per_spool`, `default_cost`, `default_price`, `calculated_cost`, `calculated_price`, `final_price`, `unit_cost`, `unit_price`, `total_cost`, `total_price`, `amount`, etc.) are stored as **Integers** representing minimal currency units (e.g. integer whole units or cents/kopecks).

**Why Integer instead of Float/Decimal?**
1. Floating point arithmetic in JavaScript/Node.js (`0.1 + 0.2 = 0.30000000000000004`) causes unacceptable cumulative rounding bugs when multiplying project filament weights by unit costs.
2. Storing exact integers guarantees perfect precision across backend NestJS logic, PostgreSQL queries, and React UI rendering without floating point drift.
3. Converting minimal units for UI display is clean, unambiguous, and fast.

---

## 🔒 Telegram Authentication Flow

1. User opens the application within Telegram Mini App.
2. Frontend reads `window.Telegram.WebApp.initData` and sends it via request payload or `Authorization` header to `/auth/telegram`.
3. Backend validates the signature of `initData` using HMAC-SHA256 with the secret key derived from `TELEGRAM_BOT_TOKEN`. `Telegram.WebApp.initDataUnsafe` is **never** trusted without signature verification.
4. Backend checks whether the decoded `telegram_id` exists in the `users` allowlist database table with `is_active = true`.
5. If valid & allowed, backend returns a JWT session token and user details (`id`, `telegramId`, `role`).
6. If missing from allowlist, backend responds with **403 Forbidden** ("Access Denied: Telegram ID missing from allowlist").

---

## 🚀 Quick Start (Development & Homelab Docker)

### Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your Telegram Bot token and initial Owner Telegram ID in `.env`:
```env
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
INITIAL_OWNER_TELEGRAM_ID="your_telegram_id"
JWT_SECRET="your_jwt_secret_key"
```

### Running with Docker Compose

To start PostgreSQL, API, and Web containers:
```bash
docker compose up --build -d
```

Access services:
- **API Healthcheck**: `http://localhost:3000/health`
- **Web App UI**: `http://localhost:5173`

---

## 💾 PostgreSQL Database Backup & Restore Guide

Since this application runs in a homelab environment, regular backups are essential.

### 1. Manual Backup Script
To create a timestamped database dump:
```bash
docker exec -t printerp_postgres pg_dump -U printerp -d printerp_db -F c -b -v -f /tmp/backup.dump
docker cp printerp_postgres:/tmp/backup.dump ./backup_$(date +%Y%m%d_%H%M%S).dump
```

### 2. Automated Daily Cron Backup (Homelab host)
Add to host crontab (`crontab -e`):
```cron
0 3 * * * docker exec printerp_postgres pg_dump -U printerp -d printerp_db | gzip > /var/backups/printerp/printerp_$(date +\%Y\%m\%d).sql.gz
```

### 3. Database Restore
To restore from a SQL dump file:
```bash
gunzip -c /var/backups/printerp/printerp_20260813.sql.gz | docker exec -i printerp_postgres psql -U printerp -d printerp_db
```

---

## 🧪 Running Tests & Typechecks

```bash
# Typecheck entire monorepo
npm run typecheck

# Run backend unit tests (Telegram Auth HMAC validation, calculations)
npm run test
```