import { dichVuRepository } from '../repositories/dichVu.repository.js';
import { createError } from '../utils/errors.js';

export const serviceService = {
  async list(params) { return dichVuRepository.findAll(params); },
  async listActive() { return dichVuRepository.findActive(); },
  async getById(id) { const s = await dichVuRepository.findById(id); if (!s) throw createError('NOT_FOUND'); return s; },
  async create(data) { return dichVuRepository.insert(data); },
  async update(id, data) { const ok = await dichVuRepository.update(id, data); if (!ok) throw createError('NOT_FOUND'); return { success: true }; },
  async updateStatus(id, trangThai) { return dichVuRepository.updateStatus(id, trangThai); },
  async remove(id) { if (await dichVuRepository.isUsedInBookings(id)) throw createError('USED_IN_BOOKINGS'); return dichVuRepository.remove(id); },
};
