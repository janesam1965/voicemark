import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const { Pool } = pg;

// Get the current file's directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:0811bCm2408!@db.pmtnpataxlbfkokqkxhi.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  console.log('Testing database connection...');
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful!', result.rows[0]);
    
    // Try to list tables
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('\n📋 Available tables:');
    console.table(tables.rows);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection();
