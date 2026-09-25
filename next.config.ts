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
   *  1. Rutas que la navegación anuncia pero que NO son página propia: la
   *     demo vive en /contacto. Se redirige en lugar de duplicar contenido (y
   *     de partir el SEO en dos URLs que compiten).
   *  2. Rutas heredadas de la plantilla original del sitio, que quedaron
   *     enlazadas desde material externo y desde el propio navbar antiguo.
   *
   * Todas permanentes (308): son decisiones de arquitectura de URLs, no
   * pruebas temporales.
   */
  async redirects() {
    return [
      // `/precios` YA NO redirige: es página propia desde el rediseño del nav
      // (docs/plans/navigation_standardization_plan.md). Dejar el redirect aquí
      // haría inalcanzable la página, porque el redirect gana a la ruta.
      { source: "/demo", destination: "/contacto", permanent: true },
      // Legacy de la plantilla: rutas en inglés y de un registro que no existe
      // (el alta de empresas es asistida, ver knowledge-base §15.1).
      { source: "/products", destination: "/productos", permanent: true },
      { source: "/solutions", destination: "/soluciones", permanent: true },
      { source: "/login", destination: "/auth/login", permanent: true },
      // El registro autoservicio vive en /comenzar (onboarding_self_service_plan.md).
      { source: "/signup", destination: "/comenzar", permanent: true },
      { source: "/registro", destination: "/comenzar", permanent: true },
      { source: "/legal", destination: "/legal/terminos", permanent: true },
      // Canales: las rutas interceptadas del workspace (`@modal/(.)channels/*`)
      // se borraron en F1 porque no tenían página subyacente y una recarga daba
      // 404. Las URLs canónicas viven en `/settings/channels` (D4 del plan). El
      // ORDEN importa: Next devuelve la primera coincidencia, así que `create`
      // tiene que ir antes que `:id` o se trataría como un id de canal.
      // F1 apuntaba `create` al listado porque el wizard no existía; F3 lo
      // repunta a su destino real.
      // «Medios de pago» dejó de ser pestaña de Mi empresa y pasó al hub Pagos
      // de Ventas (F2 del programa Cobros). La URL vieja está compartida en
      // conversaciones y correos: redirige, no 404.
      {
        source: "/settings/company/pagos",
        destination: "/settings/payments",
        permanent: true,
      },
      {
        source: "/workspace/channels/create",
        destination: "/settings/channels/connect",
        permanent: true,
      },
      // Estudio de agentes (2026-09-21): los modales @form pasaron a páginas y los characters desaparecieron
      {
        source: "/admin/agents/create",
        destination: "/admin/agents/new",
        permanent: true,
      },
      {
        source: "/admin/agents/update/:id",
        destination: "/admin/agents/:id",
        permanent: true,
      },
      {
        source: "/admin/agents/characters/:path*",
        destination: "/admin/agents",
        permanent: true,
      },
      // Gobierno de la voz (2026-09-21): la pantalla del tenant murió; el interruptor y la llave son de /platform
      {
        source: "/settings/voice",
        destination: "/admin/agents",
        permanent: true,
      },
      {
        source: "/workspace/channels/:id",
        destination: "/settings/channels/:id",
        permanent: true,
      },
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
   *   script-src  'self' https://connect.facebook.net https://www.googletagmanager.com
   *               https://challenges.cloudflare.com
   *   frame-src   'self' https://web.facebook.com https://www.facebook.com
   *               https://challenges.cloudflare.com
   *   connect-src 'self' https://graph.facebook.com https://www.facebook.com
   *               https://www.google-analytics.com https://*.analytics.google.com
   *               https://challenges.cloudflare.com
   *   img-src     'self' data: https://www.facebook.com https://www.google-analytics.com
   *
   * Los dominios de Google Tag Manager y de Analytics son de la capa de
   * analítica (`core/analytics/`), añadida con el SEO: omitirlos dejaría el
   * sitio sin medición y sin ningún error visible.
   *
   * `challenges.cloudflare.com` es el captcha del alta autoservicio: sirve el
   * script, el iframe del widget y el POST del token. Omitirlo dejaría
   * `/comenzar` sin captcha y, como el backend exige un token válido en
   * producción, sin una sola alta posible.
   */
  async headers() {
    return [
      {
        // Las fuentes de marca que la VISTA PREVIA de documentos (F7 Cobros)
        // carga dentro de un <iframe sandbox>: ese documento es de origen opaco
        // y las fuentes son de las pocas cosas que el navegador somete a CORS
        // aunque el CSS las permita. Sin esta cabecera el iframe cae en
        // silencio a la fuente del sistema y la previa deja de parecerse al
        // PDF. Son estáticos públicos e inmutables: no se relaja nada.
        source: "/fonts/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Solo el panel privado: la capa pública no abre popups de Meta y no
        // necesita relajar nada.
        source: "/:path((?!api/).*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // Páginas con un token de un solo uso (entrega_bienvenida_plan.md, F4): el
      // kit lo lleva en el path y las de contraseña en el `#`. `no-referrer`
      // impide que un clic hacia fuera (el WhatsApp del asesor, una fuente, el
      // panel) lo arrastre en el `Referer`. Van DESPUÉS de la regla general a
      // propósito: cuando dos reglas fijan la misma cabecera, gana la última.
      // El kit además lleva `X-Robots-Tag`: el `<meta robots>` de la página no
      // cubre a quien lee solo cabeceras, ni a una respuesta de error.
      {
        source: "/bienvenida/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      ...["/auth/crear-contrasena", "/auth/restablecer", "/auth/olvide-contrasena", "/auth/soporte"].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },

  // La verja de ESLint está ACTIVA en el build: el código nuevo no introduce
  // errores de lint (regla del proyecto, docs/architecture.md §15).
  images: {
    // Formatos modernos: la capa pública sirve fotos de producto y de clientes
    // desde Cloudinary; sin esto Next las entrega en el formato original.
    formats: ["image/avif", "image/webp"],
    // 31 días. El default de Next son 60 segundos, así que cada imagen se
    // reoptimizaba constantemente: coste de CPU en el servidor y, sobre todo,
    // una descarga nueva para el visitante que vuelve. Las fotos de producto y
    // de casos cambian de URL cuando cambian (Cloudinary versiona el path), así
    // que cachearlas largo no puede servir una imagen obsoleta.
    minimumCacheTTL: 2678400,
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
