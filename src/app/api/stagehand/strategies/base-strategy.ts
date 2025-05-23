/**
 * Base strategy for job board scrapers
 */
import { Page, BrowserContext, Stagehand } from '@browserbasehq/stagehand';
import { Job, JobSearchParams } from '@/app/types/general-types';
import { JobBoard } from '@/app/types/job-board-types';

export interface JobSearchContext {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
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
}
