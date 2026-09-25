# Hotel Management System — Database Setup Guide

## Prerequisites

- **MySQL 8.0+** installed and running on `localhost:3306`
- **Node.js 20+** (for running the seed-hash script)

## Step 1: Create Database & Tables

Open a terminal and run the schema script:

```bash
mysql -u root -p < schema.sql
```

This creates the `hotel_db` database with all 22 tables, constraints, and indexes
(staff/customer accounts, bookings, invoices, payments, shifts, reviews, chat,
audit log, promo codes, room-stay history, auth tokens).

## Step 2: Generate Bcrypt Password Hashes

Before loading seed data, generate bcrypt hashes for the default staff passwords:

```bash
cd ../backend
npm install
npm run seed:hash
```

This prints 3 bcrypt hash strings. Copy them into `seed.sql` replacing the placeholder hashes.

## Step 3: Load Seed Data

```bash
mysql -u root -p hotel_db < seed.sql
```

This inserts realistic test data: hotel config, 3 staff users, 5 room types, 10 rooms, 5 customers, 5 services, 6 bookings (all statuses), invoices, payments, shifts, reviews, and promo codes.

## Step 4: Configure Backend Connection

Edit `backend/.env` (copy from `backend/.env.example` if needed):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hotel_db
```

## Step 5: Verify Connection

```bash
cd backend
npm run dev
```

The server should start on port 3000 and log "Database connected successfully".

## Default Seed Credentials

> **WARNING:** These are seed-only credentials for development/testing. They are NOT pre-filled in any login form (SEC-10). Change them in production.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hoangan.vn | admin123 |
| QuanLy (Manager) | manager@hoangan.vn | manager123 |
| LeTan (Receptionist) | letan01@hoangan.vn | letan123 |
| Customer (web account) | an.nguyen@email.com | khach123 |

All passwords are bcrypt-hashed in `seed.sql` (rounds 12).

## Database Schema Overview

22 tables with full referential integrity:

| Table | Description |
|-------|-------------|
| HOTEL_CONFIG | Hotel settings (singleton, id=1): name, address, VAT, check-in/out times |
| NGUOI_DUNG | Staff users (Admin/QuanLy/LeTan) with bcrypt-hashed passwords + lockout |
| LOAI_PHONG | Room types (Standard, Superior, Deluxe, Suite, VIP) |
| PHONG | Rooms with status state machine (Trong/DaDat/DangO/DangDon/BaoTri) |
| KHACH_HANG | Customers with unique CCCD/passport; web accounts have email_verified + lockout |
| XAC_THUC_KHACH | Customer account verification tokens (email link, one-time) |
| DAT_PHONG | Bookings with status state machine (6 statuses) + actual check-in time |
| DICH_VU | Services with Active/Inactive status |
| SU_DUNG_DICH_VU | Service usage lines per booking |
| HOA_DON | Invoices (1:1 with booking) with VAT calculation |
| THANH_TOAN | Payments (partial/full, refunds via negative rows) stamped with staff + shift |
| CA_LAM_VIEC | Work shifts with cash reconciliation |
| DANH_GIA | Reviews with moderation status |
| NHAT_KY | Audit log (immutable — INSERT only) |
| MA_GIAM_GIA | Promo codes with validity window, usage quota and minimum order value |
| CUOC_TRO_CHUYEN / TIN_NHAN | Customer–staff live chat (conversation + messages) |
| AUTH_REVOKED_TOKEN / PASSWORD_RESET | Logout token revocation + staff password-reset tokens |
| LICH_SU_PHONG | Room-stay segments per booking (source of truth for billing after transfers) |

## Migrations

Migration files are in `migrations/`, numbered sequentially (forward-only). To apply:

```bash
mysql -u root -p hotel_db < migrations/001_initial.sql
```

## Backup

Backups are stored in `backup/`. Use the Admin API endpoint `POST /api/backup` to create a backup, or manually:

```bash
mysqldump -u root -p hotel_db > backup/hotel_db_$(date +%Y%m%d).sql
```
