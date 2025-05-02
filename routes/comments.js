import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import redisClient from '../redis.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // Добавлено

const router = express.Router();

// Получение __dirname в ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проверка и создание папки uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.chmodSync(UploadsDir, 0o755);
}

// Настройка multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Недопустимый тип файла'));
        }
    },
});

// Получить все комментарии
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const [rows] = await pool.query(
            'SELECT id, articleId, userId, userName, text, parentId, files, createdAt FROM comments ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );
        res.set('Cache-Control', 'public, max-age=60');
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении комментариев:', err);
        res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
});

// Получить комментарии для статьи
router.get('/:articleId', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const cacheKey = `comments:${req.params.articleId}:${page}:${limit}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }
        const [rows] = await pool.query(
            'SELECT id, userId, userName, text, parentId, files, createdAt FROM comments WHERE articleId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [req.params.articleId, parseInt(limit), parseInt(offset)]
        );
        const [total] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE articleId = ?', [req.params.articleId]);
        const response = { comments: rows, total: total[0].count };
        await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
        res.set('Cache-Control', 'public, max-age=60');
        res.json(response);
    } catch (err) {
        console.error('Ошибка при получении комментариев для статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
});

// Добавить комментарий
router.post('/', upload.array('files', 5), [
    body('articleId').notEmpty().isUUID().custom(async (value) => {
        const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [value]);
        if (rows.length === 0) {
            throw new Error('Статья не найдена');
        }
        return true;
    }),
    body('userId').notEmpty().isUUID(),
    body('userName').notEmpty().isString(),
    body('text').notEmpty().isString(),
    body('parentId').optional().isUUID().custom(async (value, { req }) => {
        if (value) {
            const [rows] = await pool.query('SELECT id FROM comments WHERE id = ? AND articleId = ?', [value, req.body.articleId]);
            if (rows.length === 0) {
                throw new Error('Родительский комментарий не найден или не относится к этой статье');
            }
        }
        return true;
    }),
], async (req, res) => {
    console.log('POST /api/comments received:', req.body, 'Files:', req.files);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { articleId, userId, userName, text, parentId } = req.body;
        const files = req.files ? req.files.map((file) => `/uploads/${file.filename}`) : [];
        console.log('Saving comment:', { articleId, userId, userName, text, parentId, files });
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        await pool.query(
            'INSERT INTO comments (id, articleId, userId, userName, text, parentId, files, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, articleId, userId, userName, text, parentId || null, JSON.stringify(files), createdAt]
        );
        await redisClient.del(`comments:${articleId}:*`);
        if (parentId) {
            const [parent] = await pool.query('SELECT articleId FROM comments WHERE id = ?', [parentId]);
            if (parent.length) {
                await redisClient.del(`comments:${parent[0].articleId}:*`);
            }
        }
        res.status(201).json({
            id,
            articleId,
            userId,
            userName,
            text,
            parentId: parentId || null,
            files,
            createdAt,
        });
    } catch (err) {
        console.error('Ошибка при добавлении комментария:', err);
        res.status(400).json({ message: 'Ошибка при добавлении комментария', error: err.message });
    }
});

// Удалить комментарий
router.delete('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT articleId FROM comments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            console.warn(`Comment not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Комментарий не найден' });
        }
        const [childComments] = await pool.query('SELECT id FROM comments WHERE parentId = ?', [req.params.id]);
        console.log(`Deleting comment: ${req.params.id}, child comments: ${childComments.map(c => c.id).join(', ') || 'none'}`);
        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        await redisClient.del(`comments:${rows[0].articleId}:*`);
        res.json({ message: 'Комментарий успешно удалён' });
    } catch (err) {
        console.error('Ошибка при удалении комментария:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении комментария', error: err.message });
    }
});

export default router;