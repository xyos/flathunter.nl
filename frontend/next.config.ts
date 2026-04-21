import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cloud.funda.nl" },
      { protocol: "https", hostname: "**.pararius.com" },
      { protocol: "https", hostname: "**.pararius.nl" },
    ],
  },
  // Allow better-sqlite3 native module
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
