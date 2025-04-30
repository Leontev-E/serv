import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Получить все статьи
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const [rows] = await pool.query(
            'SELECT id, title, author, createdAt FROM articles ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [parseInt(limit), parseInt(offset)]
        );
        res.set('Cache-Control', 'public, max-age=300'); // Кэш на 5 минут
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении статей:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Статья не найдена' });
        }
        res.set('Cache-Control', 'public, max-age=300'); // Кэш на 5 минут
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка при получении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать статью
router.post('/', async (req, res) => {
    try {
        let { id, title, content, categoryId, author, createdAt, image } = req.body;

        if (!id) {
            id = uuidv4();
        }

        if (!title || !content || !author || !createdAt) {
            return res.status(400).json({ message: 'Не все обязательные поля заполнены' });
        }

        // Если нет категории — записать NULL
        if (!categoryId) {
            categoryId = null;
        }

        // Если нет изображения — записать NULL
        if (!image) {
            image = null;
        }

        await pool.query(
            'INSERT INTO articles (id, title, content, categoryId, author, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, categoryId, author, createdAt, image]
        );

        res.status(201).json({ message: 'Статья успешно опубликована', id });
    } catch (err) {
        console.error('Ошибка при создании статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при публикации статьи' });
    }
});

// Обновить статью
router.put('/:id', async (req, res) => {
    try {
        const { title, content, categoryId, author, createdAt, image } = req.body;

        await pool.query(
            'UPDATE articles SET title = ?, content = ?, categoryId = ?, author = ?, createdAt = ?, image = ? WHERE id = ?',
            [title, content, categoryId, author, createdAt, image, req.params.id]
        );

        res.json({ message: 'Статья успешно обновлена' });
    } catch (err) {
        console.error('Ошибка при обновлении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении статьи' });
    }
});

// Удалить статью
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ message: 'Статья успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении статьи' });
    }
});

export default router;
