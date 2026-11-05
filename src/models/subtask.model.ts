export interface Subtask {
    id: number, 
    taskId: number,
    title: string,
    description: string | null,
    state?: boolean,
}

export interface CreateSubtask {
    taskId: number,
    title: string,
    description?: string,
    state?: boolean,
}
