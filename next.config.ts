import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Lint is run as its own step (`npm run lint`); don't let style-only ESLint
  // errors (e.g. react/no-unescaped-entities) fail the production build/deploy.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Don't optimize external favicon URLs
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    // The Render free instance has 512 MB. Resizing many images in parallel
    // (sharp) got it OOM-killed on the home page, so optimize one at a time
    // and stream source files instead of buffering them.
    imgOptConcurrency: 1,
    imgOptSequentialRead: true,
  },
  // Suppress favicon fetch errors in development
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Increased to 60 seconds to prevent page disposal when switching tabs
    pagesBufferLength: 5, // Increased buffer to keep more pages in memory
  },
};

export default nextConfig;
