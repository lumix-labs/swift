/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
  },
  poweredByHeader: false,
  // Adding production source maps for better debugging
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig