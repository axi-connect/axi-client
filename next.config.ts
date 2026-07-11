import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La verja de ESLint está ACTIVA en el build: el código nuevo no introduce
  // errores de lint (regla del proyecto, docs/architecture.md §15).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pps.whatsapp.net" }, // avatares de WhatsApp
      { protocol: "https", hostname: "res.cloudinary.com" }, // assets de marca
      // Storage de media del chat (MinIO en dev; ajustar host S3/CDN en prod).
      // Las burbujas usan <img> nativa (URL firmada rotativa), pero otros usos
      // de next/image sobre el storage necesitan el pattern.
      { protocol: "http", hostname: "localhost", port: "9000" },
    ],
  },
};

export default nextConfig;
