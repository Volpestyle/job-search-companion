/**
 * Job Search Service
 *
 * Handles job searches across different job boards using a unified approach
 * with optional site-specific overrides
 */

import { Page } from '@browserbasehq/stagehand';
import { BrowserContext } from 'playwright';
import { z } from 'zod';
import { Job, JobSearchParams, JobBoardConfig } from '@/app/types/general-types';
import { AuthFlowManager, AuthState } from '../auth/auth-flow-manager';
import { getOverrideForUrl } from './site-overrides';
import { LogLevel } from '@/app/utils/logger';

export interface JobSearchContext {
  params: JobSearchParams;
  boards: JobBoardConfig[];
  sessionId?: string;
  onAuthStateChange?: (state: AuthState) => void;
}

export class JobSearchService {
  private page: Page;
  private context: BrowserContext;
  private logger?: any;
  private authFlowManager: AuthFlowManager;

  constructor(page: Page, context: BrowserContext, logger?: any) {
    this.page = page;
    this.context = context;
    this.logger = logger;
    this.authFlowManager = new AuthFlowManager(page, context, logger);
  }

  /**
   * Search for jobs on the specified job board(s)
   */
  async searchJobs(options: JobSearchContext): Promise<{ board: string; jobs: Job[] }[]> {
    const { boards, params, onAuthStateChange } = options;

    this.log(LogLevel.INFO, `Starting job search on ${boards.length} board(s)`, {
      boards: boards.map((b) => b.name),
      params,
    });

    const results: { board: string; jobs: Job[] }[] = [];

    for (const board of boards) {
      try {
        const jobs = await this.searchSingleBoard({
          boardConfig: board,
          params,
          onAuthStateChange,
        });

        results.push({ board: board.name, jobs });
      } catch (error) {
        this.log(LogLevel.ERROR, `Error searching ${board.name}`, {
          error: error instanceof Error ? error.message : error,
          board: board.name,
        });
        // Continue with other boards even if one fails
        results.push({ board: board.name, jobs: [] });
      }
    }

    return results;
  }

  /**
   * Search for jobs on a single board using unified approach
   */
  private async searchSingleBoard(options: {
    boardConfig: JobBoardConfig;
    params: JobSearchParams;
    onAuthStateChange?: (state: AuthState) => void;
  }): Promise<Job[]> {
    const { boardConfig, params, onAuthStateChange } = options;
    this.log(LogLevel.INFO, `Starting job search on ${boardConfig.name}`, { boardConfig, params });

    try {
      // Step 1: Navigate and handle authentication
      const authenticated = await this.authFlowManager.checkAndHandleAuth({
        boardName: boardConfig.name,
        boardUrl: boardConfig.searchUrl || boardConfig.url,
        onAuthStateChange,
      });

      if (!authenticated) {
        throw new Error(`Authentication failed for ${boardConfig.name}`);
      }

      // Navigate to search page if needed
      await this.navigateToSearchPage(boardConfig);

      // Step 2: Perform the search
      await this.performSearch(boardConfig, params);

      // Step 3: Extract and return jobs
      return await this.extractJobs(boardConfig.name);
    } catch (error) {
      this.log(LogLevel.ERROR, `Error in job search for ${boardConfig.name}`, { error });
      throw error;
    }
  }

  private async navigateToSearchPage(boardConfig: JobBoardConfig): Promise<void> {
    const override = getOverrideForUrl(boardConfig.url);

    // If we have a specific search URL and we're not already there
    if (boardConfig.searchUrl && !this.page.url().includes(boardConfig.searchUrl)) {
      await this.page.goto(boardConfig.searchUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');
    }
    // Or if we have navigation instructions
    else if (override?.navigateToSearch) {
      await this.page.act({ action: override.navigateToSearch });
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async performSearch(boardConfig: JobBoardConfig, params: JobSearchParams): Promise<void> {
    const { keywords, location, easyApply, remote } = params;
    this.log(LogLevel.INFO, 'Performing job search', { keywords, location });

    const override = getOverrideForUrl(boardConfig.url);

    if (override?.performSearch) {
      // Use site-specific search if available
      const searchAction = override.performSearch
        .replace('{keywords}', keywords)
        .replace('{location}', location || '');

      await this.page.act({ action: searchAction });
    } else {
      // Generic search approach
      await this.page.act({
        action: `Find the job search form and type "${keywords}" in the job title or keyword field. ${location ? `Then type "${location}" in the location field.` : ''} Then submit the search.`,
      });
    }

    // Wait for results to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Apply filters
    if (easyApply) {
      if (override?.applyEasyApply) {
        await this.page.act({ action: override.applyEasyApply });
      } else {
        await this.tryApplyFilter('Easy Apply', 'Quick Apply', 'Instant Apply');
      }
    }

    if (remote) {
      await this.tryApplyFilter('Remote', 'Work from home', 'Location type: Remote');
    }

    if (easyApply || remote) {
      await this.page.waitForLoadState('networkidle');
    }
  }

  private async tryApplyFilter(...filterNames: string[]): Promise<void> {
    for (const filterName of filterNames) {
      try {
        await this.page.act({
          action: `Look for and click on a "${filterName}" filter or button if it exists`,
        });
        await this.page.waitForTimeout(1000);
        return; // Success, exit
      } catch (error) {
        this.log(LogLevel.DEBUG, `Filter "${filterName}" not found or couldn't be applied`);
      }
    }
  }

  private async extractJobs(boardName: string): Promise<Job[]> {
    this.log(LogLevel.INFO, 'Extracting job listings');

    const override = getOverrideForUrl(this.page.url());

    // Define Zod schema for job extraction
    const jobSchema = z.object({
      title: z.string().describe('Job title'),
      company: z.string().describe('Company name'),
      location: z.string().optional().describe('Job location'),
      description: z.string().optional().describe('Job description summary'),
      salary: z.string().optional().describe('Salary information if shown'),
      postedTime: z.string().optional().describe('When the job was posted'),
      hasEasyApply: z.boolean().optional().describe('Whether the job has easy apply option'),
      url: z.string().optional().describe('Link to the job posting'),
    });

    const jobsArraySchema = z.object({
      jobs: z.array(jobSchema).describe('Array of job listings found on the page'),
    });

    try {
      const result = await this.page.extract({
        instruction:
          override?.extractJobsInstruction ||
          'Extract all job listings from the page. Include job title, company, location, posted date, salary if shown, and any application method info (like Easy Apply)',
        schema: jobsArraySchema,
      });

      const jobListings = result?.jobs || [];
      this.log(LogLevel.INFO, `Extracted ${jobListings.length} job listings from ${boardName}`);
      return this.convertToJobFormat(jobListings, boardName);
    } catch (error) {
      this.log(LogLevel.ERROR, 'Error extracting jobs', { error });
      return [];
    }
  }

  private convertToJobFormat(rawJobs: any[], boardName: string): Job[] {
    return rawJobs.map((job, index) => ({
      id: `${boardName.toLowerCase()}-${Date.now()}-${index}`,
      title: job.title || 'Unknown Title',
      company: job.company || 'Unknown Company',
      location: job.location || 'Unknown Location',
      description: job.description || '',
      url: job.url || this.page.url(),
      source: boardName.toLowerCase(),
      datePosted: this.parsePostedTime(job.postedTime),
      salary: job.salary || null,
      jobType: 'full-time', // Default, could be enhanced
      isRemote: this.detectRemote(job),
      hasEasyApply: job.hasEasyApply || false,
      status: 'new',
      tags: [],
      matchScore: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  private parsePostedTime(postedTime?: string): string {
    if (!postedTime) return new Date().toISOString();

    const now = new Date();
    const match = postedTime.match(/(\d+)\s*(hour|day|week|month)/i);

    if (match) {
      const [, num, unit] = match;
      const value = parseInt(num);

      switch (unit.toLowerCase()) {
        case 'hour':
          now.setHours(now.getHours() - value);
          break;
        case 'day':
          now.setDate(now.getDate() - value);
          break;
        case 'week':
          now.setDate(now.getDate() - value * 7);
          break;
        case 'month':
          now.setMonth(now.getMonth() - value);
          break;
      }
    }

    return now.toISOString();
  }

  private detectRemote(job: any): boolean {
    const checkText = `${job.location} ${job.title} ${job.description}`.toLowerCase();
    return (
      checkText.includes('remote') ||
      checkText.includes('work from home') ||
      checkText.includes('wfh')
    );
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
  }
}
