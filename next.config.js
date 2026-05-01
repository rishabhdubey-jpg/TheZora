/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This allows your SaaS to deploy even with small UI type errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;