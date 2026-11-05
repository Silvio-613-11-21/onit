import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '../swagger.json' with {type: 'json'}

import 'dotenv/config';

import blockroute from './routes/block.route.ts'
import noteroute from './routes/note.route.ts'
import taskroute from './routes/task.route.ts'
import subtaskroute from './routes/subtask.route.ts'
import reportroute from './routes/report.route.ts'

const app: Express = express();

app.use(express.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/block', blockroute)
app.use('/note', noteroute)
app.use('/task', taskroute)
app.use('/subtask', subtaskroute)
app.use('/report', reportroute)

export default app;
