'use client';

// A safe client-side environment configuration
// This only includes environment variables that are safe to expose to the client
// We use Next.js public environment variables (NEXT_PUBLIC_*) to safely pass configuration

/**
 * Ollama configuration for client components
 */
export const clientOllamaConfig = {
  // Using default values when environment variables aren't available on client
  host: process.env.NEXT_PUBLIC_OLLAMA_HOST || 'localhost',
  port: process.env.NEXT_PUBLIC_OLLAMA_PORT || '11434',
  modelName: process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3',
};

/**
 * AWS configuration for client components
 * Only exposes the region and whether AWS is configured (not credentials)
 */
export const clientAwsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  isConfigured: process.env.NEXT_PUBLIC_HAS_AWS_CONFIG === 'true',
};

/**
 * Stagehand configuration for client components
 */
export const clientStagehandConfig = {
  // Default to LOCAL environment in client
  environment: process.env.NEXT_PUBLIC_STAGEHAND_ENV || 'LOCAL',
};
