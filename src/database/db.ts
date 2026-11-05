import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const url = process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL!
    : process.env.DATABASE_URL!;

export const db = drizzle(url);
