// Environment configuration for server components only
// For client components, use client-env.ts

// Ollama configuration
export const ollamaConfig = {
  host: process.env.OLLAMA_HOST || '127.0.0.1',
  port: process.env.OLLAMA_PORT || '11434',
  modelName: process.env.OLLAMA_MODEL || 'llama3',
};

// Also set public env vars for client access (without exposing sensitive data)
if (typeof process.env.NEXT_PUBLIC_OLLAMA_HOST === 'undefined') {
  process.env.NEXT_PUBLIC_OLLAMA_HOST = ollamaConfig.host;
  process.env.NEXT_PUBLIC_OLLAMA_PORT = ollamaConfig.port;
  process.env.NEXT_PUBLIC_OLLAMA_MODEL = ollamaConfig.modelName;
}

// AWS configuration for cloud browser sessions
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  enabled: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
};

// Stagehand configuration
export const stagehandEnv = {
  // Use LOCAL for development, AWS for production
  environment: process.env.STAGEHAND_ENV || 'LOCAL',
  // Set to true to use mock data instead of real browser automation
  useMock: process.env.USE_MOCK_DATA === 'true',
  // AWS configuration (only needed if using AWS environment)
  aws: awsConfig,
};

// Also set public env vars for client access (without exposing sensitive data)
if (typeof process.env.NEXT_PUBLIC_STAGEHAND_ENV === 'undefined') {
  process.env.NEXT_PUBLIC_STAGEHAND_ENV = stagehandEnv.environment;
  process.env.NEXT_PUBLIC_USE_MOCK_DATA = stagehandEnv.useMock ? 'true' : 'false';
  process.env.NEXT_PUBLIC_HAS_AWS_CONFIG = awsConfig.enabled ? 'true' : 'false';
}