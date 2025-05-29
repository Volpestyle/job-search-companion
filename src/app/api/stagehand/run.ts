'use server';

/**
 * Server-side entry point for job search automation using Stagehand
 */

import { createStagehandWithLLM } from '@/lib/llm/llm-provider';
import { ollamaConfig } from '@/app/config/environment';
import { JobSearchParams, JobSearchResult } from '@/app/types/general-types';
import { checkOllamaConnection, formatOllamaError } from '@/app/utils/ollamaCheck';
import { logger } from '@/app/utils/logger';
import { createFileLogger } from '@/app/utils/fileLogger';
import { JobSearchService } from '@/lib/job-search/job-search-service';
import { sendAuthUpdate } from './auth-status/route';
import { AuthState } from '@/lib/auth/auth-flow-manager';

// Run job search with Stagehand
export async function runJobSearch(
  params: JobSearchParams,
  sessionId?: string
): Promise<JobSearchResult> {
  // Generate sessionId if not provided
  const currentSessionId = sessionId || `job-search-${Date.now()}`;

  // Create file logger for this session
  const log = createFileLogger(currentSessionId);

  const timer = logger.startTimer('Job Search');
  log.info('Starting job search', { params, sessionId: currentSessionId });

  // Validate search parameters (keywords and boards are now required by type)
  if (params.keywords.trim() === '') {
    const errorMessage = 'Job keywords cannot be empty.';
    log.error('Validation failed', { error: errorMessage });

    return {
      success: false,
      jobs: [],
      error: errorMessage,
    };
  }

  if (params.boards.length === 0) {
    const errorMessage = 'At least one job board must be selected.';
    log.error('Validation failed', { error: errorMessage });

    return {
      success: false,
      jobs: [],
      error: errorMessage,
    };
  }

  // Check connectivity if using Ollama
  // LLM provider validation happens in getLLMConfig()
  const llmProvider = process.env.LLM_PROVIDER;
  if (llmProvider === 'ollama') {
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

  // Create a logger that forwards Stagehand logs to our file logger
  const stagehandLogger = (logLine: any) => {
    // Convert Stagehand log format to our format
    const level = logLine.level === 0 ? 'error' : logLine.level === 1 ? 'info' : 'debug';
    log[level](`[Stagehand] ${logLine.message}`, logLine.auxiliary);
  };

  // Initialize Stagehand with configured LLM provider
  let stagehand;
  try {
    stagehand = await createStagehandWithLLM({
      verbose: true,
      env: process.env.STAGEHAND_ENV as 'LOCAL' | 'AWS',
      domSettleTimeoutMs: 3000,
      enableCaching: true,
      headless: false, // Show browser for debugging
      logger: stagehandLogger,
      logInferenceToFile: true, // Save LLM interactions to files
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to initialize LLM provider';
    log.error('Failed to create Stagehand instance', { error: errorMessage });
    return {
      success: false,
      jobs: [],
      error: errorMessage,
    };
  }

  try {
    log.progress('initialization', 'Browser launched successfully', 20);

    // Note: Session handling removed - now handled by generic auth flow
    // The auth flow manager will detect when authentication is needed

    // Create job search service with the Stagehand-enhanced page
    const jobSearchService = new JobSearchService(stagehand.page, stagehand.context, log);

    // Run job searches
    log.progress('search', 'Starting job searches', 50);
    const results = await jobSearchService.searchJobs({
      params,
      boards: params.boards,
      sessionId: currentSessionId,
      onAuthStateChange: (state: AuthState) => {
        // Send auth state updates to the frontend
        sendAuthUpdate(currentSessionId, state);

        // Also log it
        log.info('Auth state changed', { state });
      },
    });

    // Combine all jobs from all boards
    const allJobs = results.flatMap((result) => result.jobs);

    // Log results by board
    results.forEach((result) => {
      log.info(`Found ${result.jobs.length} jobs on ${result.board}`);
    });

    // Return the results
    timer.end({ jobCount: allJobs.length });
    log.progress('extraction', 'Job search completed!', 100);

    return {
      success: true,
      jobs: allJobs,
      sessionId: currentSessionId,
      resultsByBoard: results,
    };
  } catch (error) {
    log.error('Error running job search', {
      error: error instanceof Error ? error.message : error,
    });

    // Return the error
    return {
      success: false,
      jobs: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  } finally {
    // Always close Stagehand
    await stagehand.close();
  }
}

// Get the current configuration for client-side use
export async function getConfig() {
  return {
    ollamaHost: ollamaConfig.host,
    ollamaPort: ollamaConfig.port,
    ollamaModel: ollamaConfig.modelName,
  };
}
