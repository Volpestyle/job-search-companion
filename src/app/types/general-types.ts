export type JobStatus = 'new' | 'saved' | 'applied' | 'ignored';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string; // Dynamic - can be any job board
  datePosted: string;
  salary: string | null;
  jobType: string; // 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary'
  isRemote: boolean;
  hasEasyApply: boolean;
  status: JobStatus;
  tags: string[];
  matchScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchState {
  isSearching: boolean;
  keywords: string;
  location: string;
  remote: boolean;
  experience: string[];
  results: Job[];
}

export interface JobBoardConfig {
  name: string;
  url: string;
  searchUrl?: string;
  customService?: boolean;
}

export interface JobSearchParams {
  keywords: string; // Required now
  location?: string;
  remote?: boolean;
  easyApply?: boolean;
  workType?: string;
  experience?: string[];
  boards: JobBoardConfig[]; // Required now
}

export interface JobSearchResult {
  success: boolean;
  jobs: Job[];
  sessionId?: string;
  resultsByBoard?: { board: string; jobs: Job[] }[];
  error?: string;
}
