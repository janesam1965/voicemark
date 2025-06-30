import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
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

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:0811bCm2408!@db.pmtnpataxlbfkokqkxhi.supabase.co:5432/postgres';

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });