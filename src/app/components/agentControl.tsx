'use client';
import { Play, Pause, Search, MapPin, CheckSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { runStagehand } from '../api/stagehand/run';
import { JobSearchState, Job } from '../types/general-types';
import StatusIndicator from './statusIndicator';

interface AgentControlProps {
  onJobsFound?: (jobs: Job[]) => void;
  useMock?: boolean;
}

export default function AgentControl({ onJobsFound, useMock = false }: AgentControlProps) {
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

  const startSearch = async () => {
    if (searchState.isSearching) return;

    setSearchState((prev) => ({ ...prev, isSearching: true }));
    setStatus({
      state: 'searching',
      message: 'Searching for jobs on LinkedIn...',
    });

    try {
      // Call the server-side Stagehand function
      const result = await runStagehand({
        keywords: searchState.keywords,
        location: searchState.location,
        remote: searchState.remote,
        experience: searchState.experience,
      });

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
    <div className="space-y-6">
      <div className="rounded-lg p-6 shadow shadow-[var(--border)] bg-[var(--input)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-[var(--foreground)]">AI Job Search Agent</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {useMock ? '(Mock Mode) ' : ''}
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

        {/* Search Parameters */}
        <StatusIndicator status={status.state} message={status.message} />

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
                onChange={(e) => setSearchState((prev) => ({ ...prev, keywords: e.target.value }))}
                disabled={searchState.isSearching}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center mb-1">
                <MapPin className="w-4 h-4 mr-1 text-[var(--muted-foreground)]" />
                <label className="text-sm font-medium text-[var(--foreground)]">Location</label>
              </div>
              <input
                type="text"
                placeholder="E.g., San Francisco, Remote"
                className="w-full px-3 py-2 border rounded-md border-[var(--border)] bg-transparent text-[var(--foreground)] placeholder-[var(--muted-foreground)]"
                value={searchState.location}
                onChange={(e) => setSearchState((prev) => ({ ...prev, location: e.target.value }))}
                disabled={searchState.isSearching}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remote"
              className="mr-2"
              checked={searchState.remote}
              onChange={(e) => setSearchState((prev) => ({ ...prev, remote: e.target.checked }))}
              disabled={searchState.isSearching}
            />
            <label htmlFor="remote" className="text-sm text-[var(--foreground)]">
              Remote Only
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
