# QuanLyKhachSan — Hệ thống quản lý khách sạn

Hệ thống web quản lý khách sạn: quản lý phòng, đặt phòng, check-in/check-out,
hóa đơn & thanh toán (bao gồm thanh toán online), dịch vụ, ca làm việc, báo cáo,
website đặt phòng cho khách hàng, chat hỗ trợ và phân quyền 4 vai trò.

**Kiến trúc**: Express REST API (`backend/`) + Vanilla JS SPA (`frontend/`) + MySQL 8.
`backend/` đồng thời serve `frontend/` như static files — chỉ cần chạy một process.

## Cấu trúc

```
backend/     REST API (routes → controllers → services → repositories → MySQL)
             validators (zod) · middleware (JWT auth, rate limit, XSS sanitize)
frontend/    SPA khách hàng + portal nhân viên (vanilla ES modules, hash router)
database/    schema.sql (full schema) · seed.sql (dữ liệu mẫu) · migrations/ (tăng dần)
docs/        Product backlog (source of truth), báo cáo nghiệm thu
```

## Chạy nhanh (dev)

```bash
# Cách 1: MySQL thật đã cài schema + seed
cd backend
npm install
cp .env.example .env    # điền DB_PASSWORD
npm run dev             # http://localhost:3000

# Cách 2: MySQL in-memory (không cần cài MySQL)
cd backend
node scripts/dev-with-memory-db.js
```

## Tài khoản seed

| Vai trò          | Email               | Mật khẩu   |
| ---------------- | ------------------- | ---------- |
| Admin            | admin@hoangan.vn    | admin123   |
| Quản lý          | manager@hoangan.vn  | manager123 |
| Lễ tân           | letan01@hoangan.vn  | letan123   |
| Khách hàng (web) | an.nguyen@email.com | khach123   |

## Test

```bash
cd backend
npm test        # Jest + mysql-memory-server: API thật, DB thật, không mock DB
```

## Nghiệp vụ chính

- **Đặt phòng**: tìm phòng trống theo khoảng ngày (chống overlap bằng row lock),
  cọc, hủy, no-show (chính sách giữ/hoàn cọc theo cấu hình), đổi phòng (tách
  segment lịch sử ở), gia hạn + phụ phí trả trễ tự động.
- **Hóa đơn**: tiền phòng tính theo `LICH_SU_PHONG` (đúng sau khi đổi phòng),
  VAT theo cấu hình, khuyến mãi theo hạn dùng, cọc trừ vào tổng.
- **Thanh toán**: nhiều lần, không cho vượt số phải thu; hoàn tiền có lý do,
  trên ngưỡng cấu hình cần Quản lý duyệt; tiền mặt gắn ca để đối soát.
- **Website khách hàng**: đặt phòng (kể cả không cần tài khoản), xác thực email,
  thanh toán online Stripe, mã khuyến mãi, đánh giá sau lưu trú (mặc định chờ
  duyệt), chat hỗ trợ, sửa/hủy trước giờ nhận phòng 24h.
- **Bảo mật**: JWT + thu hồi token khi logout, bcrypt(12), khóa tài khoản sau
  5 lần sai, rate limit, phân quyền theo vai trò ở cả router lẫn API, audit log.
