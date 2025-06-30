import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Get the current file's directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from .env.local first, then fall back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envLocalPath }) || dotenv.config({ path: envPath });

// Log environment variables for debugging
console.log('Database configuration loaded from:', fs.existsSync(envLocalPath) ? '.env.local' : '.env');

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:0811bCm2408!@db.pmtnpataxlbfkokqkxhi.supabase.co:5432/postgres';

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// For development: Add SSL configuration to bypass certificate verification
const sslConfig = {
  ssl: {
    rejectUnauthorized: false // Only for development!
  }
};

// Configure SSL options based on environment
let sslOptions;

// For development: Use a more robust SSL configuration
if (process.env.NODE_ENV === 'production') {
  // In production, we should use proper SSL verification
  try {
    const certPath = path.join(process.cwd(), 'prod-ca-2021.crt');
    if (fs.existsSync(certPath)) {
      sslOptions = {
        rejectUnauthorized: true,
        ca: readFileSync(certPath).toString()
      };
      console.log(`Production mode: Using SSL certificate from ${certPath}`);
    } else {
      throw new Error('SSL certificate not found');
    }
  } catch (error) {
    console.error('Error configuring SSL for production:', error);
    process.exit(1);
  }
} else {
  // In development, disable SSL verification completely
  console.log('Development mode: SSL verification disabled');
  // Completely disable SSL for development
  sslOptions = false;
  console.log('SSL completely disabled for development');
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: sslOptions
});

console.log('Attempting to connect to database with URL:', databaseUrl.replace(/:[^:@]*@/, ':****@'));
export const db = drizzle({ client: pool, schema });