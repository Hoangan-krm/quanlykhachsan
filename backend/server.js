import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { testConnection } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { logger } from './utils/logger.js';
import routes from './routes/index.js';
import { onlinePaymentService } from './services/onlinePaymentService.js';
import { backupService } from './services/backupService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
// origin:true phản chiếu Origin của request; '*' không hợp lệ khi credentials:true.
const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? false : true);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
  try {
    await onlinePaymentService.webhook(req.body, req.headers['stripe-signature']);
    res.json({ received: true });
  } catch (error) { next(error); }
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', apiLimiter);

app.use('/api', routes);

// Static hosting — 2 ngữ cảnh UI tách biệt (đúng yêu cầu kiến trúc):
//   /        → Website khách hàng (baseline UI: root index.html + src/)
//   /portal  → Portal nhân viên (SPA frontend/, hash router có role guard)
const projectRoot = path.join(__dirname, '..');
const customerSrcPath = path.join(projectRoot, 'src');
const portalPath = path.join(projectRoot, 'frontend');

app.use('/src', express.static(customerSrcPath));
app.use('/portal', express.static(portalPath));

// Website khách hàng tại "/"; portal nhân viên tại "/portal" và "/portal/".
app.get('/portal', (req, res, next) => res.redirect('/portal/'));
app.get('/portal/', (req, res) => {
  res.sendFile(path.join(portalPath, 'index.html'), (err) => { if (err) next(); });
});
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'), (err) => { if (err) next(); });
});

// Các đường không xác định (không phải /api) → về trang chủ khách hàng.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.redirect('/');
});

app.use(notFound);
app.use(errorHandler);

export async function startServer() {
  await testConnection();
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
  // Run automatic daily snapshots in the server process. The interval is configurable
  // for operations/testing, while the production default is 24 hours.
  if (process.env.AUTO_BACKUP_ENABLED !== 'false') {
    const intervalMs = Number(process.env.BACKUP_INTERVAL_MS || 24 * 60 * 60 * 1000);
    if (Number.isFinite(intervalMs) && intervalMs > 0) {
      const timer = setInterval(() => {
        backupService.backup().catch(error => logger.error('Automatic backup failed:', error.message));
      }, intervalMs);
      timer.unref?.();
    }
  }
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch(error => {
    logger.error('Failed to start server:', error.message);
    process.exitCode = 1;
  });
}

export default app;
