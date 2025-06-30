import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { books, journalEntries } from '../shared/schema';

async function initializeDatabase() {
  console.log('Initializing database schema...');

  try {
    // Drop existing tables if they exist (be careful with this in production!)
    await db.execute(sql`DROP TABLE IF EXISTS ${journalEntries} CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS ${books} CASCADE`);
    console.log('Dropped existing tables');

    // Create books table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${books} (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        cover_url TEXT,
        total_pages INTEGER,
        current_page INTEGER DEFAULT 0,
        current_chapter TEXT,
        status TEXT NOT NULL DEFAULT 'to_read',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created books table');

    // Create journal_entries table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${journalEntries} (
        id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES ${books}(id) ON DELETE CASCADE,
        transcription TEXT NOT NULL,
        audio_url TEXT,
        audio_length DECIMAL(8, 2),
        page INTEGER,
        chapter TEXT,
        is_favorite BOOLEAN DEFAULT false,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created journal_entries table');

    console.log('✅ Database schema initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

initializeDatabase();
