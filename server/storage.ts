import {
  books,
  journalEntries,
  type Book,
  type InsertBook,
  type UpdateBook,
  type JournalEntry,
  type InsertJournalEntry,
  type UpdateJournalEntry,
  type BookWithStats,
  type JournalEntryWithBook,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, sql, count } from "drizzle-orm";

export interface IStorage {
  // Books
  createBook(book: InsertBook): Promise<Book>;
  getBook(id: number): Promise<Book | undefined>;
  getAllBooks(): Promise<Book[]>;
  getBooksWithStats(): Promise<BookWithStats[]>;
  updateBook(id: number, book: UpdateBook): Promise<Book | undefined>;
  deleteBook(id: number): Promise<boolean>;
  searchBooks(query: string): Promise<Book[]>;

  // Journal Entries
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getJournalEntriesForBook(bookId: number): Promise<JournalEntry[]>;
  getAllJournalEntries(): Promise<JournalEntryWithBook[]>;
  getRecentJournalEntries(limit?: number): Promise<JournalEntryWithBook[]>;
  updateJournalEntry(id: number, entry: UpdateJournalEntry): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: number): Promise<boolean>;
  searchJournalEntries(query: string): Promise<JournalEntryWithBook[]>;
  getFavoriteJournalEntries(): Promise<JournalEntryWithBook[]>;
  toggleFavoriteEntry(id: number): Promise<JournalEntry | undefined>;

  // Stats
  getStats(): Promise<{
    totalBooks: number;
    totalNotes: number;
    totalAudioTime: number;
    booksInProgress: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Books
  async createBook(bookData: InsertBook): Promise<Book> {
    try {
      console.log('Creating book with data:', JSON.stringify(bookData, null, 2));
      const [book] = await db
        .insert(books)
        .values({
          ...bookData,
          updatedAt: new Date(),
        })
        .returning();
      console.log('Successfully created book:', JSON.stringify(book, null, 2));
      return book;
    } catch (error) {
      console.error('Error in createBook:', error);
      throw error; // Re-throw to be handled by the route handler
    }
  }

  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async getAllBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(desc(books.updatedAt));
  }

  async getBooksWithStats(): Promise<BookWithStats[]> {
    const result = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        isbn: books.isbn,
        coverUrl: books.coverUrl,
        totalPages: books.totalPages,
        currentPage: books.currentPage,
        currentChapter: books.currentChapter,
        status: books.status,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        totalNotes: count(journalEntries.id),
        totalAudioTime: sql<number>`COALESCE(SUM(${journalEntries.audioLength}), 0)`,
      })
      .from(books)
      .leftJoin(journalEntries, eq(books.id, journalEntries.bookId))
      .groupBy(books.id)
      .orderBy(desc(books.updatedAt));

    return result.map(row => ({
      ...row,
      totalAudioTime: Number(row.totalAudioTime) || 0,
    }));
  }

  async updateBook(id: number, bookData: UpdateBook): Promise<Book | undefined> {
    const [book] = await db
      .update(books)
      .set({
        ...bookData,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id))
      .returning();
    return book;
  }

  async deleteBook(id: number): Promise<boolean> {
    // First delete all journal entries for this book
    await db.delete(journalEntries).where(eq(journalEntries.bookId, id));
    
    const result = await db.delete(books).where(eq(books.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchBooks(query: string): Promise<Book[]> {
    return await db
      .select()
      .from(books)
      .where(
        or(
          like(books.title, `%${query}%`),
          like(books.author, `%${query}%`)
        )
      )
      .orderBy(desc(books.updatedAt));
  }

  // Journal Entries
  async createJournalEntry(entryData: InsertJournalEntry): Promise<JournalEntry> {
    const [entry] = await db
      .insert(journalEntries)
      .values({
        ...entryData,
        updatedAt: new Date(),
      })
      .returning();
    return entry;
  }

  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    return entry;
  }

  async getJournalEntriesForBook(bookId: number): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.bookId, bookId))
      .orderBy(desc(journalEntries.createdAt));
  }

  async getAllJournalEntries(): Promise<JournalEntryWithBook[]> {
    return await db
      .select({
        id: journalEntries.id,
        bookId: journalEntries.bookId,
        transcription: journalEntries.transcription,
        audioUrl: journalEntries.audioUrl,
        audioLength: journalEntries.audioLength,
        page: journalEntries.page,
        chapter: journalEntries.chapter,
        isFavorite: journalEntries.isFavorite,
        tags: journalEntries.tags,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        book: books,
      })
      .from(journalEntries)
      .innerJoin(books, eq(journalEntries.bookId, books.id))
      .orderBy(desc(journalEntries.createdAt));
  }

  async getRecentJournalEntries(limit = 10): Promise<JournalEntryWithBook[]> {
    return await db
      .select({
        id: journalEntries.id,
        bookId: journalEntries.bookId,
        transcription: journalEntries.transcription,
        audioUrl: journalEntries.audioUrl,
        audioLength: journalEntries.audioLength,
        page: journalEntries.page,
        chapter: journalEntries.chapter,
        isFavorite: journalEntries.isFavorite,
        tags: journalEntries.tags,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        book: books,
      })
      .from(journalEntries)
      .innerJoin(books, eq(journalEntries.bookId, books.id))
      .orderBy(desc(journalEntries.createdAt))
      .limit(limit);
  }

  async updateJournalEntry(id: number, entryData: UpdateJournalEntry): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .update(journalEntries)
      .set({
        ...entryData,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, id))
      .returning();
    return entry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    const result = await db.delete(journalEntries).where(eq(journalEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchJournalEntries(query: string): Promise<JournalEntryWithBook[]> {
    return await db
      .select({
        id: journalEntries.id,
        bookId: journalEntries.bookId,
        transcription: journalEntries.transcription,
        audioUrl: journalEntries.audioUrl,
        audioLength: journalEntries.audioLength,
        page: journalEntries.page,
        chapter: journalEntries.chapter,
        isFavorite: journalEntries.isFavorite,
        tags: journalEntries.tags,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        book: books,
      })
      .from(journalEntries)
      .innerJoin(books, eq(journalEntries.bookId, books.id))
      .where(
        or(
          like(journalEntries.transcription, `%${query}%`),
          like(books.title, `%${query}%`),
          like(books.author, `%${query}%`)
        )
      )
      .orderBy(desc(journalEntries.createdAt));
  }

  async getFavoriteJournalEntries(): Promise<JournalEntryWithBook[]> {
    return await db
      .select({
        id: journalEntries.id,
        bookId: journalEntries.bookId,
        transcription: journalEntries.transcription,
        audioUrl: journalEntries.audioUrl,
        audioLength: journalEntries.audioLength,
        page: journalEntries.page,
        chapter: journalEntries.chapter,
        isFavorite: journalEntries.isFavorite,
        tags: journalEntries.tags,
        createdAt: journalEntries.createdAt,
        updatedAt: journalEntries.updatedAt,
        book: books,
      })
      .from(journalEntries)
      .innerJoin(books, eq(journalEntries.bookId, books.id))
      .where(eq(journalEntries.isFavorite, true))
      .orderBy(desc(journalEntries.createdAt));
  }

  async toggleFavoriteEntry(id: number): Promise<JournalEntry | undefined> {
    const entry = await this.getJournalEntry(id);
    if (!entry) return undefined;

    const [updatedEntry] = await db
      .update(journalEntries)
      .set({
        isFavorite: !entry.isFavorite,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, id))
      .returning();
    return updatedEntry;
  }

  // Stats
  async getStats(): Promise<{
    totalBooks: number;
    totalNotes: number;
    totalAudioTime: number;
    booksInProgress: number;
  }> {
    const [bookStats] = await db
      .select({
        totalBooks: count(books.id),
        booksInProgress: sql<number>`COUNT(CASE WHEN ${books.status} = 'reading' THEN 1 END)`,
      })
      .from(books);

    const [entryStats] = await db
      .select({
        totalNotes: count(journalEntries.id),
        totalAudioTime: sql<number>`COALESCE(SUM(${journalEntries.audioLength}), 0)`,
      })
      .from(journalEntries);

    return {
      totalBooks: bookStats?.totalBooks || 0,
      totalNotes: entryStats?.totalNotes || 0,
      totalAudioTime: Number(entryStats?.totalAudioTime) || 0,
      booksInProgress: Number(bookStats?.booksInProgress) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
