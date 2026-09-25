import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_db',
  connectionLimit: 10,
  waitForConnections: true,
  charset: 'utf8mb4',
  timezone: '+07:00',
});

pool.on('error', (err) => {
  logger.error('MySQL pool error:', err);
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function getConnection() {
  return pool.getConnection();
}

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connected successfully');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error;
  }
}

export { pool };
