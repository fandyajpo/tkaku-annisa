import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL belum di-set. Jalankan: node --env-file=.env scripts/db-setup.mjs");
  process.exit(1);
}

const client = createClient({ url, authToken });

await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    pesan TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

console.log("Schema siap. Tabel `contact` sudah ada di Turso.");
