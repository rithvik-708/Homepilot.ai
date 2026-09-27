import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env from current dir up to workspace root
function loadEnv() {
  let curr = __dirname;
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(curr, '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
    curr = path.dirname(curr);
  }
  dotenv.config();
}

loadEnv();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homepilot';

export const client = postgres(connectionString, {
  connect_timeout: 3,
  idle_timeout: 5,
  max: 10,
});
export const db = drizzle(client, { schema });

