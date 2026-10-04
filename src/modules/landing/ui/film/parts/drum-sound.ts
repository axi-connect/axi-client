/**
 * El sonido de la ruleta del riel (pedido de la dueña): un clic de tambor en
 * cada paso y una confirmación de dos notas al elegir. Sin archivos de audio:
 * todo se sintetiza con Web Audio en el momento.
 *
 * - Un solo AudioContext, perezoso: se crea (o se reanuda) en el primer gesto
 *   real del visitante —clic, toque o tecla—. La rueda NO cuenta como
 *   activación en Chrome, así que antes de ese gesto los tics de rueda callan
 *   sin error; después ya suenan.
 * - Como mucho un tic cada 35 ms: un giro rápido no se vuelve un zumbido.
 * - Silencio con `prefers-reduced-motion: reduce`, con la pestaña oculta o si
 *   el navegador no tiene Web Audio.
 */

type AudioCtor = typeof AudioContext;

const TICK_GAP_MS = 35;
/** Pico del tic. Con el ruido en paso banda (Q 6) a 0,06 apenas llegaba energía: no se oía. */
const TICK_GAIN = 0.18;
const SELECT_GAIN = 0.05;

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let activated = false;
let primed = false;
let lastTick = -Infinity;

function ctor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function muted(): boolean {
  if (typeof document !== "undefined" && document.hidden) return true;
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** El contexto, solo si ya hubo un gesto (antes, Chrome lo dejaría suspendido). */
function audio(): AudioContext | null {
  if (!activated) return null;
  if (!ctx) {
    const C = ctor();
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

const onGesture = () => {
  activated = true;
  audio();
};

/**
 * Escucha el primer gesto real para poder crear el contexto. Se llama al
 * montar la ruleta; es idempotente.
 */
export function primeDrumSound(): void {
  if (primed || typeof document === "undefined") return;
  primed = true;
  for (const type of ["pointerdown", "keydown", "touchstart"] as const) {
    document.addEventListener(type, onGesture, { capture: true, passive: true });
  }
}

/** 12 ms de ruido blanco, una vez: la textura del clic. */
function noiseBuffer(a: AudioContext): AudioBuffer {
  if (noise) return noise;
  const length = Math.max(1, Math.round(a.sampleRate * 0.012));
  noise = a.createBuffer(1, length, a.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

/**
 * Un paso de la ruleta, como el diente de un tambor: un «toc» de triángulo que
 * cae de ~1,9 a ~0,9 kHz en 18 ms (±3 % por paso para que no suene robótico) y
 * un soplo de ruido en paso alto que le da el filo mecánico. Unos 30 ms en total.
 */
export function drumTick(now: number = typeof performance !== "undefined" ? performance.now() : Date.now()): void {
  if (now - lastTick < TICK_GAP_MS) return;
  if (muted()) return;
  const a = audio();
  if (!a) return;
  lastTick = now;
  // Un respiro de 5 ms: programar en currentTime exacto puede caer ya en el pasado.
  const t = a.currentTime + 0.005;
  const drift = 1 + (Math.random() * 2 - 1) * 0.03;

  const osc = a.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(1900 * drift, t);
  osc.frequency.exponentialRampToValueAtTime(900 * drift, t + 0.018);
  const body = a.createGain();
  body.gain.setValueAtTime(0.0001, t);
  body.gain.exponentialRampToValueAtTime(TICK_GAIN, t + 0.0015);
  body.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc.connect(body).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.035);

  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const high = a.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 2500;
  const edge = a.createGain();
  edge.gain.setValueAtTime(TICK_GAIN * 0.45, t);
  edge.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  src.connect(high).connect(edge).connect(a.destination);
  src.start(t);
  src.stop(t + 0.013);
}

/**
 * La confirmación al elegir: dos notas suaves ascendentes (880 → 1320 Hz,
 * ~90 ms) con un leve brillo de octava.
 */
export function drumSelect(): void {
  if (muted()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const note = (freq: number, at: number, peak: number, type: OscillatorType) => {
    const osc = a.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    osc.connect(gain).connect(a.destination);
    osc.start(at);
    osc.stop(at + 0.055);
  };
  note(880, t, SELECT_GAIN, "sine");
  note(1320, t + 0.04, SELECT_GAIN, "sine");
  note(2640, t + 0.04, SELECT_GAIN * 0.25, "triangle");
}

/** Solo para tests: vuelve al estado inicial. */
export function resetDrumSoundForTests(): void {
  if (primed && typeof document !== "undefined") {
    for (const type of ["pointerdown", "keydown", "touchstart"] as const) document.removeEventListener(type, onGesture, { capture: true });
  }
  ctx = null;
  noise = null;
  activated = false;
  primed = false;
  lastTick = -Infinity;
}
