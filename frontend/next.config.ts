import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' is for Docker only — Vercel handles its own output format
  // output: 'standalone',
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  devIndicators: false,
};

export default nextConfig;
