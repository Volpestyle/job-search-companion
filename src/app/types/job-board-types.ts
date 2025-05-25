/**
 * Types for different job boards and search strategies
 */

export type JobBoard = 'linkedin' | 'indeed' | 'glassdoor' | 'ziprecruiter' | 'dice';

export interface JobBoardConfig {
  name: JobBoard;
  displayName: string;
  baseUrl: string;
  requiresAuth: boolean;
  enabled: boolean;
  searchStrategy: 'web' | 'api';
}

export interface JobBoardSearchParams {
  board: JobBoard;
  keywords: string;
  location?: string;
  remote?: boolean;
  experience?: string[];
  datePosted?: '24h' | '7d' | '30d' | 'all';
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryMin?: number;
  salaryMax?: number;
}

// Job board configurations
export const JOB_BOARDS: Record<JobBoard, JobBoardConfig> = {
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com/jobs/',
    requiresAuth: true,
    enabled: true,
    searchStrategy: 'web',
  },
  indeed: {
    name: 'indeed',
    displayName: 'Indeed',
    baseUrl: 'https://www.indeed.com/',
    requiresAuth: false,
    enabled: false, // Coming soon
    searchStrategy: 'web',
  },
  glassdoor: {
    name: 'glassdoor',
    displayName: 'Glassdoor',
    baseUrl: 'https://www.glassdoor.com/Job/',
    requiresAuth: false,
    enabled: false, // Coming soon
    searchStrategy: 'web',
  },
  ziprecruiter: {
    name: 'ziprecruiter',
    displayName: 'ZipRecruiter',
    baseUrl: 'https://www.ziprecruiter.com/',
    requiresAuth: false,
    enabled: false, // Coming soon
    searchStrategy: 'web',
  },
  dice: {
    name: 'dice',
    displayName: 'Dice',
    baseUrl: 'https://www.dice.com/',
    requiresAuth: false,
    enabled: false, // Coming soon
    searchStrategy: 'web',
  },
};
