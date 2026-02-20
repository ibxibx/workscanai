import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      watchOptions: {
        ignoredPatterns: [
          "**/backend/**",
          "**/*.db",
          "**/*.db-shm",
          "**/*.db-wal",
        ],
      },
    },
  },
};

export default nextConfig;
