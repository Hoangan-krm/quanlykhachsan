import { phongRepository } from '../repositories/phong.repository.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';
import { loaiPhongRepository } from '../repositories/loaiPhong.repository.js';
import { assertRoomTransition } from './stateMachine.js';

export const roomService = {
  async list({ trang_thai, loai_phong_id, page, limit, offset }) {
    return phongRepository.findAll({ trang_thai, loai_phong_id, page, limit, offset });
  },

  async getById(id) {
    const room = await phongRepository.findById(id);
    if (!room) throw createError('NOT_FOUND');
    return room;
  },

  async findVacant(checkIn, checkOut, roomTypeId, guests) {
    return phongRepository.findVacant(checkIn, checkOut, roomTypeId, guests);
  },

  async create(data, user) {
    if (!await loaiPhongRepository.findById(data.loai_phong_id)) throw createError('VALIDATION_ERROR', { message: 'Loại phòng không tồn tại' });
    if (await phongRepository.findBySoPhong(data.so_phong)) {
      throw createError('DUPLICATE_ROOM_NUMBER');
    }
    const room = await phongRepository.insert({ ...data, trang_thai: 'Trong' });
    await auditLogService.log(user, 'create_room', `Tạo phòng ${data.so_phong}`);
    return room;
  },

  async update(id, data, user) {
    if (data.loai_phong_id && !await loaiPhongRepository.findById(data.loai_phong_id)) throw createError('VALIDATION_ERROR', { message: 'Loại phòng không tồn tại' });
    if (data.so_phong) {
      const existing = await phongRepository.findBySoPhong(data.so_phong);
      if (existing && existing.id !== parseInt(id, 10)) {
        throw createError('DUPLICATE_ROOM_NUMBER');
      }
    }
    const success = await phongRepository.update(id, data);
    if (!success) throw createError('NOT_FOUND');
    await auditLogService.log(user, 'update_room', `Cập nhật phòng ID ${id}`);
    return { success: true };
  },

  async updateStatus(id, newStatus, user) {
    const room = await phongRepository.findById(id);
    if (!room) throw createError('NOT_FOUND');
    assertRoomTransition(room.trang_thai, newStatus);
    await phongRepository.updateStatus(id, newStatus);
    await auditLogService.log(user, 'update_room_status', `Phòng ${room.so_phong}: ${room.trang_thai} → ${newStatus}`);
    return { success: true };
  },

  async markMaintenance(id, user) {
    return this.updateStatus(id, 'BaoTri', user);
  },

  async markCleaned(id, user) {
    const room = await phongRepository.findById(id);
    if (!room) throw createError('NOT_FOUND');
    if (room.trang_thai !== 'DangDon') {
      throw createError('INVALID_STATUS_TRANSITION', {
        details: { current: room.trang_thai, requested: 'Trong', allowed: ['DangDon'] }
      });
    }
    await phongRepository.updateStatus(id, 'Trong');
    await auditLogService.log(user, 'room_cleaned', `Phòng ${room.so_phong}: DangDon → Trong`);
    return { success: true };
  },

  async remove(id, user) {
    if (await phongRepository.hasActiveBooking(id)) {
      throw createError('HAS_ACTIVE_BOOKING');
    }
    const success = await phongRepository.remove(id);
    if (!success) throw createError('NOT_FOUND');
    await auditLogService.log(user, 'delete_room', `Xóa phòng ID ${id}`);
    return { success: true };
  },
};
