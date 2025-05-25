'use server';

/**
 * This is the server-side entry point for Stagehand integration.
 * It follows the approach from stagehand-nextjs-quickstart.
 */

// Note: We can't export runtime here because this is a "use server" file
// We'll add the runtime configuration to route.ts instead

import { Stagehand } from '@browserbasehq/stagehand';
import OpenAI from 'openai';
import { z } from 'zod';
import { ollamaConfig, stagehandEnv, awsConfig } from '@/app/config/environment';
import { searchLinkedInJobs } from './main';
import { JobSearchParams } from '@/app/types/general-types';
import { OllamaClient } from '@/app/services/ollamaClient';
import { StagehandConfig, StagehandEnvironment } from '@/app/types/stagehand-types';
import { checkOllamaConnection, formatOllamaError } from '@/app/utils/ollamaCheck';
import { logger } from '@/app/utils/logger';
import { createFileLogger } from '@/app/utils/fileLogger';
import { loadLinkedInSession, hasLinkedInSession } from '@/app/utils/linkedinSession';

// Create a Stagehand configuration based on environment settings
const createStagehandConfig = (sessionId?: string, fileLogger?: any): StagehandConfig => {
  // Base configuration
  const config: StagehandConfig = {
    env: stagehandEnv.environment as StagehandEnvironment,
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: false,
      viewport: {
        width: 1280,
        height: 800,
      },
    },
    sessionId,
  };

  // Add additional configuration for LOCAL environment (Ollama)
  if (stagehandEnv.environment === 'LOCAL') {
    // Create OpenAI client for Ollama
    const openaiClient = new OpenAI({
      apiKey: 'ollama', // Placeholder for Ollama
      baseURL: `http://${ollamaConfig.host}:${ollamaConfig.port}/v1`,
    });

    // Create our custom LLMClient adapter with logging
    const llmClient = new OllamaClient({
      modelName: ollamaConfig.modelName,
      client: openaiClient,
      logger: fileLogger ? (message, data) => fileLogger.info(message, data) : undefined,
    });

    // Add LLM client to config
    return {
      ...config,
      llmClient: llmClient,
    };
  }

  // TODO: For AWS environment (future implementation)
  if (stagehandEnv.environment === 'AWS') {
    // Note: We'll need to map Stagehand's expected configuration to AWS
    // This is a stub for future implementation
    return {
      ...config,
      // Stagehand expects "LOCAL" or "BROWSERBASE" - we use LOCAL for now
      // In the future, we can implement a AWS-specific adapter
      env: 'LOCAL',
      awsConfig: {
        region: awsConfig.region,
        credentials: awsConfig.credentials,
      },
    };
  }

  return config;
};

// Run Stagehand with the provided configuration
export async function runStagehand(params: JobSearchParams, sessionId?: string) {
  // Generate sessionId if not provided
  const currentSessionId = sessionId || `job-search-${Date.now()}`;

  // Create file logger for this session
  const log = createFileLogger(currentSessionId);

  const timer = logger.startTimer('Job Search');
  log.info('Starting LinkedIn job search', { params, sessionId: currentSessionId });

  // Validate search parameters
  if (!params.keywords || params.keywords.trim() === '') {
    const errorMessage =
      'Job keywords are required. Please enter a job title or keywords to search.';
    log.error('Validation failed', { error: errorMessage });

    return {
      success: false,
      jobs: [],
      error: errorMessage,
    };
  }

  // Check for LinkedIn session
  const hasSession = await hasLinkedInSession();
  if (!hasSession) {
    const errorMessage = 'LinkedIn authentication required. Please run: pnpm linkedin-auth';
    log.error('No LinkedIn session found', { error: errorMessage });

    return {
      success: false,
      jobs: [],
      error: errorMessage,
    };
  }

  const linkedInSession = await loadLinkedInSession();
  if (linkedInSession) {
    const sessionAgeHours = Math.round(
      (Date.now() - new Date(linkedInSession.savedAt).getTime()) / (1000 * 60 * 60)
    );
    log.info('LinkedIn session loaded', {
      sessionAge: `${sessionAgeHours} hours old`,
    });

    // Warn if session is getting old (li_at cookie lasts 1 year, but LinkedIn may invalidate sooner)
    if (sessionAgeHours > 24 * 30) {
      // 30 days
      log.warn(
        'LinkedIn session is over 30 days old - consider re-authenticating if you experience issues'
      );
    }
  }

  // Pre-flight check for Ollama if using LOCAL environment
  if (stagehandEnv.environment === 'LOCAL') {
    const ollamaCheck = await checkOllamaConnection(
      ollamaConfig.host,
      Number(ollamaConfig.port),
      ollamaConfig.modelName
    );

    if (!ollamaCheck.isAvailable) {
      const errorMessage = formatOllamaError(ollamaCheck);
      log.error('Ollama check failed', { error: errorMessage });

      return {
        success: false,
        jobs: [],
        error: errorMessage,
      };
    }

    log.progress('initialization', 'Ollama connection verified', 10);
  }

  let stagehand = null;

  try {
    // Get the configuration with logger
    const config = createStagehandConfig(currentSessionId, log);

    // Log config without circular references
    const safeConfig: Partial<StagehandConfig> & {
      hasLLMClient: boolean;
      llmClientType?: string;
      llmClientModel?: string;
      hasAwsConfig?: boolean;
    } = {
      env: config.env,
      verbose: config.verbose,
      localBrowserLaunchOptions: config.localBrowserLaunchOptions,
      sessionId: config.sessionId,
      hasAwsConfig: !!config.awsConfig,
      hasLLMClient: !!config.llmClient,
      llmClientType: config.llmClient?.type,
      llmClientModel: config.llmClient?.modelName,
    };

    log.debug('Stagehand configuration', safeConfig);

    // Create the Stagehand instance
    log.progress('initialization', 'Creating browser automation instance', 20);

    // TODO: Customize StagehandConfig to match your needs
    // Stagehand only accepts "LOCAL" or "BROWSERBASE" for env,
    // so make sure we're using a compatible value
    const stagehandCompatibleConfig = {
      ...config,
      env: 'LOCAL' as const, // Override to ensure Stagehand accepts our config
    };
    stagehand = new Stagehand(stagehandCompatibleConfig);

    // Initialize the browser
    log.progress('initialization', 'Launching browser', 30);
    await stagehand.init();
    log.progress('initialization', 'Browser launched successfully', 40);

    // Apply LinkedIn cookies if we have them
    if (linkedInSession && linkedInSession.cookies && stagehand.context) {
      log.info('Applying LinkedIn session cookies', {
        cookieCount: linkedInSession.cookies.length,
      });

      try {
        // Filter and apply LinkedIn cookies
        const linkedInCookies = linkedInSession.cookies.filter(
          (c) => c.domain && (c.domain.includes('linkedin.com') || c.domain === '.linkedin.com')
        );

        await stagehand.context.addCookies(linkedInCookies);
        log.info('LinkedIn cookies applied successfully');
      } catch (error) {
        log.error('Failed to apply LinkedIn cookies', {
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    // Run the main function
    log.progress('search', 'Navigating to LinkedIn', 50);
    const jobs = await searchLinkedInJobs({
      stagehand,
      page: stagehand.page,
      context: stagehand.context,
      params,
      sessionId: currentSessionId,
      logger: log,
    });

    // Close the browser when finished
    if (stagehand) {
      await stagehand.close();
    }

    // Return the results
    timer.end({ jobCount: jobs.length });
    log.progress('extraction', 'Job search completed!', 100);

    return {
      success: true,
      jobs,
      sessionId: currentSessionId,
    };
  } catch (error) {
    log.error('Error running Stagehand', {
      error: error instanceof Error ? error.message : error,
    });

    // Ensure the browser is closed on error
    if (stagehand) {
      try {
        await stagehand.close();
      } catch (closeError) {
        log.error('Error closing browser', { error: closeError });
      }
    }

    // Return the error
    return {
      success: false,
      jobs: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

// Get the current configuration for client-side use
export async function getConfig() {
  return {
    environment: stagehandEnv.environment,
    useMock: stagehandEnv.useMock,
    ollamaHost: ollamaConfig.host,
    ollamaPort: ollamaConfig.port,
    ollamaModel: ollamaConfig.modelName,
    hasAwsCredentials: awsConfig.enabled,
    awsRegion: awsConfig.region,
  };
}
