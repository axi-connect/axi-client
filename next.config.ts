import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pps.whatsapp.net" },   // WhatsApp images
      { protocol: "https", hostname: "res.cloudinary.com" }, // Assets images
      { protocol: "http", hostname: "172.18.16.1", port: "3001", pathname: "/public/qr-images/**" }, // QR Code images
    ],
  },
};

export default nextConfig;
