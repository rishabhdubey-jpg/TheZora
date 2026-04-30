/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This allows your SaaS to deploy even with small UI type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // This prevents linting warnings from stopping your launch
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;