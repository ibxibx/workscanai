import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone', // commented out — breaks Vercel deployment (use for Docker only)
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  devIndicators: false,
};

export default nextConfig;
