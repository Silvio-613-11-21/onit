import { eq } from 'drizzle-orm';

import { db } from '../database/db.ts';
import { block } from '../database/schema.ts';
import type { CreateBlock } from '../models/block.model.ts';

export async function createBlock(newblock: CreateBlock): Promise<void> {

    const newblock_ : typeof block.$inferInsert = {
        date: newblock.date,
        title: newblock.title,
    } 
    await db.insert(block).values(newblock_)
}

export async function createBlockByCurrentDate (title?: string) {
    const date = (new Date()).toISOString().split('T')[0];

    await createBlock({date: date, title: title})
}

export async function getAllBlock() {
    const allBlocks = await db.select().from(block)
    return allBlocks
}

export async function getBlockById(id: number) {
    const block_ = await db.select().from(block).where(eq(block.id, id))
    return block_; 
}


export async function deleteBlockById(id: number){
    let deleted = await db.delete(block).where(eq(block.id, id)).returning({ id: block.id });
    return deleted.length > 0;
} 

export async function patchBlockTitle(id: number, newTitle: string) {
    let updated = await db.update(block).set({title: newTitle}).where(eq(block.id, id)).returning({ id: block.id });
    return updated.length > 0;
}