import { eq } from 'drizzle-orm';

import { db } from '../database/db.ts';
import { subtask } from '../database/schema.ts';
import type { CreateSubtask } from '../models/subtask.model.ts';

export async function createSubtask(newsubtask: CreateSubtask): Promise<void> {

    const newsubtask_: typeof subtask.$inferInsert = {
        taskId: newsubtask.taskId,
        title: newsubtask.title,
        description: newsubtask.description,
        state: newsubtask.state,
    } 
    await db.insert(subtask).values(newsubtask_)
}

export async function getAllSubtask() {
    const allSubtasks = await db.select().from(subtask)
    return allSubtasks
}

export async function getSubtaskById(id: number) {
    const subtask_ = await db.select().from(subtask).where(eq(subtask.id, id))
    return subtask_; 
}


export async function deleteSubtaskById(id: number){
    let deleted = await db.delete(subtask).where(eq(subtask.id, id)).returning({ id: subtask.id });
    return deleted.length > 0;
} 

export async function patchSubtaskTitle(id: number, newTitle: string) {
    let updated = await db.update(subtask).set({title: newTitle}).where(eq(subtask.id, id)).returning({ id: subtask.id });
    return updated.length > 0;
}

export async function patchSubtaskDescription(id: number, newDescription: string) {
    let updated = await db.update(subtask).set({description: newDescription}).where(eq(subtask.id, id)).returning({ id: subtask.id });
    return updated.length > 0;
}

export async function patchSubtaskState(id: number, newState: boolean) {
    let updated = await db.update(subtask).set({state: newState}).where(eq(subtask.id, id)).returning({ id: subtask.id });
    return updated.length > 0;
}

// ---- 
export async function getSubtasksByTaskId(taskId:number) {
    let subtasks = await db.select().from(subtask).where(eq(subtask.taskId, taskId)) 
    return subtasks
}