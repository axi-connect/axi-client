import { FacebookSdkError } from "@/modules/channels/domain/meta-signup";

/**
 * Cargador del SDK de Facebook.
 *
 * Singleton de módulo con promesa memoizada: una sola carga por pestaña, y a
 * prueba de los montajes dobles de React 19 en StrictMode. Sin la memoización,
 * dos montajes inyectan dos `<script>` y el segundo `FB.init` pisa la
 * configuración del primero.
 *
 * **Se descarta `next/script` a propósito.** No entrega una promesa por
 * instancia, deduplica por `src` con semántica opaca y su `onLoad` no es fiable
 * si el componente se remonta. Lo que este flujo necesita es saber CON CERTEZA si
 * el SDK está listo antes del clic, porque `FB.login` tiene que invocarse de
 * forma síncrona dentro del handler o el navegador bloquea el popup.
 *
 * Tampoco se usa `window.fbAsyncInit`: es un global compartido que cualquier
 * otro script puede sobrescribir.
 */

/** Tipado mínimo del global. Vive aquí para no ensuciar `src/core/types/`. */
export type FbLoginResponse = {
  authResponse?: { code?: string; accessToken?: string } | null;
  status?: string;
};

export type FbLoginOptions = {
  config_id: string;
  response_type: "code";
  override_default_response_type: boolean;
  extras: { setup: Record<string, unknown>; featureType: string; sessionInfoVersion: string };
};

export type FacebookSdk = {
  init(options: {
    appId: string;
    version: string;
    xfbml: boolean;
    cookie: boolean;
    autoLogAppEvents: boolean;
  }): void;
  login(callback: (response: FbLoginResponse) => void, options: FbLoginOptions): void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

const SCRIPT_ID = "facebook-jssdk";
const SCRIPT_SRC = "https://connect.facebook.net/en_US/sdk.js";
/** Los bloqueadores y muchas redes corporativas cuelgan la petición sin fallar. */
const LOAD_TIMEOUT_MS = 15_000;

let pending: Promise<FacebookSdk> | null = null;

/**
 * Carga el SDK e inicializa la app. Idempotente: llamadas concurrentes o
 * posteriores comparten la MISMA promesa.
 *
 * Lanza `FacebookSdkError` tipado, nunca un error genérico: el motivo decide qué
 * ve el usuario. `blocked` y `timeout` llevan al camino manual; tragárselos
 * dejaría la aplicación colgada en "preparando" sin explicación.
 */
export function loadFacebookSdk(appId: string | null, graphApiVersion: string): Promise<FacebookSdk> {
  if (appId === null || appId.trim() === "") {
    return Promise.reject(
      new FacebookSdkError("no_app_id", "El backend no entregó el app_id de Meta"),
    );
  }
  if (pending !== null) return pending;

  pending = new Promise<FacebookSdk>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new FacebookSdkError("blocked", "El SDK de Meta solo carga en el navegador"));
      return;
    }

    // Ya estaba cargado por otra pestaña de la SPA o por un `pending` anterior
    // que se limpió: se reutiliza en vez de inyectar un segundo script.
    if (window.FB !== undefined) {
      window.FB.init(baseInitOptions(appId, graphApiVersion));
      resolve(window.FB);
      return;
    }

    const timeout = setTimeout(() => {
      // No se limpia el `<script>`: puede que llegue tarde, y quitarlo mientras
      // el navegador lo está descargando provoca un error de red confuso.
      reject(
        new FacebookSdkError(
          "timeout",
          "El SDK de Meta no respondió en 15 segundos (bloqueador de anuncios o red restringida)",
        ),
      );
    }, LOAD_TIMEOUT_MS);

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      clearTimeout(timeout);
      if (window.FB === undefined) {
        // El script cargó pero no dejó el global: pasa cuando un bloqueador
        // devuelve un 200 con cuerpo vacío
        reject(new FacebookSdkError("blocked", "El SDK de Meta cargó sin inicializarse"));
        return;
      }
      window.FB.init(baseInitOptions(appId, graphApiVersion));
      resolve(window.FB);
    };

    const onError = () => {
      clearTimeout(timeout);
      reject(
        new FacebookSdkError(
          "blocked",
          "No se pudo descargar el SDK de Meta (bloqueador de anuncios o red restringida)",
        ),
      );
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (existing === null) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });

  // Un fallo NO se memoiza: el usuario puede desactivar el bloqueador y
  // reintentar sin recargar la página. Con la promesa rechazada cacheada, el
  // botón de reintentar no funcionaría nunca.
  pending.catch(() => {
    pending = null;
  });

  return pending;
}

function baseInitOptions(appId: string, graphApiVersion: string) {
  return {
    appId,
    version: graphApiVersion,
    xfbml: false,
    // Deliberado: no queremos que el SDK escriba cookies de sesión de Facebook
    // en nuestro dominio
    cookie: false,
    autoLogAppEvents: false,
  };
}

/** Solo para tests: olvida la promesa memoizada. */
export function resetFacebookSdkForTests(): void {
  pending = null;
}
