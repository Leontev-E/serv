import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import redisClient from '../redis.js';

const router = express.Router();

// Получить сервисы
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;
        const cacheKey = `services:${page}:${limit}:${search}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        let query = `
      SELECT s.id, s.title, s.url, s.description, s.categoryId, s.createdAt, c.name as categoryName
      FROM useful_services s
      LEFT JOIN service_categories c ON s.categoryId = c.id
    `;
        const params = [];
        if (search) {
            query += ' WHERE s.title LIKE ? OR s.description LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY s.createdAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        const [services] = await pool.query(query, params);
        const [total] = await pool.query(
            `SELECT COUNT(*) as count FROM useful_services` + (search ? ' WHERE title LIKE ? OR description LIKE ?' : ''),
            search ? [`%${search}%`, `%${search}%`] : []
        );
        const response = { services, total: total[0].count };
        await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
        res.set('Cache-Control', 'public, max-age=300');
        res.json(response);
    } catch (err) {
        console.error('Ошибка при получении сервисов:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить категории
router.get('/service-categories', async (req, res) => {
    try {
        const cacheKey = 'service-categories';
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const [categories] = await pool.query('SELECT id, name FROM service_categories ORDER BY name');
        await redisClient.setEx(cacheKey, 300, JSON.stringify(categories));
        res.set('Cache-Control', 'public, max-age=300');
        res.json(categories);
    } catch (err) {
        console.error('Ошибка при получении категорий:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать сервис
router.post('/', [
    body('title').notEmpty().isString().trim().withMessage('Название обязательно'),
    body('url').notEmpty().isURL().withMessage('Некорректная ссылка'),
    body('description').optional().isString().trim(),
    body('categoryId').optional().isUUID().withMessage('Некорректный ID категории'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { title, url, description, categoryId } = req.body;
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        await pool.query(
            'INSERT INTO useful_services (id, title, url, description, categoryId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, title, url, description || null, categoryId || null, createdAt]
        );
        await redisClient.del('services:*');
        res.status(201).json({ id, title, url, description, categoryId, createdAt });
    } catch (err) {
        console.error('Ошибка при создании сервиса:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить сервис
router.put('/:id', [
    body('title').notEmpty().isString().trim().withMessage('Название обязательно'),
    body('url').notEmpty().isURL().withMessage('Некорректная ссылка'),
    body('description').optional().isString().trim(),
    body('categoryId').optional().isUUID().withMessage('Некорректный ID категории'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { title, url, description, categoryId } = req.body;
        const [rows] = await pool.query('SELECT id FROM useful_services WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Сервис не найден' });
        }
        await pool.query(
            'UPDATE useful_services SET title = ?, url = ?, description = ?, categoryId = ? WHERE id = ?',
            [title, url, description || null, categoryId || null, req.params.id]
        );
        await redisClient.del('services:*');
        res.json({ id: req.params.id, title, url, description, categoryId });
    } catch (err) {
        console.error('Ошибка при обновлении сервиса:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить сервис
router.delete('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id FROM useful_services WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Сервис не найден' });
        }
        await pool.query('DELETE FROM useful_services WHERE id = ?', [req.params.id]);
        await redisClient.del('services:*');
        res.json({ message: 'Сервис удалён' });
    } catch (err) {
        console.error('Ошибка при удалении сервиса:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;