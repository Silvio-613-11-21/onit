export interface Note {
    id: number 
    blockId: number,
    title: string,
    description: string | null,
}

export interface CreateNote {
    blockId: number,
    title: string,
    description?: string,
}
