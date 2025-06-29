import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  decimal,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  coverUrl: text("cover_url"),
  totalPages: integer("total_pages"),
  currentPage: integer("current_page").default(0),
  currentChapter: text("current_chapter"),
  status: text("status").notNull().default("to_read"), // to_read, reading, completed, paused
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  transcription: text("transcription").notNull(),
  audioUrl: text("audio_url"),
  audioLength: decimal("audio_length", { precision: 8, scale: 2 }), // in seconds
  page: integer("page"),
  chapter: text("chapter"),
  isFavorite: boolean("is_favorite").default(false),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookRelations = relations(books, ({ many }) => ({
  journalEntries: many(journalEntries),
}));

export const journalEntryRelations = relations(journalEntries, ({ one }) => ({
  book: one(books, {
    fields: [journalEntries.bookId],
    references: [books.id],
  }),
}));

// Insert schemas
export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schemas
export const updateBookSchema = insertBookSchema.partial();
export const updateJournalEntrySchema = insertJournalEntrySchema.partial();

// Types
export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type UpdateJournalEntry = z.infer<typeof updateJournalEntrySchema>;

// Combined types for API responses
export type BookWithStats = Book & {
  totalNotes: number;
  totalAudioTime: number;
};

export type JournalEntryWithBook = JournalEntry & {
  book: Book;
};
