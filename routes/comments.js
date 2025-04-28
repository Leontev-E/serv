import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить все комментарии
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comments');
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении комментариев:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить комментарии для статьи
router.get('/:articleId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comments WHERE articleId = ?', [req.params.articleId]);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении комментариев для статьи:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Добавить комментарий
router.post('/', async (req, res) => {
    try {
        const { articleId, userId, userName, text } = req.body;

        if (!articleId || !userId || !userName || !text) {
            return res.status(400).json({ message: 'Не все обязательные поля заполнены' });
        }

        const id = uuidv4();
        const createdAt = new Date().toISOString();

        await pool.query(
            'INSERT INTO comments (id, articleId, userId, userName, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, articleId, userId, userName, text, createdAt]
        );

        res.status(201).json({
            id,
            articleId,
            userId,
            userName,
            text,
            createdAt
        });
    } catch (err) {
        console.error('Ошибка при добавлении комментария:', err);
        res.status(500).json({ message: 'Ошибка сервера при добавлении комментария' });
    }
});

// Удалить комментарий
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Комментарий успешно удалён' });
    } catch (err) {
        console.error('Ошибка при удалении комментария:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении комментария' });
    }
});

export default router;
