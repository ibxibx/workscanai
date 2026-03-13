import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone', // commented out — breaks Vercel deployment (use for Docker only)
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  devIndicators: false,
};

export default nextConfig;
