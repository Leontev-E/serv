import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить все статьи
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM articles ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить статью по ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        res.json(rows[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Добавить или обновить статью
router.post('/', async (req, res) => {
    try {
        const { id, title, content, categoryId, author, createdAt, image } = req.body;

        const [existing] = await pool.query('SELECT id FROM articles WHERE id = ?', [id]);
        if (existing.length > 0) {
            // Обновить статью
            await pool.query(
                'UPDATE articles SET title = ?, content = ?, categoryId = ?, author = ?, createdAt = ?, image = ? WHERE id = ?',
                [title, content, categoryId, author, createdAt, image, id]
            );
            res.json({ message: 'Статья обновлена' });
        } else {
            // Добавить новую статью
            await pool.query(
                'INSERT INTO articles (id, title, content, categoryId, author, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, title, content, categoryId, author, createdAt, image]
            );
            res.status(201).json({ id });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить статью
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ message: 'Статья удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;
