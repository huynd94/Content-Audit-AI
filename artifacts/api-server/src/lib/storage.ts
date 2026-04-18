import { db, categoriesTable, pool, reviewsTable } from "@workspace/db";
import { DEFAULT_CATEGORIES } from "./default-categories";

let ensureAuditStoragePromise: Promise<void> | null = null;

async function bootstrapAuditStorage(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      guidelines TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      title TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      result JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reviews_category_id_idx ON reviews (category_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews (created_at DESC);
  `);

  await db
    .insert(categoriesTable)
    .values([...DEFAULT_CATEGORIES])
    .onConflictDoNothing({ target: categoriesTable.slug });
}

export async function ensureAuditStorage(): Promise<void> {
  if (!ensureAuditStoragePromise) {
    ensureAuditStoragePromise = bootstrapAuditStorage().catch((error) => {
      ensureAuditStoragePromise = null;
      throw error;
    });
  }

  await ensureAuditStoragePromise;
}
