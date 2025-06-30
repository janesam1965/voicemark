import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const { Pool } = pg;

// Get the SSL certificate
const caCert = fs.readFileSync(path.join(__dirname, 'prod-ca-2021.crt')).toString();

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: caCert
  }
});

// SQL to create tables
const createTablesSQL = `
  -- Drop tables if they exist
  DROP TABLE IF EXISTS journal_entries CASCADE;
  DROP TABLE IF EXISTS books CASCADE;

  -- Create books table
  CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    cover_url TEXT,
    total_pages INTEGER,
    current_page INTEGER DEFAULT 0,
    current_chapter TEXT,
    status TEXT NOT NULL DEFAULT 'to_read',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Create journal_entries table
  CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    transcription TEXT NOT NULL,
    audio_url TEXT,
    audio_length DECIMAL(8, 2),
    page INTEGER,
    chapter TEXT,
    is_favorite BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes
  CREATE INDEX idx_journal_entries_book_id ON journal_entries(book_id);
  CREATE INDEX idx_books_status ON books(status);
`;

async function initializeSchema() {
  console.log('Initializing database schema...');
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Execute the SQL to create tables
    await client.query(createTablesSQL);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('✅ Database schema initialized successfully!');
    
    // Verify the tables were created
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('\n📋 Available tables:');
    console.table(tables.rows);
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error initializing schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeSchema().catch(console.error);
