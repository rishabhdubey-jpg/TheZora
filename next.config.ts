import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/client"],
  serverActions: {
    bodySizeLimit: '10gb',
  },
};

export default nextConfig;
