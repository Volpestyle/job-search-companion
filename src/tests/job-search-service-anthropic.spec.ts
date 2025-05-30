/**
 * Job Search Service Integration Tests with Anthropic
 *
 * Tests the job search functionality with Anthropic + Stagehand integration
 * focusing on real-world scenarios and error handling
 */

import { test, expect } from '@playwright/test';
import { JobSearchService } from '@/lib/job-search/job-search-service';
import { createStagehandWithLLM, LLMConfig } from '@/lib/llm/llm-provider';
import { JobBoardConfig, JobSearchParams } from '@/app/types/general-types';
import { AuthState } from '@/lib/auth/auth-flow-manager';
import { createFileLogger } from '@/app/utils/fileLogger';
import { logger } from '@/app/utils/logger';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_TIMEOUT = 300000; // 5 minutes for Anthropic operations (may be slower than local Ollama)
const sessionId = `job-search-anthropic-${Date.now()}`;

test.describe('Job Search Service Integration with Anthropic', () => {
  let stagehand: any;
  let jobSearchService: JobSearchService;
  let testLogger: any;
  let authStates: AuthState[] = [];

  test.beforeAll(async () => {
    // Create file logger for this test session
    testLogger = createFileLogger(sessionId);
    testLogger.info('Starting Job Search Service Integration Tests with Anthropic');

    // Pre-flight checks
    testLogger.info('Running pre-flight checks for Anthropic');

    // Check Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for this test');
    }

    if (!process.env.ANTHROPIC_MODEL) {
      throw new Error('ANTHROPIC_MODEL environment variable is required for this test');
    }

    testLogger.info('✅ Anthropic environment variables are set');

    // Create Anthropic LLM config
    const anthropicConfig: LLMConfig = {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
    };

    // Initialize Stagehand with Anthropic
    testLogger.info('Initializing Stagehand with Anthropic', {
      model: anthropicConfig.model,
      provider: anthropicConfig.provider,
    });

    const stagehandLogger = (logLine: any) => {
      const level = logLine.level === 0 ? 'error' : logLine.level === 1 ? 'info' : 'debug';
      testLogger[level](`[Stagehand] ${logLine.message}`, logLine.auxiliary);
    };

    try {
      stagehand = await createStagehandWithLLM({
        verbose: true,
        env: 'LOCAL',
        headless: process.env.HEADLESS !== 'false', // Allow override with HEADLESS=false
        enableCaching: false,
        logger: stagehandLogger,
        logInferenceToFile: true,
        config: anthropicConfig,
      });

      testLogger.info('✅ Stagehand initialized successfully with Anthropic');
    } catch (error) {
      testLogger.error('❌ Stagehand initialization failed', { error });
      throw error;
    }

    // Create job search service
    jobSearchService = new JobSearchService(stagehand.page, stagehand.context, testLogger);
    testLogger.info('✅ JobSearchService created');

    testLogger.info('Test setup complete');
  });

  test.afterAll(async () => {
    if (stagehand) {
      await stagehand.close();
      testLogger.info('Stagehand closed');
    }
    testLogger.info('All Anthropic integration tests completed');
  });

  test.beforeEach(async () => {
    authStates = [];
    testLogger.info('Test case started', { testName: test.info().title });
  });

  test.afterEach(async () => {
    testLogger.info('Test case completed', {
      testName: test.info().title,
      status: test.info().status,
    });
  });

  test('search jobs on LinkedIn with Anthropic', async () => {
    test.setTimeout(TEST_TIMEOUT);

    const linkedInBoard: JobBoardConfig = {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com',
      searchUrl: 'https://www.linkedin.com/jobs/search',
    };

    const params: JobSearchParams = {
      keywords: 'software engineer',
      location: 'San Francisco',
      boards: [linkedInBoard],
    };

    testLogger.info('Testing LinkedIn authentication detection with Anthropic', { params });

    let searchResults: any = null;
    let searchError: any = null;

    try {
      searchResults = await jobSearchService.searchJobs({
        params,
        boards: [linkedInBoard],
        onAuthStateChange: (state) => {
          authStates.push(state);
          testLogger.info('Auth state change', {
            status: state.status,
            message: state.message,
            boardName: state.boardName,
          });
        },
      });
    } catch (error) {
      searchError = error;
      testLogger.info('Search completed with error (expected for auth)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Verify auth states were detected
    expect(authStates.length).toBeGreaterThan(0);
    testLogger.info('Auth states captured', {
      count: authStates.length,
      states: authStates.map((s) => ({ status: s.status, board: s.boardName })),
    });

    // Check for authentication requirements
    const authSteps = authStates.filter((s) =>
      ['required', 'pending', 'completed'].includes(s.status)
    );
    expect(authSteps.length).toBeGreaterThan(0);

    // If we got results, verify they're properly structured
    if (searchResults && searchResults.length > 0) {
      const linkedInResult = searchResults.find((r: any) => r.board === 'LinkedIn');
      if (linkedInResult) {
        testLogger.info('LinkedIn jobs found with Anthropic', {
          count: linkedInResult.jobs.length,
        });

        // Verify job structure
        if (linkedInResult.jobs.length > 0) {
          const firstJob = linkedInResult.jobs[0];
          expect(firstJob).toHaveProperty('id');
          expect(firstJob).toHaveProperty('title');
          expect(firstJob).toHaveProperty('company');
          expect(firstJob.source).toBe('linkedin');
        }
      }
    }
  });

  test('search jobs on Indeed with Anthropic', async () => {
    test.setTimeout(TEST_TIMEOUT);

    const indeedBoard: JobBoardConfig = {
      name: 'Indeed',
      url: 'https://www.indeed.com',
      searchUrl: 'https://www.indeed.com/jobs',
    };

    const params: JobSearchParams = {
      keywords: 'frontend developer',
      location: 'New York',
      boards: [indeedBoard],
    };

    testLogger.info('Testing Indeed job search with Anthropic', { params });

    let searchResults: any = null;
    let searchError: any = null;

    try {
      searchResults = await jobSearchService.searchJobs({
        params,
        boards: [indeedBoard],
        onAuthStateChange: (state) => {
          authStates.push(state);
          testLogger.info('Auth state change', {
            status: state.status,
            message: state.message,
            boardName: state.boardName,
          });
        },
      });
    } catch (error) {
      searchError = error;
      testLogger.info('Search completed with error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Indeed typically doesn't require authentication for basic searches
    testLogger.info('Indeed search completed', {
      hasResults: !!searchResults,
      authStatesCount: authStates.length,
    });

    // If we got results, verify they're properly structured
    if (searchResults && searchResults.length > 0) {
      const indeedResult = searchResults.find((r: any) => r.board === 'Indeed');
      if (indeedResult) {
        testLogger.info('Indeed jobs found with Anthropic', { count: indeedResult.jobs.length });

        // Verify job structure
        if (indeedResult.jobs.length > 0) {
          const firstJob = indeedResult.jobs[0];
          expect(firstJob).toHaveProperty('id');
          expect(firstJob).toHaveProperty('title');
          expect(firstJob).toHaveProperty('company');
          expect(firstJob.source).toBe('indeed');
        }
      }
    }
  });

  test('compare Anthropic performance with complex search', async () => {
    test.setTimeout(TEST_TIMEOUT);

    const boards: JobBoardConfig[] = [
      {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com',
        searchUrl: 'https://www.linkedin.com/jobs/search',
      },
      {
        name: 'Indeed',
        url: 'https://www.indeed.com',
        searchUrl: 'https://www.indeed.com/jobs',
      },
    ];

    const params: JobSearchParams = {
      keywords: 'full stack developer',
      location: 'Remote',
      remote: true,
      easyApply: true,
      boards,
    };

    testLogger.info('Testing complex search with filters using Anthropic', { params });

    const startTime = Date.now();
    let searchResults: any = null;

    try {
      searchResults = await jobSearchService.searchJobs({
        params,
        boards,
        onAuthStateChange: (state) => {
          authStates.push(state);
          testLogger.info('Auth state change', {
            status: state.status,
            message: state.message,
            boardName: state.boardName,
          });
        },
      });
    } catch (error) {
      testLogger.info('Complex search completed with error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    testLogger.info('Complex search performance metrics', {
      duration: `${duration}ms`,
      durationSeconds: `${(duration / 1000).toFixed(2)}s`,
      boardsSearched: boards.length,
      authStatesTriggered: authStates.length,
      resultsFound: searchResults
        ? searchResults.reduce((sum: number, r: any) => sum + r.jobs.length, 0)
        : 0,
    });

    // Performance expectations for Anthropic (may be different from Ollama)
    expect(duration).toBeLessThan(TEST_TIMEOUT); // Should complete within timeout

    if (searchResults) {
      // Verify we attempted to search all boards
      expect(searchResults.length).toBe(boards.length);

      // Log detailed results for analysis
      searchResults.forEach((result: any) => {
        testLogger.info(`Results from ${result.board}`, {
          jobCount: result.jobs.length,
          sampleJobs: result.jobs.slice(0, 3).map((job: any) => ({
            title: job.title,
            company: job.company,
            location: job.location,
          })),
        });
      });
    }
  });
});
