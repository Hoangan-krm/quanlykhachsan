# Database Migrations

Migration files are numbered sequentially (forward-only). Each file represents an irreversible schema change.

## Convention

- File naming: `NNN_description.sql` (e.g., `001_initial.sql`, `002_add_column.sql`)
- Always forward-only — no down/reverse migrations
- Apply in order: `mysql -u root -p hotel_db < migrations/NNN_description.sql`
- Never edit a previously-applied migration

## Available Migrations

| File | Description |
|------|-------------|
| `001_initial.sql` | Initial schema — 14 core tables, constraints, indexes |
| `002_auth_config.sql` | Token tables (`AUTH_REVOKED_TOKEN`, `PASSWORD_RESET`), invoice template config |
| `003_booking_accounting.sql` | Booking accounting: guest count/source, deposit-refund columns, `LICH_SU_PHONG`, payment staff/shift attribution |
| `004_website_accounting.sql` | Customer portal: email verification + lockout (`XAC_THUC_KHACH`), chat tables, promo validity windows, one-review-per-booking, room-type capacity, refund approval threshold |

`schema.sql` is always the full current schema (fresh installs); migrations are for
existing databases. Keep both in sync when changing the schema.
