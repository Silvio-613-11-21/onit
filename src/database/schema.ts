import { pgTable, integer, text, boolean, date } from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";

// ── Таблицы ────────────────────────────────────────────

export const block = pgTable("block", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: date("date").notNull(),
  title: text("title"),
});

export const note = pgTable("note", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  blockId: integer("block_id")
    .notNull()
    .references(() => block.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
});

export const task = pgTable("task", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  blockId: integer("block_id")
    .notNull()
    .references(() => block.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  state: boolean("state").notNull().default(false),
  noteId: integer("note_id").references(() => note.id, { onDelete: "set null" }),
});

export const subtask = pgTable("subtask", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  taskId: integer("task_id")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  state: boolean("state").notNull().default(false),
});

// ── Relations (Drizzle v2: defineRelations) ────────────

export const relations = defineRelations(
  { block, note, task, subtask },
  (r) => ({
    block: {
      tasks: r.many.task(),
      notes: r.many.note(),
    },
    note: {
      block: r.one.block({
        from: r.note.blockId,
        to: r.block.id,
      }),
      tasks: r.many.task(),
    },
    task: {
      block: r.one.block({
        from: r.task.blockId,
        to: r.block.id,
      }),
      note: r.one.note({
        from: r.task.noteId,
        to: r.note.id,
      }),
      subtasks: r.many.subtask(),
    },
    subtask: {
      task: r.one.task({
        from: r.subtask.taskId,
        to: r.task.id,
      }),
    },
  })
);