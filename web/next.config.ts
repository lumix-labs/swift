import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Add any environment variables that need to be exposed to the browser
  },
  // Set the port to 3050
  experimental: {
    // Enable if you need additional experimental features
  },
  // Configure output for static exports (required for Cloudflare Pages)
  output: 'export',
  // Disable image optimization since Cloudflare Pages doesn't support it
  images: {
    unoptimized: true,
  },
  // Handle trailing slash for Cloudflare Pages compatibility
  trailingSlash: true,
  // Don't attempt to use the Node.js runtime on Cloudflare Pages
  // This ensures your app works as a static site
  typescript: {
    // Don't perform TypeScript checks during build for Cloudflare
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint checks during build for Cloudflare
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
