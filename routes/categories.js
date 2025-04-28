// routes/users.js
import express from 'express';
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить всех пользователей
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, name, email, role FROM users');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Создать пользователя
router.post('/', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const id = uuidv4();
        await pool.query(
            'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
            [id, name, email, password, role]
        );
        res.send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Удалить пользователя
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

export default router;
