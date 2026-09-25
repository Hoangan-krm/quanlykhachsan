import { auditLogService } from '../services/auditLogService.js';

export function audit(req, action, detail) {
  const user = req.user || {};
  return auditLogService.log(user.ho_ten || user.email || 'Unknown', action, detail);
}
