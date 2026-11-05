import { eq } from 'drizzle-orm';

import { db } from '../database/db.ts';
import { task } from '../database/schema.ts';
import type { CreateTask } from '../models/task.model.ts';

export async function createTask(newtask: CreateTask): Promise<void> {

    const newtask_: typeof task.$inferInsert = {
        blockId: newtask.blockId,
        title: newtask.title,
        description: newtask.description,
        state: newtask.state,
        noteId: newtask.noteId,
    } 
    await db.insert(task).values(newtask_)
}

export async function getAllTask() {
    const allTasks = await db.select().from(task)
    return allTasks
}

export async function getTaskById(id: number) {
    const task_ = await db.select().from(task).where(eq(task.id, id))
    return task_; 
}


export async function deleteTaskById(id: number){
    let deleted = await db.delete(task).where(eq(task.id, id)).returning({ id: task.id });
    return deleted.length > 0;
} 

export async function patchTaskTitle(id: number, newTitle: string) {
    let updated = await db.update(task).set({title: newTitle}).where(eq(task.id, id)).returning({ id: task.id });
    return updated.length > 0;
}

export async function patchTaskDescription(id: number, newDescription: string) {
    let updated = await db.update(task).set({description: newDescription}).where(eq(task.id, id)).returning({ id: task.id });
    return updated.length > 0;
}

export async function patchTaskState(id: number, newState: boolean) {
    let updated = await db.update(task).set({state: newState}).where(eq(task.id, id)).returning({ id: task.id });
    return updated.length > 0;
}

//--------

export async function getTasksByBlockId(blockId:number) {
    let tasks = await db.select().from(task).where(eq(task.blockId, blockId)) 
    return tasks
}