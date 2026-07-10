import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La verja de ESLint está ACTIVA en el build: el código nuevo no introduce
  // errores de lint (regla del proyecto, docs/architecture.md §15).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pps.whatsapp.net" }, // avatares de WhatsApp
      { protocol: "https", hostname: "res.cloudinary.com" }, // assets de marca
    ],
  },
};

export default nextConfig;
