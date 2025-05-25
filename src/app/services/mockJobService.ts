'use client';

import { Job, JobSearchParams } from '../types/general-types';

export class MockJobService {
  private mockJobs: Job[] = [
    {
      id: 'mock-1',
      company: 'TechCorp Inc.',
      position: 'Senior Frontend Developer',
      location: 'San Francisco, CA',
      salary: '$120,000 - $150,000',
      status: 'pending',
      lastUpdated: new Date().toISOString(),
      previewUrl: 'https://example.com/job/1',
    },
    {
      id: 'mock-2',
      company: 'Digital Solutions',
      position: 'Full Stack Engineer',
      location: 'Remote',
      salary: '$100,000 - $130,000',
      status: 'pending',
      lastUpdated: new Date().toISOString(),
      previewUrl: 'https://example.com/job/2',
    },
    {
      id: 'mock-3',
      company: 'Innovation Labs',
      position: 'React Developer',
      location: 'New York, NY',
      salary: '$90,000 - $110,000',
      status: 'pending',
      lastUpdated: new Date().toISOString(),
      previewUrl: 'https://example.com/job/3',
    },
    {
      id: 'mock-4',
      company: 'Cloud Systems',
      position: 'DevOps Engineer',
      location: 'Seattle, WA',
      salary: '$130,000 - $160,000',
      status: 'pending',
      lastUpdated: new Date().toISOString(),
      previewUrl: 'https://example.com/job/4',
    },
    {
      id: 'mock-5',
      company: 'Data Insights',
      position: 'Frontend Engineer',
      location: 'Austin, TX',
      salary: '$95,000 - $120,000',
      status: 'pending',
      lastUpdated: new Date().toISOString(),
      previewUrl: 'https://example.com/job/5',
    },
  ];

  async initialize(): Promise<void> {
    // Nothing to initialize for mock service
    return Promise.resolve();
  }

  async searchJobs(searchParams: JobSearchParams): Promise<Job[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Filter jobs based on search params
    return this.mockJobs.filter((job) => {
      if (
        searchParams.keywords &&
        !job.position.toLowerCase().includes(searchParams.keywords.toLowerCase()) &&
        !job.company.toLowerCase().includes(searchParams.keywords.toLowerCase())
      ) {
        return false;
      }

      if (
        searchParams.location &&
        !job.location.toLowerCase().includes(searchParams.location.toLowerCase())
      ) {
        return false;
      }

      if (searchParams.remote && !job.location.toLowerCase().includes('remote')) {
        return false;
      }

      return true;
    });
  }

  async close(): Promise<void> {
    // Nothing to close for mock service
    return Promise.resolve();
  }
}
