import { JobBoardConfig } from '@/app/types/general-types';

const STORAGE_KEY = 'selectedJobBoards';

// Default job boards if none are saved
const DEFAULT_BOARDS: JobBoardConfig[] = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/',
    customService: true,
  },
];

export function loadSelectedJobBoards(): JobBoardConfig[] {
  if (typeof window === 'undefined') {
    return DEFAULT_BOARDS;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return DEFAULT_BOARDS;
  }

  try {
    const boards = JSON.parse(saved) as JobBoardConfig[];
    return boards.length > 0 ? boards : DEFAULT_BOARDS;
  } catch (error) {
    console.error('Error loading saved job boards:', error);
    return DEFAULT_BOARDS;
  }
}

export function saveSelectedJobBoards(boards: JobBoardConfig[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}
