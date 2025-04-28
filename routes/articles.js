// routes/articles.js
import express from 'express';
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить все статьи
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM articles ORDER BY createdat DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Получить одну статью
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM articles WHERE id = $1', [req.params.id]);
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Создать или обновить статью
router.post('/', async (req, res) => {
    try {
        const { id, title, content, categoryId, image, author, createdAt } = req.body;
        const existing = await pool.query('SELECT id FROM articles WHERE id = $1', [id]);
        if (existing.rows.length > 0) {
            await pool.query(
                'UPDATE articles SET title=$1, content=$2, categoryid=$3, image=$4, author=$5, createdat=$6 WHERE id=$7',
                [title, content, categoryId, image, author, createdAt, id]
            );
        } else {
            await pool.query(
                'INSERT INTO articles (id, title, content, categoryid, image, author, createdat) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [id, title, content, categoryId, image, author, createdAt]
            );
        }
        res.send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Удалить статью
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
        res.send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

export default router;
