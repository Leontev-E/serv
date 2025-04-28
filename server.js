import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import articlesRoutes from './routes/articles.js';
import usersRoutes from './routes/users.js';
import categoriesRoutes from './routes/categories.js';
import commentsRoutes from './routes/comments.js';

dotenv.config();

const app = express();

// Настройка CORS
app.use(cors({
    origin: ['http://localhost:5173', 'https://klm-wiki.ru'],
    credentials: true,
}));

// Проверка сервера
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.use(express.json());

// Роуты API
app.use('/api/articles', articlesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/comments', commentsRoutes);

// Порт сервера
const PORT = process.env.PORT || 5000;

// ✅ Важно! Нужно явно указать '0.0.0.0' для Render!
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
