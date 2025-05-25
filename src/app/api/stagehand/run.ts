'use server';

/**
 * This is the server-side entry point for our lightweight browser automation.
 * Replaces Stagehand with direct Playwright + our AINavigator.
 */

// Note: We can't export runtime here because this is a "use server" file
// We'll add the runtime configuration to route.ts instead

import { ollamaConfig, stagehandEnv, awsConfig } from '@/app/config/environment';
import { searchLinkedInJobs } from './main';
import { JobSearchParams } from '@/app/types/general-types';
import { BrowserManager, BrowserConfig } from '@/app/services/browserManager';
import { checkOllamaConnection, formatOllamaError } from '@/app/utils/ollamaCheck';
import { logger } from '@/app/utils/logger';
import { createFileLogger } from '@/app/utils/fileLogger';
import { restoreConsole } from '@/app/utils/fileLogger';
import { loadLinkedInSession, hasLinkedInSession } from '@/app/utils/linkedinSession';

// Create browser configuration based on environment settings
const createBrowserConfig = (): BrowserConfig => {
  return {
    headless: false,
    viewport: {
      width: 1280,
      height: 800,
    },
    timeout: 30000,
  };
};

// Run job search with our lightweight browser automation
export async function runJobSearch(params: JobSearchParams, sessionId?: string) {
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

  let browserManager: BrowserManager | null = null;

  try {
    // Get the browser configuration
    const config = createBrowserConfig();

    log.debug('Browser configuration', config);

    // Create browser manager
    log.progress('initialization', 'Creating browser automation instance', 20);
    browserManager = new BrowserManager(config);

    // Initialize the browser
    log.progress('initialization', 'Launching browser', 30);
    await browserManager.init();
    log.progress('initialization', 'Browser launched successfully', 40);

    // Apply LinkedIn cookies if we have them
    if (linkedInSession && linkedInSession.cookies) {
      log.info('Applying LinkedIn session cookies', {
        cookieCount: linkedInSession.cookies.length,
      });

      try {
        // Filter and apply LinkedIn cookies
        const linkedInCookies = linkedInSession.cookies.filter(
          (c) => c.domain && (c.domain.includes('linkedin.com') || c.domain === '.linkedin.com')
        );

        await browserManager.applyCookies(linkedInCookies);
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
      page: browserManager.pageInstance,
      context: browserManager.contextInstance,
      params,
      sessionId: currentSessionId,
      logger: log,
    });

    // Close the browser when finished
    if (browserManager) {
      await browserManager.close();
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
    log.error('Error running job search', {
      error: error instanceof Error ? error.message : error,
    });

    // Ensure the browser is closed on error
    if (browserManager) {
      try {
        await browserManager.close();
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
  } finally {
    // Always restore console to prevent memory leaks
    restoreConsole();
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
