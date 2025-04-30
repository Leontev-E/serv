import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import winston from 'winston';
import articlesRoutes from './routes/articles.js';
import usersRoutes from './routes/users.js';
import categoriesRoutes from './routes/categories.js';
import commentsRoutes from './routes/comments.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Настройка логирования
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// Middleware
app.use(compression());
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || 'https://klm-wiki.ru',
    credentials: true,
    maxAge: 86400,
}));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

const limiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 15 минут
    max: 100000,
    message: 'Слишком много запросов, попробуйте позже',
});

app.use(limiter);

// Проверка сервера
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

// Роуты API
app.use('/api/articles', articlesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/comments', commentsRoutes);

// Обработка ошибок
app.use((err, req, res, next) => {
    logger.error(`${err.message} - ${req.method} ${req.url}`);
    res.status(500).json({ message: 'Ошибка сервера' });
});

// Порт сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
});