import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "http", hostname: "172.18.16.1", port: "3001", pathname: "/public/qr-images/**" },
    ],
  },
};

export default nextConfig;
