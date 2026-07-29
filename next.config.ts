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

  // La verja de ESLint está ACTIVA en el build: el código nuevo no introduce
  // errores de lint (regla del proyecto, docs/architecture.md §15).
  images: {
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
