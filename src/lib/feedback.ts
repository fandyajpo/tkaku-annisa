export const PER_HALAMAN = 10;

function envPribadi(nama: string): string | undefined {
  const dariVite = import.meta.env?.[nama];
  if (typeof dariVite === "string" && dariVite !== "") return dariVite;
  const proses = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proses?.env?.[nama] || undefined;
}

export function kunciSah(searchParams: URLSearchParams): boolean {
  const kunci = envPribadi("FEEDBACK_KEY");
  if (!kunci) return true;
  return searchParams.get("key") === kunci;
}
