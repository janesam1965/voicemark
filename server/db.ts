import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the current file's directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from .env.local first, then fall back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envLocalPath }) || dotenv.config({ path: envPath });

// Log environment variables for debugging
console.log('Database configuration loaded from:', fs.existsSync(envLocalPath) ? '.env.local' : '.env');

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:0811bCm2408!@db.pmtnpataxlbfkokqkxhi.supabase.co:5432/postgres';

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure SSL options for Supabase
const sslConfig = process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: true } 
  : { rejectUnauthorized: false }; // Allow self-signed certs in development

// Create a PostgreSQL client
const client = postgres(databaseUrl, { 
  ssl: sslConfig,
  // Add connection pooling configuration if needed
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Max idle time in seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Log the database connection (with sensitive info redacted)
console.log('Connecting to Supabase database:', 
  databaseUrl.replace(/:[^:]*@/, ':***@').replace(/@[^/]*\//, '@***/'));

// Create a Drizzle ORM instance
export const db = drizzle(client, { schema });

export { client as sql };