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

async function testConnection() {
  console.log('Testing database connection with direct pg client...');
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
