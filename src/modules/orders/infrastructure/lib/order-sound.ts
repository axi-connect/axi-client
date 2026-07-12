/**
 * Sonido sutil de pedido nuevo (F11). Singleton Audio con throttle: una ráfaga
 * de eventos WS no debe sonar como metralleta. Autoplay-safe: si el navegador
 * bloquea la reproducción (sin gesto previo), falla en silencio.
 */
const SOUND_SRC = "/audio/notification-sound.mp3";
const THROTTLE_MS = 1500;
const VOLUME = 0.35;

let audio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;

export function playOrderSound(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return;
  lastPlayedAt = now;
  try {
    audio ??= new Audio(SOUND_SRC);
    audio.volume = VOLUME;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay bloqueado sin interacción previa: sin sonido, sin error.
    });
  } catch {
    // Audio no disponible (SSR/tests): silencio.
  }
}
