import { nguoiDungRepository } from '../repositories/nguoiDung.repository.js';
import { hashPassword } from '../utils/bcrypt.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';

export const staffService = {
  async list({ page, limit, offset, vai_tro }) {
    return nguoiDungRepository.findAll({ page, limit, offset, vai_tro });
  },

  async getById(id) {
    const user = await nguoiDungRepository.findById(id);
    if (!user) throw createError('NOT_FOUND');
    return user;
  },

  async create(data, actor) {
    if (await nguoiDungRepository.emailExists(data.email)) {
      throw createError('DUPLICATE_EMAIL');
    }
    const mat_khau_hash = await hashPassword(data.password);
    const user = await nguoiDungRepository.insert({
      ho_ten: data.ho_ten,
      email: data.email,
      mat_khau_hash,
      vai_tro: data.vai_tro,
    });
    await auditLogService.log(actor, 'create_staff', `Tạo nhân viên: ${data.ho_ten} (${data.vai_tro})`);
    const { mat_khau_hash: ignored, ...safe } = user;
    return safe;
  },

  async update(id, data, actor) {
    if (data.email && await nguoiDungRepository.emailExists(data.email, id)) {
      throw createError('DUPLICATE_EMAIL');
    }
    const success = await nguoiDungRepository.update(id, data);
    if (!success) throw createError('NOT_FOUND');
    await auditLogService.log(actor, 'update_staff', `Cập nhật nhân viên ID ${id}`);
    return { success: true };
  },

  async lock(id, actor) {
    if (!await nguoiDungRepository.update(id, { trang_thai: 'Locked' })) throw createError('NOT_FOUND');
    await auditLogService.log(actor, 'lock_staff', `Khóa nhân viên ID ${id}`);
    return { success: true };
  },

  async unlock(id, actor) {
    if (!await nguoiDungRepository.update(id, { trang_thai: 'Active', so_lan_sai: 0 })) throw createError('NOT_FOUND');
    await auditLogService.log(actor, 'unlock_staff', `Mở khóa nhân viên ID ${id}`);
    return { success: true };
  },

  async remove(id, actor) {
    const success = await nguoiDungRepository.remove(id);
    if (!success) throw createError('NOT_FOUND');
    await auditLogService.log(actor, 'delete_staff', `Xóa nhân viên ID ${id}`);
    return { success: true };
  },
};
