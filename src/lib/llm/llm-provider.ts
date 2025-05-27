/**
 * Flexible LLM Provider Configuration for Stagehand
 * Leverages Stagehand's built-in LLM provider support with Ollama structured outputs
 */

import { AWSStagehand, StagehandEnvironment } from '@/lib/stagehand/aws-stagehand';

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'anthropic';
  apiKey?: string;
  baseURL?: string;
  model: string;
}

/**
 * Get LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      };

    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-4-sonnet',
      };

    case 'ollama':
    default:
      return {
        provider: 'ollama',
        baseURL: `http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`,
        model: process.env.OLLAMA_MODEL || 'mistral:latest',
      };
  }
}

/**
 * Get Stagehand model name format based on provider
 */
export function getStagehandModelName(config: LLMConfig): string {
  // For Ollama, use the AI SDK format: "ollama/model-name"
  if (config.provider === 'ollama') {
    return `ollama/${config.model}`;
  }
  // For OpenAI and Anthropic, just use the model name directly
  return config.model;
}

/**
 * Create a Stagehand instance with the configured LLM provider
 */
export async function createStagehandWithLLM(options?: {
  verbose?: boolean;
  env?: StagehandEnvironment;
  domSettleTimeoutMs?: number;
  enableCaching?: boolean;
  headless?: boolean;
  config?: LLMConfig;
  awsConfig?: {
    cdpEndpoint?: string;
    region?: string;
    instanceId?: string;
  };
  logger?: (logLine: any) => void;
  logInferenceToFile?: boolean;
}) {
  const llmConfig = options?.config || getLLMConfig();
  const modelName = getStagehandModelName(llmConfig);

  // Prepare model client options based on provider
  const modelClientOptions: any = {};

  if (llmConfig.provider === 'openai') {
    if (!llmConfig.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in your environment.');
    }
    modelClientOptions.apiKey = llmConfig.apiKey;
  } else if (llmConfig.provider === 'anthropic') {
    if (!llmConfig.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY in your environment.');
    }
    modelClientOptions.apiKey = llmConfig.apiKey;
  }

  // For Ollama, use our custom client instead of relying on Stagehand's built-in support
  const stagehandOptions: any = {
    env: options?.env || 'LOCAL',
    awsConfig: options?.awsConfig,
    verbose: options?.verbose !== false,
    domSettleTimeoutMs: options?.domSettleTimeoutMs || 3000,
    enableCaching: options?.enableCaching !== false,
    headless: options?.headless || false,
    logger: options?.logger,
    logInferenceToFile: options?.logInferenceToFile ?? false,
    localBrowserLaunchOptions: {
      headless: options?.headless || false,
    },
  };

  // For all providers including Ollama, use Stagehand's built-in support
  stagehandOptions.modelName = modelName;
  stagehandOptions.modelClientOptions = modelClientOptions;

  // Log for debugging
  options?.logger?.({
    category: 'llm',
    message: `Using ${llmConfig.provider} provider with model ${modelName}`,
    level: 1,
    auxiliary: {
      provider: llmConfig.provider,
      modelName: modelName,
    },
  });

  const stagehand = new AWSStagehand(stagehandOptions);

  await stagehand.init();
  return stagehand;
}
