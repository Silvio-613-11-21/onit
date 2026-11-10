import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '../swagger.json' with {type: 'json'}
import { sql } from 'drizzle-orm';

import 'dotenv/config';

import { db } from './database/db.ts'

import blockroute from './routes/block.route.ts'
import noteroute from './routes/note.route.ts'
import taskroute from './routes/task.route.ts'
import subtaskroute from './routes/subtask.route.ts'
import reportroute from './routes/report.route.ts'

const app: Express = express();

app.use(express.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ── Health-эндпоинты для smoke-проверки в CI/CD (ЛР3/ЛР4) ──
// /health       — «живо ли приложение» (БД не трогает, поэтому отвечает даже при упавшей БД)
// /health/ready — «готово ли принимать запросы» (проверяет реальное подключение к БД)
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'onit',
        uptime: Math.round(process.uptime()),
    });
});

app.get('/health/ready', async (_req, res) => {
    try {
        await db.execute(sql`select 1`);
        return res.status(200).json({ status: 'ok', db: 'up' });
    } catch (e) {
        console.error('БД недоступна:', e);
        return res.status(503).json({ status: 'error', db: 'down' });
    }
});

app.use('/block', blockroute)
app.use('/note', noteroute)
app.use('/task', taskroute)
app.use('/subtask', subtaskroute)
app.use('/report', reportroute)

export default app;
