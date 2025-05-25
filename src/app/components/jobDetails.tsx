'use client';
import { X, ExternalLink, ThumbsUp, ThumbsDown, BookmarkPlus } from 'lucide-react';
import { Job } from '../types/general-types';
import { useState, useEffect } from 'react';

interface JobDetailsProps {
  job: Job;
  onClose: () => void;
  onStatusChange?: (jobId: string, newStatus: 'saved' | 'ignored') => void;
}

export default function JobDetails({ job, onClose, onStatusChange }: JobDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [jobDetails, setJobDetails] = useState<{
    description?: string;
    requirements?: string[];
    benefits?: string[];
  }>({});

  // This function would use Stagehand to fetch the job details
  const fetchJobDetails = async () => {
    setLoading(true);
    // In a real implementation, this would use the Stagehand service to
    // navigate to the job URL and extract the full description and details

    // Mock implementation for now
    setTimeout(() => {
      setJobDetails({
        description: `This is a detailed description for the ${job.position} role at ${job.company}. 
        The ideal candidate will have experience with modern web technologies and frameworks.`,
        requirements: [
          '5+ years of experience in software development',
          'Strong JavaScript/TypeScript skills',
          'Experience with React and Next.js',
          'Knowledge of modern frontend tooling',
        ],
        benefits: [
          'Competitive salary',
          'Remote work options',
          'Flexible hours',
          'Health benefits',
        ],
      });
      setLoading(false);
    }, 1500);
  };

  // Fetch job details on component mount
  useEffect(() => {
    fetchJobDetails();
  }, []);

  const handleSave = () => {
    onStatusChange?.(job.id, 'saved');
    onClose();
  };

  const handleIgnore = () => {
    onStatusChange?.(job.id, 'ignored');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--muted)] p-4 flex justify-between items-center border-b border-[var(--border)]">
          <h2 className="text-lg font-medium text-[var(--foreground)]">{job.position}</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">{job.company}</h3>
              <p className="text-[var(--muted-foreground)]">{job.location}</p>
              {job.salary && <p className="text-[var(--accent)] font-medium mt-1">{job.salary}</p>}
            </div>

            <div className="flex space-x-2">
              <a
                href={job.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 rounded border border-[var(--border)] text-sm hover:bg-[var(--muted)]"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> View Original
              </a>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--foreground)] mx-auto"></div>
              <p className="mt-2 text-[var(--muted-foreground)]">Loading job details...</p>
            </div>
          ) : (
            <>
              {jobDetails.description && (
                <div>
                  <h4 className="text-md font-medium mb-2 text-[var(--foreground)]">Description</h4>
                  <div className="text-sm text-[var(--muted-foreground)] whitespace-pre-line">
                    {jobDetails.description}
                  </div>
                </div>
              )}

              {jobDetails.requirements && jobDetails.requirements.length > 0 && (
                <div>
                  <h4 className="text-md font-medium mb-2 text-[var(--foreground)]">
                    Requirements
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-[var(--muted-foreground)] space-y-1">
                    {jobDetails.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {jobDetails.benefits && jobDetails.benefits.length > 0 && (
                <div>
                  <h4 className="text-md font-medium mb-2 text-[var(--foreground)]">Benefits</h4>
                  <ul className="list-disc pl-5 text-sm text-[var(--muted-foreground)] space-y-1">
                    {jobDetails.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-[var(--muted)] px-6 py-4 border-t border-[var(--border)] flex justify-end space-x-2">
          <button
            onClick={handleIgnore}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-red-950 text-red-200 hover:bg-red-900"
          >
            <ThumbsDown className="w-4 h-4 mr-2" /> Not Interested
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-950 text-green-200 hover:bg-green-900"
          >
            <BookmarkPlus className="w-4 h-4 mr-2" /> Save Job
          </button>
        </div>
      </div>
    </div>
  );
}
