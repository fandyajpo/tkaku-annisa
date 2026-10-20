import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaSiap: Promise<void> | null = null;

export function db(): Client {
  if (!client) {
    const url = import.meta.env.TURSO_DATABASE_URL as string | undefined;
    const authToken = import.meta.env.TURSO_AUTH_TOKEN as string | undefined;
    if (!url) throw new Error("TURSO_DATABASE_URL belum di-set");
    client = createClient({ url, authToken });
  }
  return client;
}

export function ensureSchema(): Promise<void> {
  schemaSiap ??= db().executeMultiple(`
    CREATE TABLE IF NOT EXISTS contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kelas TEXT NOT NULL,
      pesan TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return schemaSiap;
}
