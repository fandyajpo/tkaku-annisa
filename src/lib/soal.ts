import fs from "node:fs";
import path from "node:path";

export type Isi = { teks: string } | { tabel: string[] };

export type Opsi = { huruf: string; teks: string };

export type ItemPernyataan = { label: string; teks: string; kunci: string };

export type Langkah = { nomor: string; isi: Isi[] };

export type TipeSoal = "pilihan" | "pernyataan" | "teks";

export type Soal = {
  no: number;
  topik: string;
  isi: Isi[];
  opsi: Opsi[];
  benar: number[];
  items: ItemPernyataan[];
  langkah: Langkah[];
  kunciTeks: string;
  tipe: TipeSoal;
  tanpaKunci: boolean;
  banyakPilihanGanda: boolean;
};

export type PaketMeta = {
  slug: "wajib" | "lanjut";
  judul: string;
  subjudul: string;
  deskripsi: string;
  file: string;
  warna: string;
  ikon: string;
};

export const PAKET: Record<PaketMeta["slug"], PaketMeta> = {
  wajib: {
    slug: "wajib",
    judul: "Paket Wajib (Umum)",
    subjudul: "Soal TKA Matematika Wajib SMA/MA/SMK 2025",
    deskripsi:
      "25 soal wajib: bilangan, aljabar, geometri, data, dan peluang. Cocok buat kamu yang mau fundamentalnya kuat.",
    file: "TKA Matematika Wajib Umum 2025.docx.md",
    warna: "#4f8b6f",
    ikon: "★",
  },
  lanjut: {
    slug: "lanjut",
    judul: "Paket Tingkat Lanjut",
    subjudul: "Soal TKA Matematika Pilihan SMA/MA/SMK 2025",
    deskripsi:
      "25 soal lanjutan: matriks, polinomial, eksponensial, vektor, transformasi, dan kalkulus. Buat yang siap tantangan.",
    file: "TKA Matematika Tingkat Lanjut 2025.docx.md",
    warna: "#5ba9e4",
    ikon: "◆",
  },
};

function bersih(teks: string): string {
  return teks
    .replace(/\\([^\s])/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function selTabel(sel: string): string {
  const t = sel.trim();
  if (!t) return "";
  const token = t.split(/\s+/);
  const dilarang = token.some((x) => /^[=:×·]+$/.test(x) || x === "✓");
  const format = (lebar: number) => {
    const baris: string[] = [];
    for (let i = 0; i < token.length; i += lebar) baris.push(token.slice(i, i + lebar).join(" "));
    return "[" + baris.join("; ") + "]";
  };
  if (!dilarang && token.length >= 2 && token.length <= 9) {
    if (token.length % 2 === 0) return format(token.length / 2);
    if (token.length % 3 === 0) return format(3);
  }
  return t;
}

function potongParagraf(blok: string): Isi[] {
  const hasil: Isi[] = [];
  const potongan = blok.split(/\n\s*\n/);
  for (const potonganMentah of potongan) {
    const baris = potonganMentah.split("\n").map((b) => b.trim());
    if (baris.every((b) => b.length === 0)) continue;

    if (baris.some((b) => b.startsWith("|"))) {
      const tabel: string[] = [];
      for (const barisTabel of baris) {
        if (!barisTabel.startsWith("|")) continue;
        const sel = barisTabel
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((s) => bersih(s));
        if (sel.every((s) => /^:?-{3,}:?$/.test(s) || s === "")) continue;
        tabel.push(sel.map(selTabel).join("  "));
      }
      if (tabel.length) hasil.push({ tabel });
      continue;
    }

    const teks = bersih(baris.join("\n"));
    if (teks) hasil.push({ teks });
  }
  return hasil;
}

const VERDICT = ["Tidak Pas", "Tidak Mungkin", "Benar", "Salah", "Pas", "Mungkin"];

function parseKunciPernyataan(kunciTeks: string): { label: string; nilai: string }[] {
  const hasil: { label: string; nilai: string }[] = [];
  const regex = new RegExp(
    `([^:;\\n]+?)\\s*[:)]\\s*(${VERDICT.map((v) => v.replace(" ", "\\s")).join("|")})\\b`,
    "g",
  );
  for (const cocok of kunciTeks.matchAll(regex)) {
    const label = cocok[1].replace(/^\(|\)$/g, "").trim();
    if (!label || label.length > 24) continue;
    hasil.push({ label, nilai: cocok[2] });
  }
  return hasil;
}

function cariItems(blokSoal: string, labelKunci: string[]): Map<string, string> {
  const teks = bersih(blokSoal.replace(/\|.*\n?/g, "\n"));
  const hasil = new Map<string, string>();
  const polaBerdigit = /(\d+)\)\s*([^\n]*?)(?=\s*\d+\)|\n|$)/g;
  const polaHuruf = /([a-c])\)\s*([^\n]*?)(?=\s+[a-c]\)|\n|$)/g;
  for (const cocok of teks.matchAll(polaBerdigit)) {
    const isi = cocok[2].trim();
    if (isi) hasil.set(cocok[1], isi.replace(/\.$/, ""));
  }
  for (const cocok of teks.matchAll(polaHuruf)) {
    const isi = cocok[2].trim();
    if (isi && !hasil.has(cocok[1])) hasil.set(cocok[1], isi.replace(/\.$/, ""));
  }
  for (const label of labelKunci) {
    if (!hasil.has(label) && teks.includes(label)) hasil.set(label, label);
  }
  return hasil;
}

export function parseMd(md: string): Soal[] {
  const bagian = md.split(/^#?\s*\*\*B\. Pembahasan Lengkap\*\*\s*$/m);
  const isiLengkap = bagian.length > 1 ? bagian[1] : md;

  const potonganSoal = isiLengkap.split(/^\*\*SOAL\s+(\d+)\s*(.*?)\*\*\s*$/m);
  const soal: Soal[] = [];

  for (let i = 1; i < potonganSoal.length; i += 3) {
    const nomor = Number(potonganSoal[i]);
    const topik = potonganSoal[i + 1].trim();
    const blok = potonganSoal[i + 2];

    const bagianSoal = blok.split(/^\*\*Soal:\*\*$/m)[1] ?? blok;
    const potongPilihan = bagianSoal.split(/^\*\*Pilihan:\*\*$/m);
    let isiMentahSoal = potongPilihan[0];
    const sisa = potongPilihan[1];
    let mentahPilihan: string | undefined;
    let mentahPenyelesaian: string | undefined;
    if (sisa === undefined) {
      const potongSelesai = isiMentahSoal.split(/^\*\*Penyelesaian:\*\*$/m);
      isiMentahSoal = potongSelesai[0];
      mentahPenyelesaian = potongSelesai[1];
    } else {
      const potongSelesai = sisa.split(/^\*\*Penyelesaian:\*\*$/m);
      mentahPilihan = potongSelesai[0];
      mentahPenyelesaian = potongSelesai[1];
    }

    const isi = potongParagraf(isiMentahSoal);

    const opsi: Opsi[] = [];
    const benar: number[] = [];
    if (mentahPilihan) {
      for (const baris of mentahPilihan.split("\n")) {
        const cocok = baris.match(/^\*{0,2}([A-Z])\.\s*(.+?)\*{0,2}\s*$/);
        if (!cocok) continue;
        const teksOpsi = cocok[2].replace(/\s*✓\s*$/, "").trim();
        if (!teksOpsi) continue;
        if (/\s*✓\s*$/.test(cocok[2])) benar.push(opsi.length);
        opsi.push({ huruf: cocok[1], teks: bersih(teksOpsi) });
      }
    }

    const kunciCocok = (mentahPenyelesaian ?? "").match(/^\*\*Jawaban:\s*(.+?)\*\*\s*$/m);
    const kunciTeks = kunciCocok ? bersih(kunciCocok[1]) : "";

    const langkah: Langkah[] = [];
    if (mentahPenyelesaian) {
      const teksLangkah = mentahPenyelesaian.split(/^\*\*Jawaban:.*$/m)[0];
      const potonganLangkah = teksLangkah.split(/(?=\*\*Langkah\s+\d+\\?\.\*\*)/);
      for (const potonganLangkahMentah of potonganLangkah) {
        const blokLangkah = potonganLangkahMentah.trim();
        if (!blokLangkah) continue;
        const cocokLangkah = blokLangkah.match(/^\*\*Langkah\s+(\d+)\\?\.\*\*\s*(.*)$/m);
        if (cocokLangkah) {
          const sisaBaris = cocokLangkah[2].trim();
          const isiLanjutan = blokLangkah.split("\n").slice(1).join("\n");
          const teksGabung = [sisaBaris, isiLanjutan].filter(Boolean).join("\n\n").trim();
          langkah.push({ nomor: cocokLangkah[1], isi: potongParagraf(teksGabung) });
        } else {
          const isiBlok = potongParagraf(blokLangkah);
          if (isiBlok.length) langkah.push({ nomor: "", isi: isiBlok });
        }
      }
    }

    let items: ItemPernyataan[] = [];
    let tipe: TipeSoal = opsi.length ? "pilihan" : "teks";

    if (!opsi.length && kunciTeks) {
      const kunciItems = parseKunciPernyataan(kunciTeks);
      const kunciValid = kunciItems.length > 0 && kunciItems.every((k) => VERDICT.includes(k.nilai));
      if (kunciValid) {
        tipe = "pernyataan";
        const teksItems = cariItems(isiMentahSoal, kunciItems.map((k) => k.label));
        items = kunciItems.map((k) => ({
          label: k.label,
          teks: teksItems.get(k.label) ?? k.label,
          kunci: k.nilai,
        }));
      }
    }

    soal.push({
      no: nomor,
      topik,
      isi,
      opsi,
      benar,
      items,
      langkah,
      kunciTeks,
      tipe,
      tanpaKunci: tipe === "pilihan" && benar.length === 0,
      banyakPilihanGanda: benar.length > 1,
    });
  }

  return soal.sort((a, b) => a.no - b.no);
}

export function ambilPaket(slug: PaketMeta["slug"]): Soal[] {
  const meta = PAKET[slug];
  const file = path.resolve(process.cwd(), "knowledge", meta.file);
  const md = fs.readFileSync(file, "utf8");
  return parseMd(md);
}

export function semuaPaket(): { meta: PaketMeta; soal: Soal[] }[] {
  return (Object.keys(PAKET) as PaketMeta["slug"][]).map((slug) => ({
    meta: PAKET[slug],
    soal: ambilPaket(slug),
  }));
}
