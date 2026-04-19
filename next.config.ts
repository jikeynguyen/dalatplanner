import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/dalatplanner',
  assetPrefix: '/dalatplanner',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
