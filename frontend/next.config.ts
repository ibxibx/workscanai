import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone', // commented out — breaks Vercel deployment (use for Docker only)
  reactStrictMode: false,
  async redirects() {
    return [
      // Convenience redirects for commonly shared/typed URLs
      { source: '/analyze',     destination: '/#analyze', permanent: false },
      { source: '/new-analysis', destination: '/#analyze', permanent: false },
      { source: '/new',          destination: '/#analyze', permanent: false },
    ]
  },
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
