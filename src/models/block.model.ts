export interface Block {
    id: number,
    date: string,
    title:string | null,
}

export interface CreateBlock {
    date: string,
    title?:string,
}