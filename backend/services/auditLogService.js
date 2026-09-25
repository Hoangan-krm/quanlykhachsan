import { nhatKyRepository } from '../repositories/nhatKy.repository.js';

export const auditLogService = {
  async log(user, action, detail) {
    const userName = typeof user === 'string' ? user : (user?.ho_ten || user?.email || 'Unknown');
    return nhatKyRepository.add({ nguoi_dung: userName, hanh_dong: action, chi_tiet: detail });
  },

  async list(filters) {
    return nhatKyRepository.findAll(filters);
  },
};
