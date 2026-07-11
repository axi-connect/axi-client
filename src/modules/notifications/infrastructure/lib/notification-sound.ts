/**
 * Sonido de notificación — best-effort.
 *
 * Singleton de `HTMLAudioElement` con throttle (una ráfaga de eventos no
 * suena más de una vez por segundo). La política de autoplay del navegador
 * rechaza `play()` antes del primer gesto del usuario en la sesión:
 * degradación silenciosa, sin logs ni permisos.
 */
const SOUND_URL = "/audio/notification-sound.mp3"
const THROTTLE_MS = 1000

let audio: HTMLAudioElement | null = null
let lastPlayedAt = 0

export function playNotificationSound(): void {
  if (typeof window === "undefined") return
  const now = Date.now()
  if (now - lastPlayedAt < THROTTLE_MS) return
  lastPlayedAt = now

  audio ??= new Audio(SOUND_URL)
  audio.currentTime = 0
  void audio.play().catch(() => {
    // Autoplay bloqueado o audio no disponible: la notificación visual basta.
  })
}
