import express from 'express';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить все статьи
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM articles');
        res.json(rows);
    } catch (err) {
        console.error('Ошибка при получении статей:', err);
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

        // Отвечаем сразу, не дожидаясь записи
        res.status(202).json({ message: 'Статья отправлена на сохранение', id });

        // Фон: вставка в базу
        await pool.query(
            'INSERT INTO articles (id, title, content, categoryId, author, createdAt, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, categoryId, author, createdAt, image]
        );

        console.log(`Статья ${id} успешно записана в базу`);

    } catch (err) {
        console.error('Ошибка при создании статьи:', err);
        // Ничего не отправляем обратно, так как клиент уже получил ответ
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
