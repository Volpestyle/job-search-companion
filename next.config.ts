import type { NextConfig } from "next";

/**
 * Next.js configuration for Stagehand integration
 *
 * This configuration is necessary because Stagehand uses Playwright for browser automation
 * and thread-stream for logging, which require special handling in Next.js.
 */
const nextConfig: NextConfig = {
  // Make sure Stagehand package is properly transpiled
  transpilePackages: ['@browserbasehq/stagehand'],

  // Configure webpack to handle browser automation libraries correctly
  webpack: (config) => {
    // Add modules that should be treated as external in server components
    if (config.externals) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        'playwright-core',
        'thread-stream'
      ];
    } else {
      config.externals = ['playwright-core', 'thread-stream'];
    }

    // Prevent client-side import of server-only modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'playwright': false,
      '@playwright/test': false,
      'thread-stream': false
    };

    return config;
  },

  // Tell Next.js to treat these packages as external in server components
  experimental: {
    serverComponentsExternalPackages: ['thread-stream', 'playwright-core']
  }
};

export default nextConfig;
