/**
 * LinkedIn-specific job search strategy
 */
import { z } from 'zod';
import { BaseJobSearchStrategy, JobSearchContext } from './base-strategy';
import { Job, JobStatus } from '@/app/types/general-types';

// Schema for LinkedIn job listing extraction
const linkedInJobSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string().describe('The job title/position'),
      company: z.string().describe('The company name'),
      location: z.string().describe('Job location'),
      salary: z.string().optional().describe('Salary information if available'),
      url: z.string().describe('URL of the job posting'),
    })
  ),
});

export class LinkedInStrategy extends BaseJobSearchStrategy {
  constructor() {
    super('linkedin', 'LinkedIn');
  }

  async search(context: JobSearchContext): Promise<Job[]> {
    const { page, params, sessionId, logger } = context;

    this.log(logger, 'info', 'Starting job search', { params });

    // Navigate to LinkedIn
    await this.navigateToSearch(page);

    // Check authentication
    const isAuthenticated = await this.checkAuth(page);
    if (!isAuthenticated) {
      throw new Error(
        'LinkedIn session has expired. Please run: pnpm linkedin-auth to re-authenticate.'
      );
    }

    // Fill search form
    await this.fillSearchForm(context);

    // Extract jobs
    return await this.extractJobs(context);
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
      waitUntil: 'networkidle',
    });
  }

  async fillSearchForm(context: JobSearchContext): Promise<void> {
    const { page, params, logger, sessionId } = context;

    // Use observe to identify form fields
    const formElements = await page.observe(
      'Find the job title search field and location search field'
    );

    if (!formElements || formElements.length === 0) {
      this.log(logger, 'error', 'No form elements found');
      throw new Error('Could not find job search form on LinkedIn page');
    }

    this.log(logger, 'debug', 'Found form elements', { count: formElements.length });

    // Fill job title/keywords field
    if (params.keywords) {
      const keywordField = formElements.find(
        (el) =>
          el.description.toLowerCase().includes('job title') ||
          el.description.toLowerCase().includes('keyword')
      );

      if (keywordField) {
        this.log(logger, 'debug', 'Found keyword field', {
          description: keywordField.description,
        });
        await page.act(keywordField);
        await page.act(`type "${params.keywords}"`);
      } else {
        this.log(logger, 'debug', 'Using natural language to fill keyword field');
        await page.act(`type "${params.keywords}" in the job title field`);
      }
    }

    // Fill location field
    if (params.location) {
      const locationField = formElements.find((el) =>
        el.description.toLowerCase().includes('location')
      );

      if (locationField) {
        this.log(logger, 'debug', 'Found location field', {
          description: locationField.description,
        });
        await page.act(locationField);
        await page.act(`type "${params.location}"`);
      } else {
        this.log(logger, 'debug', 'Using natural language to fill location field');
        await page.act(`type "${params.location}" in the location field`);
      }
    }

    // Click search button
    this.log(logger, 'progress', 'Submitting search', 75, sessionId);
    await page.act('click the search button');

    // Wait for search results to load
    this.log(logger, 'progress', 'Waiting for search results', 80, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async extractJobs(context: JobSearchContext): Promise<Job[]> {
    const { page, logger, sessionId } = context;

    // Extract job data using Zod schema
    this.log(logger, 'progress', 'Extracting job listings with AI', 90, sessionId);
    this.log(logger, 'info', 'Starting job extraction', {
      instruction: 'Extract all visible job listings from LinkedIn search results',
      expectedFields: ['title', 'company', 'location', 'salary', 'url'],
    });

    const jobListings = await page.extract({
      instruction:
        'Extract all visible job listings from the LinkedIn search results page. Include the job title, company name, location, salary if available, and the URL of the job posting.',
      schema: linkedInJobSchema,
    });

    this.log(logger, 'info', 'Job extraction completed', {
      jobCount: jobListings.jobs.length,
    });

    // Transform the extracted data to our Job type
    const results = jobListings.jobs.map((job: Record<string, string>, index: number) => ({
      id: `linkedin-${Date.now()}-${index}`,
      position: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || 'Not specified',
      status: 'pending' as JobStatus,
      lastUpdated: new Date().toISOString(),
      previewUrl: job.url,
      source: 'linkedin' as const,
    }));

    return results;
  }
}
