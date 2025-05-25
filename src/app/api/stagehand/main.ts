/**
 * Main job search orchestrator using our lightweight browser automation
 */

// Note: We can't export runtime here because this is a "use server" file
// The runtime configuration is in route.ts

import { Page, BrowserContext } from 'playwright';
import { Job, JobSearchParams } from '@/app/types/general-types';
import { JobBoard } from '@/app/types/job-board-types';
import { LinkedInAIStrategy } from './strategies/linkedin-ai-strategy';
import { BaseJobSearchStrategy } from './strategies/base-strategy';

// Strategy registry
const strategies: Record<JobBoard, BaseJobSearchStrategy | null> = {
  linkedin: new LinkedInAIStrategy(),
  indeed: null, // Coming soon
  glassdoor: null, // Coming soon
  ziprecruiter: null, // Coming soon
  dice: null, // Coming soon
};

/**
 * Main function that performs job searches across different boards
 */
export async function searchJobs({
  page,
  context,
  params,
  sessionId,
  logger,
  board = 'linkedin',
}: {
  page: Page;
  context: BrowserContext;
  params: JobSearchParams;
  sessionId?: string;
  logger: any;
  board?: JobBoard;
}): Promise<Job[]> {
  logger.info(`Starting job search on ${board}`, { params, board });

  try {
    // Get the appropriate strategy
    const strategy = strategies[board];
    if (!strategy) {
      throw new Error(`Job board '${board}' is not yet supported`);
    }

    // Execute the search using the strategy
    const searchContext = {
      page,
      context,
      params,
      sessionId,
      logger,
    };

    return await strategy.search(searchContext);
  } catch (error) {
    logger.error(`Error in ${board} job search`, {
      error: error instanceof Error ? error.message : error,
      board,
    });
    throw error;
  }
}

// Keep the old function name for backward compatibility
export async function searchLinkedInJobs(
  options: Parameters<typeof searchJobs>[0]
): Promise<Job[]> {
  return searchJobs({ ...options, board: 'linkedin' });
}
