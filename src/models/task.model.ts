export interface Task{
    id: number, 
    blockId: number,
    title: string,
    description: string | null,
    state: boolean,
    noteId: number | null,
}

export interface CreateTask {
    blockId: number,
    title: string,
    description?: string,
    state?: boolean,
    noteId?: number,
}
