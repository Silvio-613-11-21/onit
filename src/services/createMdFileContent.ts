import type { Block } from "../models/block.model.ts";
import type { Task } from "../models/task.model.ts";
import type { Subtask } from "../models/subtask.model.ts";
import type { Note } from "../models/note.model.ts"

export default function createMdFileContent
    (
        blocks: Block[],
        tasks: Task[],
        subtasks: Subtask[][],
        notes: Note[]
    ) {
    let content = ''

    const block = blocks[0]
    content += addBlockTitle(block)
    content += '## Tasks \n'
    content += addTasks(tasks, subtasks)
    content += '\n'
    content += '\n'
    content += '## Notes \n' 
    content += addNotes(notes)

    return content
}

function addNotes(notes: Note[]){
    let c = ''

    for(const note of notes){
        c += '- '
        c += `<span id = "${note.id}" >${note.title}</span>`
        c += '\n'

        if(note.description){
            c += `${note.description}`
            c += '\n'
        }
    }
    
    return c
} 

function addTasks(tasks: Task[], subtasks: Subtask[][]) {
    let c = ''

    for (const task of tasks) {
        

        if (task.state) {
            c += '- [x] '
        }
        else {
            c += '- [ ] '
        }

        if (task.noteId) {
            c += `<a id="${task.noteId}">${task.title}</a>`
        }
        else {
            c += `${task.title}`
        }
        c += '\n'

        if (task.description) {
            c += '\t'
            c += `${task.description}`
            c += '\n'
        }

        for (const subtask of subtasks) {
            if (subtask[0].taskId != task.id) {
                continue
            }
            else {

                for (const subtask_ of subtask) {
                    c += '\t'

                    if (subtask_.state) {
                        c += '- [x] '
                    }
                    else {
                        c += '- [ ] '
                    }

                    c += `${subtask_.title}`
                    c += '\n'

                    if (subtask_.description) {
                        c += '\t'
                        c += `${subtask_.description}`
                        c += '\n'
                    }
                }
            }

        }
    }

    return c
}


function addBlockTitle(block: Block) {
    let c = ''

    c += '# '
    c += '['
    c += `${block.date}`
    c += ']'

    if (block.title) {
        c += ' '
        c += `${block.title}`
    }

    c += '\n'
    return c
}