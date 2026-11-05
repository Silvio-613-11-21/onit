import dotenv from 'dotenv';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';


dotenv.config()
const db_url =  process.env.TEST_DATABASE_URL

export async function testDB(){
    if(!db_url){
        throw new Error("DATABASE_URL не задан в .env.testing");
    }
    else{
        return db_url
    }
}

const db = drizzle(await testDB());

export async function applyMigrations() {
    await testDB();
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db, { migrationsFolder: './drizzle' });
}

export async function resetDatabase() {
    await db.execute(sql`truncate table block, note, task, subtask restart identity cascade`);
}

export async function closeDatabase() {
    await db.$client.end();
}
