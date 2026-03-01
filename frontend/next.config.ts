import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build.
  // Creates a self-contained .next/standalone folder that can run without node_modules.
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
