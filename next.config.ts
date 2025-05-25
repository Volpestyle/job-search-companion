import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Required for server actions with large dependencies
    serverComponentsExternalPackages: ['playwright-core', '@browserbasehq/stagehand'],
  },
};

export default nextConfig;
