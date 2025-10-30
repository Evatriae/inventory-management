import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Only use static export for Capacitor builds
  ...(process.env.CAPACITOR_BUILD === 'true' && {
    output: 'export',
    trailingSlash: true,
    distDir: 'out',
  }),
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

// Disable PWA for Capacitor builds to avoid conflicts
const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' || process.env.CAPACITOR_BUILD === 'true',
  register: true,
  skipWaiting: true,
})

export default process.env.CAPACITOR_BUILD === 'true' ? nextConfig : withPWAConfig(nextConfig)
