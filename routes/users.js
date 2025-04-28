import express from 'express';
import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Получить всех пользователей
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, name, email, role FROM users');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Добавить пользователя
router.post('/', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const id = uuidv4();
        await pool.query(
            'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
            [id, name, email, password, role]
        );
        res.status(201).json({ id, name, email, role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить роль пользователя
router.put('/:id', async (req, res) => {
    try {
        const { role } = req.body;
        await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2',
            [role, req.params.id]
        );
        res.json({ message: 'Роль обновлена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить пользователя
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'Пользователь удалён' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;
