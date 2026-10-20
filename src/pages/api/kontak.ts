import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { db, ensureSchema } from "../../lib/db";

export const prerender = false;

const BATAS = { nama: 100, kelas: 50, pesan: 2000 } as const;

function res(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function bersih(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function ipDari(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("client-address") ??
    "unknown"
  );
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return res({ ok: false, pesan: "Permintaan tidak valid." }, 400);
  }

  // honeypot: bot yang mengisi kolom tersembunyi dibungkam saja
  if (bersih(body.bot, 10)) return res({ ok: true }, 200);

  const nama = bersih(body.nama, BATAS.nama);
  const kelas = bersih(body.kelas, BATAS.kelas);
  const pesan = bersih(body.pesan, BATAS.pesan);
  if (!nama || !kelas || !pesan) {
    return res(
      { ok: false, pesan: "Nama, kelas, dan pesan wajib diisi." },
      400,
    );
  }

  const ip = ipDari(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const fingerprint = createHash("sha256").update(`${ip}|${ua}`).digest("hex");

  try {
    await ensureSchema();

    const ada = await db().execute({
      sql: "SELECT 1 FROM contact WHERE fingerprint = ?",
      args: [fingerprint],
    });
    if (ada.rows.length > 0) {
      return res(
        {
          ok: false,
          sudah: true,
          pesan:
            "Kamu sudah pernah mengirim masukan. Satu orang cukup satu kali ya!",
        },
        409,
      );
    }

    await db().execute({
      sql: "INSERT INTO contact (nama, kelas, pesan, fingerprint) VALUES (?, ?, ?, ?)",
      args: [nama, kelas, pesan, fingerprint],
    });
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return res(
        {
          ok: false,
          sudah: true,
          pesan:
            "Kamu sudah pernah mengirim masukan. Satu orang cukup satu kali ya!",
        },
        409,
      );
    }
    console.error(err);
    return res(
      { ok: false, pesan: "Server sedang bermasalah. Coba lagi nanti ya." },
      500,
    );
  }

  return res({ ok: true }, 200);
};
