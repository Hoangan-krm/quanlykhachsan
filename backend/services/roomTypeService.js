import { loaiPhongRepository } from '../repositories/loaiPhong.repository.js';
import { createError } from '../utils/errors.js';

export const roomTypeService = {
  async list() { return loaiPhongRepository.findAll(); },
  async getById(id) {
    const rt = await loaiPhongRepository.findById(id);
    if (!rt) throw createError('NOT_FOUND');
    return rt;
  },
  async create(data) { return loaiPhongRepository.insert(data); },
  async update(id, data) {
    const success = await loaiPhongRepository.update(id, data);
    if (!success) throw createError('NOT_FOUND');
    return { success: true };
  },
  async remove(id) {
    if (await loaiPhongRepository.hasRooms(id)) throw createError('HAS_ROOMS');
    return loaiPhongRepository.remove(id);
  },
};
