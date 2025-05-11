"use client";
import { useState } from "react";
import AgentControl from "../components/agentControl";
import JobsTable from "../components/jobsTable";
import { Job } from "../types/general-types";

export default function JobsContent({ initialJobs = [] }: { initialJobs?: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  const handleJobsFound = (newJobs: Job[]) => {
    setJobs(prevJobs => {
      // Merge new jobs with existing ones, avoiding duplicates by id
      const existingIds = new Set(prevJobs.map(job => job.id));
      const uniqueNewJobs = newJobs.filter(job => !existingIds.has(job.id));

      return [...prevJobs, ...uniqueNewJobs];
    });
  };

  return (
    <div className="space-y-6">
      <AgentControl onJobsFound={handleJobsFound} />

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4 text-[var(--foreground)]">Found Jobs ({jobs.length})</h3>
        {jobs.length > 0 ? (
          <JobsTable jobs={jobs} />
        ) : (
          <div className="text-center p-10 bg-[var(--input)] rounded-lg border border-[var(--border)]">
            <p className="text-[var(--muted-foreground)]">
              No jobs found yet. Start the agent to search for jobs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
