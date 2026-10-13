export type AnalisisData = Record<string, string | number | boolean>;

export function track(nama: string, data?: AnalisisData) {
  const umami = (
    window as unknown as { umami?: { track: (n: string, d?: AnalisisData) => void } }
  ).umami;
  umami?.track(nama, data);
}
