"use client";
import { useState } from "react";
import { Job } from "../types/general-types";
import { BookmarkPlus, Eye, ThumbsUp, X } from "lucide-react";

export default function JobsTable({ jobs }: { jobs: Job[] }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
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
                <div className="text-sm text-[var(--muted-foreground)]">
                  {job.lastUpdated}
                </div>
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  <Eye className="w-5 h-5 inline" />
                </button>
                <button className="text-green-400 hover:text-green-300">
                  <ThumbsUp className="w-5 h-5 inline" />
                </button>
                <button className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  <BookmarkPlus className="w-5 h-5 inline" />
                </button>
                <button className="text-red-400 hover:text-red-300">
                  <X className="w-5 h-5 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
