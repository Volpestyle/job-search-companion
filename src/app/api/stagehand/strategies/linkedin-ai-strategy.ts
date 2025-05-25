/**
 * LinkedIn strategy using our custom AI Navigator
 * Full CDP-based accessibility tree approach
 */
import OpenAI from 'openai';
import { BaseJobSearchStrategy, JobSearchContext } from './base-strategy';
import { Job, JobStatus } from '@/app/types/general-types';
import { AINavigator } from '@/app/services/aiNavigator';
import { LLMClient } from '@/app/services/llmClient';
import { ollamaConfig } from '@/app/config/environment';

export class LinkedInAIStrategy extends BaseJobSearchStrategy {
  private navigator?: AINavigator;

  constructor() {
    super('linkedin', 'LinkedIn');
  }

  async search(context: JobSearchContext): Promise<Job[]> {
    const { page, logger, sessionId } = context;

    this.log(logger, 'info', 'Starting job search with AI Navigator');

    // Create AI Navigator once for the entire search session
    this.navigator = this.createNavigator(page, logger);

    try {
      // Check authentication
      const isAuthenticated = await this.checkAuth(page);
      if (!isAuthenticated) {
        throw new Error('LinkedIn authentication required');
      }

      // Navigate to search
      await this.navigateToSearch(page);

      // Fill search form
      await this.fillSearchForm(context);

      // Extract jobs
      return await this.extractJobs(context);
    } finally {
      // Clean up navigator resources
      if (this.navigator) {
        await this.navigator.cleanup();
      }
    }
  }

  private createNavigator(page: any, logger: any): AINavigator {
    const openaiClient = new OpenAI({
      apiKey: 'ollama',
      baseURL: `http://${ollamaConfig.host}:${ollamaConfig.port}/v1`,
    });
    
    const llmClient = new LLMClient({
      modelName: process.env.OLLAMA_MODEL || ollamaConfig.modelName,
      client: openaiClient,
      logger: (message: string, data?: any) => logger.debug(message, data),
    });

    return new AINavigator({
      page,
      llmClient,
      logger,
      debugMode: true,
    });
  }

  async checkAuth(page: any): Promise<boolean> {
    const currentUrl = page.url();
    const pageContent = await page.content();

    if (
      currentUrl.includes('/login') ||
      currentUrl.includes('/signin') ||
      pageContent.includes('Sign in') ||
      pageContent.includes('Join now')
    ) {
      return false;
    }

    return true;
  }

  async navigateToSearch(page: any): Promise<void> {
    await page.goto('https://www.linkedin.com/jobs/', {
      waitUntil: 'domcontentloaded',
    });
  }

  async fillSearchForm(context: JobSearchContext): Promise<void> {
    const { params, logger, sessionId } = context;

    if (!this.navigator) {
      throw new Error('Navigator not initialized');
    }

    this.log(logger, 'info', 'Using AI Navigator for LinkedIn search');

    // Fill in the keywords field and submit (LinkedIn uses Enter to submit)
    if (params.keywords) {
      this.log(logger, 'debug', 'Filling keywords field with AI Navigator');
      
      // Be very explicit about finding the combobox element, not static text
      const searchSuccess = await this.navigator.act(
        `Find and click the combobox element (not static text) that has "Search by title, skill, or company" then type "${params.keywords}"`
      );

      if (!searchSuccess) {
        // Fallback: try a simpler approach
        this.log(logger, 'debug', 'First attempt failed, trying simpler approach');
        
        // Just look for any search combobox
        const clickSuccess = await this.navigator.act(
          `Click on the search combobox or input field`
        );
        
        if (clickSuccess) {
          await this.navigator.pageInstance.waitForTimeout(500);
          await this.navigator.act(`Type "${params.keywords}"`);
        } else {
          throw new Error('Failed to find search field');
        }
      }
      
      // Submit by pressing Enter
      await this.navigator.pageInstance.waitForTimeout(500);
      const submitSuccess = await this.navigator.act('Press Enter to submit');
      
      if (!submitSuccess) {
        this.log(logger, 'warn', 'Enter key failed, search may not have submitted');
      }
    }

    // Fill in the location field if provided (optional)
    if (params.location) {
      this.log(logger, 'debug', 'Filling location field with AI Navigator');
      const locationSuccess = await this.navigator.act(
        `Click on the location input field labeled "City, state, or zip code" and type "${params.location}"`
      );

      if (!locationSuccess) {
        this.log(logger, 'warn', 'Failed to fill location field, continuing anyway');
      }
    }

    // Progress update
    this.logSearchProgress(logger, sessionId, 'Search submitted, waiting for results', 75);

    // Wait for search results page to load
    this.logSearchProgress(logger, sessionId, 'Waiting for search results', 80);

    // Wait for navigation to complete - use URL change or selector
    try {
      await Promise.race([
        // Wait for URL to change to search results
        this.navigator.pageInstance.waitForURL('**/jobs/search/**', { timeout: 15000 }),
        this.navigator.pageInstance.waitForURL('**/jobs/collections/**', { timeout: 15000 }),
        // Or wait for job elements to appear
        this.navigator.pageInstance.waitForSelector('[data-job-id]', { timeout: 15000 })
      ]);
    } catch (error) {
      // Fallback: just wait a bit for the page to settle
      this.log(logger, 'warn', 'Could not detect search results page, waiting for settle');
      await this.navigator.pageInstance.waitForTimeout(3000);
    }

    this.log(logger, 'info', 'Successfully navigated to search results');
  }

  async extractJobs(context: JobSearchContext): Promise<Job[]> {
    const { logger, sessionId } = context;

    if (!this.navigator) {
      throw new Error('Navigator not initialized');
    }

    this.logExtractionProgress(logger, sessionId, 'Extracting job listings with AI Navigator', 90);

    this.log(logger, 'info', 'Starting job extraction with AI Navigator');

    try {
      // Wait for job cards to load
      await this.navigator.pageInstance.waitForSelector('[data-job-id]', { 
        timeout: 10000,
        state: 'visible' 
      });
      
      // Give it a moment for all jobs to render
      await this.navigator.pageInstance.waitForTimeout(2000);

      // Try to extract from the main job list container
      const jobListings = await this.navigator.extract(
        'Extract all job listings from this LinkedIn search results page. Look for job cards that typically contain: job title, company name, location, and other details. Extract every job listing you can find.',
        {
          area: 'main job listings container or list of jobs',
          schema: {
            jobs: [
              {
                title: 'string - job title',
                company: 'string - company name',
                location: 'string - job location or null',
                salary: 'string - salary range or null',
                url: 'string - job posting URL or null',
                description: 'string - brief job description or null',
                postedDate: 'string - when posted or null',
                jobType: 'string - full-time/part-time etc or null',
                experienceLevel: 'string - entry/mid/senior or null',
              },
            ],
          },
        }
      );

      if (!jobListings || !jobListings.jobs || !Array.isArray(jobListings.jobs)) {
        this.log(logger, 'warn', 'No jobs extracted or invalid format');
        return [];
      }

      // Transform the extracted data to our Job type
      const results: Job[] = jobListings.jobs.map((job: any, index: number) => ({
        id: `linkedin-${Date.now()}-${index}`,
        position: job.title || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: job.location || 'Location not specified',
        salary: job.salary || 'Not specified',
        status: 'pending' as JobStatus,
        lastUpdated: new Date().toISOString(),
        previewUrl: job.url || undefined,
        source: 'linkedin' as const,
        description: job.description || undefined,
        postedDate: job.postedDate || undefined,
        jobType: job.jobType || undefined,
        experienceLevel: job.experienceLevel || undefined,
      }));

      // Use base class logging for consistency
      this.logExtractedJobs(logger, jobListings.jobs, results);

      return results;
    } catch (error) {
      this.log(logger, 'error', 'Job extraction failed', {
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }
}
