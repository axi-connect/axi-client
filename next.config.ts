import type { NextConfig } from "next";

/**
 * Convierte orígenes (URLs de variables de entorno) en `remotePatterns` de
 * next/image. Evita hardcodear los hosts del despliegue en el repositorio: en
 * desarrollo apuntan a MinIO local y en producción al storage y la API reales.
 *
 * Se evalúa en build time, como todo `next.config.ts`.
 */
function remotePatternsFromOrigins(...origins: (string | undefined)[]) {
  return origins
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => new URL(origin))
    .map((url) => ({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    }));
}

const nextConfig: NextConfig = {
  // Servidor autocontenido en `.next/standalone`: la imagen de Docker no
  // necesita arrastrar `node_modules` completo (~360 MB frente a ~1.5 GB).
  output: "standalone",

  // La versión de Next no aporta nada al cliente y sí a quien busca exploits.
  poweredByHeader: false,

  /**
   * Redirects de la capa pública (docs/plans/public-gtm-plan.md §F1).
   *
   * Dos familias:
   *  1. Rutas que la navegación anuncia pero que NO son página propia: los
   *     precios viven en la sección `#planes` de la home y la demo en
   *     /contacto. Se redirige en lugar de duplicar contenido (y de partir el
   *     SEO en dos URLs que compiten).
   *  2. Rutas heredadas de la plantilla original del sitio, que quedaron
   *     enlazadas desde material externo y desde el propio navbar antiguo.
   *
   * Todas permanentes (308): son decisiones de arquitectura de URLs, no
   * pruebas temporales.
   */
  async redirects() {
    return [
      { source: "/precios", destination: "/#planes", permanent: true },
      { source: "/demo", destination: "/contacto", permanent: true },
      // Legacy de la plantilla: rutas en inglés y de un registro que no existe
      // (el alta de empresas es asistida, ver knowledge-base §15.1).
      { source: "/products", destination: "/productos", permanent: true },
      { source: "/solutions", destination: "/soluciones", permanent: true },
      { source: "/login", destination: "/auth/login", permanent: true },
      { source: "/signup", destination: "/contacto", permanent: true },
      { source: "/legal", destination: "/legal/terminos", permanent: true },
      // Canales: las rutas interceptadas del workspace (`@modal/(.)channels/*`)
      // se borraron en F1 porque no tenían página subyacente y una recarga daba
      // 404. Las URLs canónicas viven en `/settings/channels` (D4 del plan). El
      // ORDEN importa: Next devuelve la primera coincidencia, así que `create`
      // tiene que ir antes que `:id` o se trataría como un id de canal.
      // F1 apuntaba `create` al listado porque el wizard no existía; F3 lo
      // repunta a su destino real.
      { source: "/workspace/channels/create", destination: "/settings/channels/connect", permanent: true },
      { source: "/workspace/channels/:id", destination: "/settings/channels/:id", permanent: true },
    ];
  },

  /**
   * Cabeceras de aislamiento de origen — F2 de canales Meta.
   *
   * **`Cross-Origin-Opener-Policy: same-origin-allow-popups` no es opcional.**
   * El Embedded Signup de Meta abre un popup y devuelve el `code` por el callback
   * de `FB.login`, que viaja a través de `window.opener`. Con el valor que uno
   * pondría "por seguridad", `same-origin`, el popup PIERDE `window.opener` y ese
   * callback **nunca se ejecuta**: el usuario ve la ventana de Meta completarse
   * y la aplicación se queda colgada en "procesando", sin ningún error en consola
   * ni en red. Se fija explícitamente para que nadie lo endurezca sin entender la
   * consecuencia.
   *
   * **PROHIBIDO añadir `Cross-Origin-Embedder-Policy: require-corp`**: rompe los
   * iframes del SDK de Facebook, que es cross-origin y no envía CORP.
   *
   * CSP objetivo para cuando el proyecto adopte una — hoy no hay ninguna, así que
   * el SDK carga sin tocar nada. Cuando se añada, estos tres dominios son los que
   * el flujo necesita, y omitir cualquiera lo rompe:
   *
   *   script-src  'self' https://connect.facebook.net
   *   frame-src   'self' https://web.facebook.com https://www.facebook.com
   *   connect-src 'self' https://graph.facebook.com https://www.facebook.com
   */
  async headers() {
    return [
      {
        // Solo el panel privado: la capa pública no abre popups de Meta y no
        // necesita relajar nada.
        source: "/:path((?!api/).*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },

  // La verja de ESLint está ACTIVA en el build: el código nuevo no introduce
  // errores de lint (regla del proyecto, docs/architecture.md §15).
  images: {
    // Formatos modernos: la capa pública sirve fotos de producto y de clientes
    // desde Cloudinary; sin esto Next las entrega en el formato original.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "pps.whatsapp.net" }, // avatares de WhatsApp
      { protocol: "https", hostname: "res.cloudinary.com" }, // assets de marca
      // Storage de media del chat y estáticos del backend (QR de WhatsApp Web).
      // Las burbujas usan <img> nativa (URL firmada rotativa), pero otros usos
      // de next/image sobre el storage necesitan el pattern.
      //
      // Sin NEXT_PUBLIC_STORAGE_URL se asume el MinIO de docker-compose (dev).
      // No se deja `localhost` fijo en la lista porque en producción sería un
      // origen permitido innecesario apuntando al propio servidor.
      ...remotePatternsFromOrigins(
        process.env.NEXT_PUBLIC_STORAGE_URL ?? "http://localhost:9000",
        process.env.NEXT_PUBLIC_API_BASE_URL,
      ),
    ],
  },
};

export default nextConfig;
