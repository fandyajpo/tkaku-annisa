let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function nada(freq: number, mulai: number, durasi: number, tipe: OscillatorType = "triangle", gain = 0.14) {
  const c = ac();
  const t = c.currentTime + mulai;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipe;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durasi);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + durasi + 0.05);
}

const KUNCI_SUARA = "tkaku-suara";

export const sfx = {
  aktif: localStorage.getItem(KUNCI_SUARA) !== "mati",

  setAktif(nyala: boolean) {
    this.aktif = nyala;
    localStorage.setItem(KUNCI_SUARA, nyala ? "nyala" : "mati");
  },

  benar() {
    if (!this.aktif) return;
    nada(659.25, 0, 0.16);
    nada(880, 0.11, 0.3);
    nada(1174.66, 0.22, 0.34, "triangle", 0.1);
  },

  salah() {
    if (!this.aktif) return;
    nada(246.94, 0, 0.2, "sine", 0.11);
    nada(196, 0.13, 0.32, "sine", 0.09);
  },

  klik() {
    if (!this.aktif) return;
    nada(587.33, 0, 0.05, "square", 0.03);
  },
};
