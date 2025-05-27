/**
 * Job Search Service Integration Tests
 *
 * Tests the job search functionality with Ollama + Stagehand integration
 * focusing on real-world scenarios and error handling
 */

import { test, expect } from '@playwright/test';
import { JobSearchService } from '@/lib/job-search/job-search-service';
import { createStagehandWithLLM } from '@/lib/llm/llm-provider';
import { JobBoardConfig, JobSearchParams } from '@/app/types/general-types';
import { AuthState } from '@/lib/auth/auth-flow-manager';
import { createFileLogger } from '@/app/utils/fileLogger';
import { logger } from '@/app/utils/logger';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_TIMEOUT = 180000; // 3 minutes for LLM operations
const sessionId = `job-search-integration-${Date.now()}`;

test.describe('Job Search Service Integration', () => {
  let stagehand: any;
  let jobSearchService: JobSearchService;
  let testLogger: any;
  let authStates: AuthState[] = [];

  test.beforeAll(async () => {
    // Create file logger for this test session
    testLogger = createFileLogger(sessionId);
    testLogger.info('Starting Job Search Service Integration Tests');

    // Pre-flight checks
    testLogger.info('Running pre-flight checks');

    // Check Ollama availability
    try {
      const ollamaCheck = await fetch('http://localhost:11434/api/tags');
      if (!ollamaCheck.ok) {
        throw new Error('Ollama not running');
      }
      testLogger.info('✅ Ollama is running');
    } catch (error) {
      testLogger.error('❌ Ollama check failed', { error });
      throw new Error('Ollama is not available. Please start Ollama before running tests.');
    }

    // Initialize Stagehand with Ollama
    testLogger.info('Initializing Stagehand with Ollama');

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
      });

      testLogger.info('✅ Stagehand initialized successfully');
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
    testLogger.info('All integration tests completed');
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

  test('search jobs on Linkedin', async () => {
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

    testLogger.info('Testing LinkedIn authentication detection', { params });

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
        testLogger.info('LinkedIn jobs found', { count: linkedInResult.jobs.length });

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
});
