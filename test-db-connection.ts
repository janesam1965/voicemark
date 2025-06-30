import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envLocalPath }) || dotenv.config({ path: envPath });

// Set up database connection with SSL configuration
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:0811bCm2408!@db.pmtnpataxlbfkokqkxhi.supabase.co:5432/postgres';
const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Only for development!
  }
});
const db = drizzle({ client: pool, schema });

async function testDbConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test the connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful!');
    
    // Try to list books
    try {
      const books = await db.execute(sql`SELECT * FROM books LIMIT 5`);
      console.log('\n📚 Books in database:', books.rows.length);
      console.log(books.rows);
    } catch (booksError) {
      console.error('❌ Error fetching books:', booksError);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testDbConnection();
