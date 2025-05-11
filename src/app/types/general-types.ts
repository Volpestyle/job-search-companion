type JobStatus = 'pending' | 'saved' | 'ignored';

interface Job {
  id: string;
  company: string;
  position: string;
  location: string;
  salary: string;
  status: JobStatus;
  lastUpdated: string;
  previewUrl: string;
}

interface JobSearchState {
  isSearching: boolean;
  keywords: string;
  location: string;
  remote: boolean;
  experience: string[];
  results: Job[];
}

export interface JobSearchParams {
  keywords?: string;
  location?: string;
  remote?: boolean;
  experience?: string[];
}

export type { Job, JobStatus, JobSearchState };
