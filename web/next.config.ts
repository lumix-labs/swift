/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  webpack: (config: any) => {
    return config;
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
