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
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Добавить комментарий
router.post('/', async (req, res) => {
    try {
        const { articleId, userId, userName, text } = req.body;
        const id = uuidv4();
        const createdAt = new Date();
        await pool.query(
            'INSERT INTO comments (id, articleId, userId, userName, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, articleId, userId, userName, text, createdAt]
        );
        res.status(201).json({ id, articleId, userId, userName, text, createdAt });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить комментарий
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
        res.json({ message: 'Комментарий удалён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;
