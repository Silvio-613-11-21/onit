import { eq } from 'drizzle-orm';

import { db } from '../database/db.ts';
import { note } from '../database/schema.ts';
import type { CreateNote } from '../models/note.model.ts';

export async function createNote(newnote: CreateNote): Promise<void> {

    const newnote_: typeof note.$inferInsert = {
        blockId: newnote.blockId,
        title: newnote.title,
        description: newnote.description,
    } 
    await db.insert(note).values(newnote_)
}

export async function getAllNote() {
    const allNotes = await db.select().from(note)
    return allNotes
}

export async function getNoteById(id: number) {
    const note_ = await db.select().from(note).where(eq(note.id, id))
    return note_; 
}


export async function deleteNoteById(id: number){
    let deleted = await db.delete(note).where(eq(note.id, id)).returning({ id: note.id });
    return deleted.length > 0;
} 

export async function patchNoteTitle(id: number, newTitle: string) {
    let updated = await db.update(note).set({title: newTitle}).where(eq(note.id, id)).returning({ id: note.id });
    return updated.length > 0;
}

export async function patchNoteDescription(id: number, newDescription: string) {
    let updated = await db.update(note).set({description: newDescription}).where(eq(note.id, id)).returning({ id: note.id });
    return updated.length > 0;
}

// ------------------------------

export async function getNotesByBlockId(blockId: number) {
    let notes = db.select().from(note).where(eq(note.blockId, blockId))
    return notes
}
