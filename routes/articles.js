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
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Статья не найдена' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать новую статью
router.post('/', async (req, res) => {
    try {
        const { id, title, content, categoryId, author, createdAt, image } = req.body;
        await pool.query(
            'INSERT INTO articles (id, title, content, categoryId, author, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, categoryId, author, createdAt, image]
        );
        res.status(201).json({ message: 'Статья создана' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// ✨ Добавляем Редактирование статьи
router.put('/:id', async (req, res) => {
    try {
        const { title, content, categoryId, image } = req.body;
        await pool.query(
            'UPDATE articles SET title = ?, content = ?, categoryId = ?, image = ? WHERE id = ?',
            [title, content, categoryId, image, req.params.id]
        );
        res.json({ message: 'Статья обновлена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка обновления статьи' });
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
