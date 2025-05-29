// Environment configuration for server components only
// For client components, use client-env.ts

/**
 * Validate required server environment variables
 */
function validateServerEnvironment(): void {
  const missing: string[] = [];

  if (!process.env.OLLAMA_HOST) missing.push('OLLAMA_HOST');
  if (!process.env.OLLAMA_PORT) missing.push('OLLAMA_PORT');
  if (!process.env.OLLAMA_MODEL) missing.push('OLLAMA_MODEL');
  if (!process.env.STAGEHAND_ENV) missing.push('STAGEHAND_ENV');

  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  }
}

// Validate environment on module load
validateServerEnvironment();

// Ollama configuration
export const ollamaConfig = {
  host: process.env.OLLAMA_HOST!,
  port: process.env.OLLAMA_PORT!,
  modelName: process.env.OLLAMA_MODEL!,
};

// Also set public env vars for client access (without exposing sensitive data)
if (typeof process.env.NEXT_PUBLIC_OLLAMA_HOST === 'undefined') {
  process.env.NEXT_PUBLIC_OLLAMA_HOST = ollamaConfig.host;
  process.env.NEXT_PUBLIC_OLLAMA_PORT = ollamaConfig.port;
  process.env.NEXT_PUBLIC_OLLAMA_MODEL = ollamaConfig.modelName;
}

// AWS configuration for cloud browser sessions (optional)
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1', // AWS region can have sensible default
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  enabled: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
};

// Stagehand configuration
export const stagehandEnv = {
  environment: process.env.STAGEHAND_ENV!,
  // AWS configuration (only needed if using AWS environment)
  aws: awsConfig,
};

// Also set public env vars for client access (without exposing sensitive data)
if (typeof process.env.NEXT_PUBLIC_STAGEHAND_ENV === 'undefined') {
  process.env.NEXT_PUBLIC_STAGEHAND_ENV = stagehandEnv.environment;
  process.env.NEXT_PUBLIC_HAS_AWS_CONFIG = awsConfig.enabled ? 'true' : 'false';
}
