import express from 'express';
import pool from '../db.js';
import { query } from 'express-validator';

const router = express.Router();

// Получить все апрувы
router.get(
    '/',
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('start_date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
        query('end_date').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
    ],
    async (req, res) => {
        try {
            const { page = 1, limit = 50, start_date, end_date } = req.query;
            const offset = (page - 1) * limit;

            console.log('Received query params:', { page, limit, start_date, end_date });

            // Формирование условий для фильтрации по датам
            let dateFilter = '';
            const queryParams = [parseInt(limit), parseInt(offset)];
            if (start_date && end_date) {
                dateFilter = 'WHERE created_at >= ? AND created_at <= ?';
                queryParams.unshift(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
            }

            console.log('SQL query:', {
                query: `SELECT id, campaign_name, adset_name, ad_name, offer_id, country, revenue, sub_id, created_at FROM approvals ${dateFilter} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
                params: queryParams,
            });

            // Запрос общего количества
            const [countRows] = await pool.query(
                `SELECT COUNT(*) as total FROM approvals ${dateFilter}`,
                dateFilter ? queryParams.slice(0, 2) : []
            );
            const total = countRows[0].total;
            const totalPages = Math.ceil(total / limit);

            // Запрос апрувов
            const [rows] = await pool.query(
                `
                SELECT id, campaign_name, adset_name, ad_name, offer_id, country, revenue, sub_id, created_at
                FROM approvals
                ${dateFilter}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                `,
                queryParams
            );

            const response = rows.map((row) => ({
                id: row.id,
                campaign_name: row.campaign_name,
                adset_name: row.adset_name || null,
                ad_name: row.ad_name || null,
                offer_id: row.offer_id || null,
                country: row.country || null,
                revenue: row.revenue ? parseFloat(row.revenue) : null,
                sub_id: row.sub_id,
                created_at: row.created_at.toISOString(),
            }));

            console.log('Response data:', response);

            res.set('Cache-Control', 'no-store');
            res.set('X-Total-Pages', totalPages);
            res.json(response);
        } catch (err) {
            console.error('Ошибка при получении апрувов:', err);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
);

// Удалить апрувы за предыдущий месяц
router.delete('/previous-month', async (req, res) => {
    try {
        const now = new Date();
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const startDate = firstDayLastMonth.toISOString().split('T')[0];
        const endDate = lastDayLastMonth.toISOString().split('T')[0];

        const [result] = await pool.query(
            'DELETE FROM approvals WHERE created_at >= ? AND created_at <= ?',
            [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );

        res.json({
            message: `Удалено ${result.affectedRows} апрувов за период ${startDate} - ${endDate}`,
        });
    } catch (err) {
        console.error('Ошибка при удалении апрувов:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении апрувов' });
    }
});

export default router;