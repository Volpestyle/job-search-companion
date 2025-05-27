'use client';
import { Play, Pause, Search, MapPin, CheckSquare, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { runJobSearch } from '../api/stagehand/run';
import { JobSearchState, Job, JobBoardConfig } from '../types/general-types';
import StatusIndicator from './statusIndicator';
import ProgressBar from './progressBar';
import { JobBoardSelector } from './jobBoardSelector';
import { loadSelectedJobBoards } from '../utils/jobBoardStorage';
import { useAuthStatus } from '../hooks/useAuthStatus';
import { AuthModal } from './authModal';

interface AgentControlProps {
  onJobsFound?: (jobs: Job[]) => void;
}

export default function AgentControl({ onJobsFound }: AgentControlProps) {
  const [searchState, setSearchState] = useState<JobSearchState>({
    isSearching: false,
    keywords: '',
    location: '',
    remote: false,
    experience: [],
    results: [],
  });

  const [status, setStatus] = useState<{
    state: 'idle' | 'searching' | 'success' | 'error';
    message: string;
  }>({
    state: 'idle',
    message: '',
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [selectedBoards, setSelectedBoards] = useState<JobBoardConfig[]>(() =>
    loadSelectedJobBoards()
  );
  const { authState } = useAuthStatus(sessionId);

  const startSearch = async () => {
    if (searchState.isSearching) return;

    // Validate required fields
    if (!searchState.keywords.trim()) {
      setStatus({
        state: 'error',
        message: 'Please enter job keywords or title to search',
      });
      return;
    }

    // Generate a new sessionId for this search
    const newSessionId = `job-search-${Date.now()}`;
    setSessionId(newSessionId);

    setSearchState((prev) => ({ ...prev, isSearching: true }));
    const boardNames = selectedBoards.map((b) => b.name).join(', ');
    setStatus({
      state: 'searching',
      message: `Searching for jobs on ${boardNames}...`,
    });

    try {
      // Call the server-side job search function
      const result = await runJobSearch(
        {
          keywords: searchState.keywords,
          location: searchState.location,
          remote: searchState.remote,
          experience: searchState.experience,
          boards: selectedBoards,
        },
        newSessionId
      );

      if (result.success) {
        setSearchState((prev) => ({
          ...prev,
          isSearching: false,
          results: result.jobs, // Now guaranteed to be an array
        }));

        setStatus({
          state: 'success',
          message: `Found ${result.jobs.length} job listings!`,
        });

        // Store sessionId for future use
        if (result.sessionId) {
          setSessionId(result.sessionId);
        }

        if (onJobsFound) {
          onJobsFound(result.jobs);
        }
      } else {
        console.error('Job search failed:', result.error);
        setSearchState((prev) => ({ ...prev, isSearching: false }));
        setStatus({
          state: 'error',
          message: result.error || 'Failed to search for jobs',
        });
      }
    } catch (error) {
      console.error('Error in job search:', error);
      setSearchState((prev) => ({ ...prev, isSearching: false }));
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const stopSearch = async () => {
    setSearchState((prev) => ({ ...prev, isSearching: false }));
    // Note: We would need additional logic to cancel an in-progress search
  };

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-lg p-6 shadow shadow-[var(--border)] bg-[var(--input)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-[var(--foreground)]">AI Job Search Agent</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                The agent will search and prepare applications based on your profile
              </p>
            </div>
            <button
              onClick={searchState.isSearching ? stopSearch : startSearch}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                searchState.isSearching
                  ? 'bg-red-950 text-red-200 hover:bg-red-900'
                  : 'bg-green-950 text-green-200 hover:bg-green-900'
              }`}
            >
              {searchState.isSearching ? (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Stop Agent
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Start Agent
                </>
              )}
            </button>
          </div>

          {/* Progress Bar - shows when searching */}
          {searchState.isSearching && sessionId && <ProgressBar sessionId={sessionId} />}

          {/* Status Indicator - shows for errors and completion */}
          {!searchState.isSearching && (
            <StatusIndicator status={status.state} message={status.message} />
          )}

          <div className="space-y-4 mt-4 mb-2">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <Search className="w-4 h-4 mr-1 text-[var(--muted-foreground)]" />
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Job Title / Keywords
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="E.g., Software Engineer, Developer"
                  className="w-full px-3 py-2 border rounded-md border-[var(--border)] bg-transparent text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                  value={searchState.keywords}
                  onChange={(e) =>
                    setSearchState((prev) => ({ ...prev, keywords: e.target.value }))
                  }
                  disabled={searchState.isSearching}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <MapPin className="w-4 h-4 mr-1 text-[var(--muted-foreground)]" />
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Location{' '}
                    <span className="text-xs text-[var(--muted-foreground)]">(optional)</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Auto-filled from your LinkedIn profile"
                  className="w-full px-3 py-2 border rounded-md border-[var(--border)] bg-transparent text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                  value={searchState.location}
                  onChange={(e) =>
                    setSearchState((prev) => ({ ...prev, location: e.target.value }))
                  }
                  disabled={searchState.isSearching}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remote"
                  className="mr-2"
                  checked={searchState.remote}
                  onChange={(e) =>
                    setSearchState((prev) => ({ ...prev, remote: e.target.checked }))
                  }
                  disabled={searchState.isSearching}
                />
                <label htmlFor="remote" className="text-sm text-[var(--foreground)]">
                  Remote Only
                </label>
              </div>

              <button
                onClick={() => setShowBoardSelector(true)}
                disabled={searchState.isSearching}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings className="w-4 h-4 mr-2" />
                Job Boards ({selectedBoards.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Job Board Selector Modal */}
      <JobBoardSelector
        isOpen={showBoardSelector}
        onClose={() => setShowBoardSelector(false)}
        onSave={(boards) => {
          setSelectedBoards(boards);
          // Update status to show selected boards
          if (boards.length > 0) {
            setStatus({
              state: 'idle',
              message: `Selected ${boards.length} job board${boards.length !== 1 ? 's' : ''}: ${boards.map((b) => b.name).join(', ')}`,
            });
          }
        }}
      />

      {/* Auth Modal */}
      <AuthModal authState={authState} />
    </>
  );
}
