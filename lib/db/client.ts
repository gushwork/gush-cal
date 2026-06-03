import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let dbInstance: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const client = postgres(connectionString, { prepare: false });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

/** @deprecated Prefer getDb() — kept for incremental migration */
export const db = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
