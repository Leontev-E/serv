// routes/comments.js
import express from 'express';
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить все комментарии
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM comments ORDER BY createdat DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Создать комментарий
router.post('/', async (req, res) => {
    try {
        const { articleId, userId, userName, text, createdAt } = req.body;
        const id = uuidv4();
        await pool.query(
            'INSERT INTO comments (id, articleid, userid, username, text, createdat) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, articleId, userId, userName, text, createdAt]
        );
        res.json({ id, articleId, userId, userName, text, createdAt });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Удалить комментарий
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
        res.send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

export default router;
