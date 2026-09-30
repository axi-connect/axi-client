/**
 * Control del tiempo real SIN cargar socket.io.
 *
 * `AuthProvider` vive en el layout raíz y necesita frenar los sockets cuando la
 * empresa se suspende (F15) y rearmarlos al iniciar sesión. Si importara
 * `socket-manager` directamente, `socket.io-client` viajaría en el JS común de
 * TODAS las rutas, también de la landing, `/comenzar` y `/platform`, que nunca
 * abren un socket.
 *
 * Por eso el gestor se registra aquí al cargarse (solo lo cargan los slices con
 * tiempo real) y este módulo guarda la orden si llega antes: un `halt` sin
 * gestor queda pendiente y se aplica en cuanto el gestor se registre, de modo
 * que un socket abierto después de la suspensión sigue bloqueado.
 */

export type RealtimeControl = {
  halt(): void
  reset(): void
}

let control: RealtimeControl | null = null
let pendingHalt = false

/** Lo llama `socket-manager` una vez, al evaluarse su módulo. */
export function registerRealtimeControl(next: RealtimeControl): void {
  control = next
  if (pendingHalt) next.halt()
}

/** Corta todos los sockets y bloquea nuevas conexiones hasta `resetRealtime()`. */
export function haltRealtime(): void {
  pendingHalt = true
  control?.halt()
}

/** Levanta el bloqueo de `haltRealtime()` (login exitoso). */
export function resetRealtime(): void {
  pendingHalt = false
  control?.reset()
}

/** Solo para tests: vuelve al estado de arranque. */
export function __resetRealtimeControlForTests(): void {
  control = null
  pendingHalt = false
}
