import type { APIRoute } from "astro";
import { db, ensureSchema } from "../../lib/db";
import { kunciSah, PER_HALAMAN } from "../../lib/feedback";

export const prerender = false;

interface Baris {
  id: number;
  nama: string;
  kelas: string;
  pesan: string;
  dikirim: string;
}

function res(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function petak(row: Record<string, unknown>): Baris {
  return {
    id: Number(row.id ?? 0),
    nama: String(row.nama ?? ""),
    kelas: String(row.kelas ?? ""),
    pesan: String(row.pesan ?? ""),
    dikirim: String(row.created_at ?? ""),
  };
}

export const GET: APIRoute = async ({ url }) => {
  if (!kunciSah(url.searchParams)) {
    return res({ ok: false, pesan: "Tidak ditemukan." }, 404);
  }

  const semua = url.searchParams.get("semua") === "1";
  const minta = Math.floor(Number(url.searchParams.get("halaman") ?? 1));
  const halaman = Number.isFinite(minta) && minta > 0 ? minta : 1;

  try {
    await ensureSchema();

    const hitung = await db().execute("SELECT COUNT(*) AS jml FROM contact");
    const total = Number(hitung.rows[0]?.jml ?? 0);
    const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
    const efektif = Math.min(halaman, totalHalaman);

    const r = semua
      ? await db().execute("SELECT id, nama, kelas, pesan, created_at FROM contact ORDER BY id DESC")
      : await db().execute({
          sql: "SELECT id, nama, kelas, pesan, created_at FROM contact ORDER BY id DESC LIMIT ? OFFSET ?",
          args: [PER_HALAMAN, (efektif - 1) * PER_HALAMAN],
        });

    return res({
      ok: true,
      halaman: semua ? 1 : efektif,
      perHalaman: PER_HALAMAN,
      total,
      totalHalaman,
      baris: r.rows.map(petak),
    });
  } catch (err) {
    console.error(err);
    return res({ ok: false, pesan: "Server sedang bermasalah. Coba lagi nanti ya." }, 500);
  }
};
