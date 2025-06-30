import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the root .env file
const envPath = path.resolve(process.cwd(), '../.env');
console.log('Loading .env from:', envPath);

dotenv.config({ path: envPath });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***REDACTED***' : 'NOT FOUND');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in the environment variables');
  console.log('Current working directory:', process.cwd());
  console.log('Environment variables:', Object.keys(process.env).join(', '));
} else {
  console.log('Database connection string found.');
}
