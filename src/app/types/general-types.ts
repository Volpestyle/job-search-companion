type JobStatus = "pending" | "saved" | "ignored";

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

export type { Job, JobStatus };
