import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker — Vercel safely ignores this setting
  output: 'standalone',
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  devIndicators: false,
};

export default nextConfig;
