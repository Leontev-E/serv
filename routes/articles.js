import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { body, param, query, validationResult } from 'express-validator';
import redisClient from '../redis.js';

const router = express.Router();

// Валидация для GET /articles
const validateGetArticles = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('q').optional().trim().escape(),
];

// Валидация для GET /articles/:id
const validateGetArticleById = [
    param('id').isUUID().withMessage('Неверный формат ID статьи'),
];

// Валидация для POST /articles
const validateCreateArticle = [
    body('title').trim().notEmpty().withMessage('Заголовок обязателен'),
    body('content').trim().notEmpty().withMessage('Содержимое обязательно'),
    body('author').trim().notEmpty().withMessage('Автор обязателен'),
    body('createdAt')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Неверный формат даты'),
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Неверный формат ID категории')
        .custom(async (value) => {
            if (value) {
                try {
                    const [rows] = await pool.query('SELECT id FROM categories WHERE id = ?', [value]);
                    console.log('Category check:', { categoryId: value, found: rows.length > 0 });
                    if (rows.length === 0) {
                        throw new Error('Категория не найдена');
                    }
                } catch (err) {
                    console.error('Error querying categories:', err);
                    throw new Error('Ошибка проверки категории');
                }
            }
            return true;
        }),
    body('image')
        .optional({ nullable: true })
        .custom((value) => {
            if (value === null || value === undefined) return true;
            if (typeof value !== 'string') return false;
            return /^(https?:\/\/[^\s$.?#].[^\s]*)$/.test(value);
        })
        .withMessage('Неверный формат URL изображения'),
];

// Валидация для PUT /articles/:id
const validateUpdateArticle = [
    param('id').isUUID().withMessage('Неверный формат ID статьи'),
    body('title').trim().notEmpty().withMessage('Заголовок обязателен'),
    body('content').trim().notEmpty().withMessage('Содержимое обязательно'),
    body('author').trim().notEmpty().withMessage('Автор обязателен'),
    body('createdAt')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Неверный формат даты'),
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Неверный формат ID категории')
        .custom(async (value) => {
            if (value) {
                try {
                    const [rows] = await pool.query('SELECT id FROM categories WHERE id = ?', [value]);
                    console.log('Category check:', { categoryId: value, found: rows.length > 0 });
                    if (rows.length === 0) {
                        throw new Error('Категория не найдена');
                    }
                } catch (err) {
                    console.error('Error querying categories:', err);
                    throw new Error('Ошибка проверки категории');
                }
            }
            return true;
        }),
    body('image')
        .optional({ nullable: true })
        .custom((value) => {
            if (value === null || value === undefined) return true;
            if (typeof value !== 'string') return false;
            return /^(https?:\/\/[^\s$.?#].[^\s]*)$/.test(value);
        })
        .withMessage('Неверный формат URL изображения'),
];

// Валидация для DELETE /articles/:id
const validateDeleteArticle = [
    param('id').isUUID().withMessage('Неверный формат ID статьи'),
];

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ message: 'Ошибка валидации', errors: errors.array() });
    }
    next();
};

// Получить все статьи с пагинацией и поиском
router.get('/', validateGetArticles, handleValidationErrors, async (req, res) => {
    try {
        const { page = 1, limit = 10, q = '' } = req.query;
        const offset = (page - 1) * limit;
        const cacheKey = `articles:${page}:${limit}:${q}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            console.log('Serving from cache:', cacheKey);
            return res.json(JSON.parse(cached));
        }

        const searchQuery = q ? `%${q}%` : '%';
        const [rows] = await pool.query(
            `SELECT id, title, content, categoryId, author, createdAt, image
             FROM articles
             WHERE title LIKE ? OR content LIKE ?
             ORDER BY createdAt DESC
             LIMIT ? OFFSET ?`,
            [searchQuery, searchQuery, parseInt(limit), parseInt(offset)]
        );

        const [total] = await pool.query(
            `SELECT COUNT(*) as count FROM articles
             WHERE title LIKE ? OR content LIKE ?`,
            [searchQuery, searchQuery]
        );

        const response = { articles: rows, total: total[0].count };
        await redisClient.setEx(cacheKey, 300, JSON.stringify(response));
        res.set('Cache-Control', 'public, max-age=300');
        res.json(response);
    } catch (err) {
        console.error('Ошибка при получении статей:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении статей' });
    }
});

// Получить статью по ID
router.get('/:id', validateGetArticleById, handleValidationErrors, async (req, res) => {
    try {
        const cacheKey = `article:${req.params.id}`;
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            console.log('Serving from cache:', cacheKey);
            return res.json(JSON.parse(cached));
        }

        const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Статья не найдена' });
        }

        await redisClient.setEx(cacheKey, 300, JSON.stringify(rows[0]));
        res.set('Cache-Control', 'public, max-age=300');
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка при получении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении статьи' });
    }
});

// Создать статью
router.post('/', validateCreateArticle, handleValidationErrors, async (req, res) => {
    try {
        let { id, title, content, categoryId, author, createdAt, image } = req.body;

        id = id || uuidv4();
        createdAt = createdAt || new Date().toISOString();
        categoryId = categoryId || null;
        image = image || null;

        console.log('Creating article:', { id, title, categoryId, author, createdAt, image });

        await pool.query(
            'INSERT INTO articles (id, title, content, categoryId, author, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, categoryId, author, createdAt, image]
        );

        // Инвалидировать кэш
        await redisClient.del('articles:*');

        res.status(201).json({ id, title, content, categoryId, author, createdAt, image });
    } catch (err) {
        console.error('Ошибка при создании статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании статьи', error: err.message });
    }
});

// Обновить статью
router.put('/:id', validateUpdateArticle, handleValidationErrors, async (req, res) => {
    try {
        const { title, content, categoryId, author, createdAt, image } = req.body;

        const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Статья не найдена' });
        }

        console.log('Updating article:', { id: req.params.id, title, categoryId, author, createdAt, image });

        await pool.query(
            'UPDATE articles SET title = ?, content = ?, categoryId = ?, author = ?, createdAt = ?, image = ? WHERE id = ?',
            [title, content, categoryId || null, author, createdAt || new Date().toISOString(), image || null, req.params.id]
        );

        // Инвалидировать кэш
        await redisClient.del('articles:*');
        await redisClient.del(`article:${req.params.id}`);

        res.json({ id: req.params.id, title, content, categoryId, author, createdAt, image });
    } catch (err) {
        console.error('Ошибка при обновлении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении статьи', error: err.message });
    }
});

// Удалить статью
router.delete('/:id', validateDeleteArticle, handleValidationErrors, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Статья не найдена' });
        }

        await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);

        // Инвалидировать кэш
        await redisClient.del('articles:*');
        await redisClient.del(`article:${req.params.id}`);

        res.json({ message: 'Статья успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении статьи', error: err.message });
    }
});

export default router;