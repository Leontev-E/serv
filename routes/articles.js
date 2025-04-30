import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { body, param, query, validationResult } from 'express-validator';

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
    body('createdAt').isISO8601().toDate().withMessage('Неверный формат даты'),
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Неверный формат ID категории')
        .custom(async (value) => {
            if (value) {
                const [rows] = await pool.query('SELECT id FROM categories WHERE id = ?', [value]);
                if (rows.length === 0) {
                    throw new Error('Категория не найдена');
                }
            }
            return true;
        }),
    body('image').optional().isURL().withMessage('Неверный формат URL изображения'),
];

// Валидация для PUT /articles/:id
const validateUpdateArticle = [
    param('id').isUUID().withMessage('Неверный формат ID статьи'),
    body('title').trim().notEmpty().withMessage('Заголовок обязателен'),
    body('content').trim().notEmpty().withMessage('Содержимое обязательно'),
    body('author').trim().notEmpty().withMessage('Автор обязателен'),
    body('createdAt').isISO8601().toDate().withMessage('Неверный формат даты'),
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Неверный формат ID категории')
        .custom(async (value) => {
            if (value) {
                const [rows] = await pool.query('SELECT id FROM categories WHERE id = ?', [value]);
                if (rows.length === 0) {
                    throw new Error('Категория не найдена');
                }
            }
            return true;
        }),
    body('image').optional().isURL().withMessage('Неверный формат URL изображения'),
];

// Валидация для DELETE /articles/:id
const validateDeleteArticle = [
    param('id').isUUID().withMessage('Неверный формат ID статьи'),
];

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Ошибка валидации', errors: errors.array() });
    }
    next();
};

// Получить все статьи с пагинацией и поиском
router.get('/', validateGetArticles, handleValidationErrors, async (req, res) => {
    try {
        const { page = 1, limit = 10, q = '' } = req.query;
        const offset = (page - 1) * limit;
        const searchQuery = q ? `%${q}%` : '%';

        const [rows] = await pool.query(
            `SELECT id, title, content, categoryId, author, createdAt, image
       FROM articles
       WHERE title LIKE ? OR content LIKE ?
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
            [searchQuery, searchQuery, parseInt(limit), parseInt(offset)]
        );

        res.set('Cache-Control', 'public, max-age=300');
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении статей:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении статей' });
    }
});

// Получить статью по ID
router.get('/:id', validateGetArticleById, handleValidationErrors, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Статья не найдена' });
        }
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
        categoryId = categoryId || null;
        image = image || null;

        await pool.query(
            'INSERT INTO articles (id, title, content, categoryId, author, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, categoryId, author, createdAt, image]
        );

        res.status(201).json({ message: 'Статья успешно создана', id });
    } catch (err) {
        console.error('Ошибка при создании статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании статьи' });
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

        await pool.query(
            'UPDATE articles SET title = ?, content = ?, categoryId = ?, author = ?, createdAt = ?, image = ? WHERE id = ?',
            [title, content, categoryId || null, author, createdAt, image || null, req.params.id]
        );

        res.json({ message: 'Статья успешно обновлена' });
    } catch (err) {
        console.error('Ошибка при обновлении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении статьи' });
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
        res.json({ message: 'Статья успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении статьи' });
    }
});

export default router;