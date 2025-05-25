/**
 * Base strategy for job board scrapers
 */
import { Page, BrowserContext } from 'playwright';
import { Job, JobSearchParams } from '@/app/types/general-types';
import { JobBoard } from '@/app/types/job-board-types';

export interface JobSearchContext {
  page: Page;
  context: BrowserContext;
  params: JobSearchParams;
  sessionId?: string;
  logger: any;
}

export abstract class BaseJobSearchStrategy {
  protected boardName: JobBoard;
  protected displayName: string;

  constructor(boardName: JobBoard, displayName: string) {
    this.boardName = boardName;
    this.displayName = displayName;
  }

  /**
   * Main search method to be implemented by each strategy
   */
  abstract search(context: JobSearchContext): Promise<Job[]>;

  /**
   * Check if authentication is required and valid
   */
  abstract checkAuth(page: Page): Promise<boolean>;

  /**
   * Navigate to the job search page
   */
  abstract navigateToSearch(page: Page): Promise<void>;

  /**
   * Fill search form with parameters
   */
  abstract fillSearchForm(context: JobSearchContext): Promise<void>;

  /**
   * Extract job listings from results page
   */
  abstract extractJobs(context: JobSearchContext): Promise<Job[]>;

  /**
   * Common logging helper
   */
  protected log(logger: any, level: string, message: string, data?: any) {
    logger[level](`[${this.displayName}] ${message}`, {
      ...data,
      jobBoard: this.boardName,
    });
  }

  /**
   * Log extracted jobs with consistent format
   */
  protected logExtractedJobs(logger: any, rawJobs: any[], transformedJobs: Job[]) {
    // Log extraction completion
    this.log(logger, 'info', 'Job extraction completed', {
      jobCount: rawJobs.length,
    });
    
    // Only log raw jobs in debug if there's an issue
    if (rawJobs.length === 0 || rawJobs.length !== transformedJobs.length) {
      this.log(logger, 'debug', 'Raw extracted jobs', {
        jobs: rawJobs
      });
    }
    
    // Log transformation completion
    this.log(logger, 'info', 'Job transformation completed', {
      transformedCount: transformedJobs.length,
    });
    
    // Log first few transformed jobs as samples
    if (transformedJobs.length > 0) {
      this.log(logger, 'debug', 'Sample transformed jobs', {
        sampleJobs: transformedJobs.slice(0, 3)
      });
    }
  }

  /**
   * Log search progress with consistent format
   */
  protected logSearchProgress(logger: any, sessionId: string | undefined, message: string, percentage: number) {
    logger.progress('search', message, percentage, sessionId);
  }

  /**
   * Log extraction progress with consistent format
   */
  protected logExtractionProgress(logger: any, sessionId: string | undefined, message: string, percentage: number) {
    logger.progress('extraction', message, percentage, sessionId);
  }
}
