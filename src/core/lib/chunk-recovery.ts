/**
 * Recuperación de chunks que no cargan (hotfix «Application error», 2026-10-19).
 *
 * Cada push a `main` sustituye el contenedor del cliente. Un HTML de la versión
 * anterior (una pestaña abierta, una restaurada, el ir/volver del navegador, o
 * un HTML que se descargó justo antes del cambio) pide chunks con hashes que la
 * versión nueva ya no tiene. Los `next/dynamic` del layout raíz (toaster, Modal)
 * y de la home (fibras del hero) lanzan entonces `ChunkLoadError` en el render y,
 * sin frontera de error, Next pinta su pantalla genérica.
 *
 * La causa se ataca en el despliegue (la imagen retiene los estáticos de builds
 * anteriores: `scripts/retain-static.sh`). Esto es la red de seguridad: si aun
 * así un chunk falla, recargar UNA vez trae el HTML nuevo con sus chunks.
 *
 * Dos copias de la misma regla, a propósito:
 *  - `CHUNK_RECOVERY_SCRIPT`: ES5 en línea en el <head>. Tiene que funcionar
 *    cuando lo que falla son justamente los chunks, así que no puede vivir en uno.
 *  - `isChunkLoadError` / `reloadOnce`: para las fronteras de error de React.
 * Comparten la clave y la ventana: una recarga por ventana entre las dos.
 *
 * Documento: docs/plans/hotfix_application_error_plan.md
 */

/** Clave de sessionStorage con el instante de la última recarga de recuperación. */
export const CHUNK_RELOAD_KEY = "axi:chunk-reload";

/**
 * Dentro de esta ventana no se vuelve a recargar: si el chunk sigue fallando
 * tras una recarga, no es un HTML viejo (red caída, servidor en el swap) y
 * recargar en bucle solo empeora las cosas. Se pinta la pantalla de error.
 */
export const CHUNK_RELOAD_WINDOW_MS = 30_000;

/** Endpoint de la telemetría propia (`app/api/client-errors/route.ts`). */
export const CLIENT_ERRORS_ENDPOINT = "/api/client-errors";

const CHUNK_MESSAGE = /Loading (CSS )?chunk [^\s]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;

/** ¿El error es un chunk de JS o CSS que no cargó? (webpack o import() nativo). */
export function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === "ChunkLoadError") return true;
  return typeof message === "string" && CHUNK_MESSAGE.test(message);
}

/**
 * Recarga la página si no se recargó por esta causa en la ventana. Devuelve si
 * recargó. Sin sessionStorage (privado antiguo, webviews con storage bloqueado)
 * NO recarga: sin dónde anotar el intento no hay forma de evitar un bucle.
 */
export function reloadOnce(now: number = Date.now(), reload: () => void = () => window.location.reload()): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0;
    if (now - last < CHUNK_RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

/**
 * Script en línea del <head> del layout raíz (`app/layout.tsx`). ES5 y sin
 * dependencias. Dos señales:
 *  - `error` en captura sobre <script>/<link> de `/_next/static/`: un chunk de
 *    entrada o uno diferido de webpack que dio 404/502 (los eventos de error de
 *    recursos no burbujean; en captura sí llegan a window).
 *  - `unhandledrejection` con un ChunkLoadError: el `import()` que nadie atrapó.
 * Antes de recargar deja constancia con un beacon (sobrevive a la recarga); como
 * mucho 3 por carga: un HTML viejo hace fallar decenas de chunks a la vez.
 */
export const CHUNK_RECOVERY_SCRIPT = `(function(){
var K=${JSON.stringify(CHUNK_RELOAD_KEY)},W=${CHUNK_RELOAD_WINDOW_MS},E=${JSON.stringify(CLIENT_ERRORS_ENDPOINT)},done=false,sent=0;
function report(asset,name){try{if(!navigator.sendBeacon||sent>=3)return;sent++;var b=JSON.stringify({kind:"chunk",name:name,asset:String(asset||"").slice(0,300),path:location.pathname});navigator.sendBeacon(E,new Blob([b],{type:"application/json"}));}catch(e){}}
function recover(asset,name){if(done)return;var last;try{last=+sessionStorage.getItem(K)||0;}catch(e){report(asset,name+":no-storage");return;}
var reload=Date.now()-last>=W;report(asset,reload?name:name+":no-reload");if(!reload)return;
try{sessionStorage.setItem(K,String(Date.now()));}catch(e){return;}done=true;location.reload();}
window.addEventListener("error",function(ev){var t=ev&&ev.target;if(!t||t===window||!t.tagName)return;var tag=t.tagName,u=t.src||t.href||"";
if((tag==="SCRIPT"||tag==="LINK")&&u.indexOf("/_next/static/")!==-1)recover(u,"asset-error");},true);
window.addEventListener("unhandledrejection",function(ev){var r=ev&&ev.reason;if(!r)return;
if(r.name==="ChunkLoadError"||/Loading (CSS )?chunk/.test(r.message||""))recover(r.request||"",r.name||"ChunkLoadError");});
})();`;
