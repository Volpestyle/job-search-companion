"use client";
import { useState } from "react";
import { Job, JobStatus } from "../types/general-types";
import { BookmarkPlus, Eye, ThumbsUp, X } from "lucide-react";
import JobDetails from "./jobDetails";

interface JobsTableProps {
  jobs: Job[];
  onStatusChange?: (jobId: string, newStatus: JobStatus) => void;
}

export default function JobsTable({ jobs, onStatusChange }: JobsTableProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    if (onStatusChange) {
      onStatusChange(jobId, newStatus);
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "saved":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
      case "ignored":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <>
      <div className="shadow rounded-lg overflow-hidden bg-[var(--input)] border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-[var(--muted)]">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-[var(--foreground)]">
                    {job.position}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {job.company}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {job.location}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {job.salary}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {new Date(job.lastUpdated).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                    title="View details"
                  >
                    <Eye className="w-5 h-5 inline" />
                  </button>
                  <button
                    onClick={() => handleStatusChange(job.id, "saved")}
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                    title="Save job"
                  >
                    <BookmarkPlus className="w-5 h-5 inline" />
                  </button>
                  <button
                    onClick={() => handleStatusChange(job.id, "ignored")}
                    className="text-red-400 hover:text-red-300"
                    title="Ignore job"
                  >
                    <X className="w-5 h-5 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedJob && (
        <JobDetails
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
