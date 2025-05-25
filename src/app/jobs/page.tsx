import JobsContent from './jobsContent';

export default function JobsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground)]">Job Search</h1>
      <JobsContent initialJobs={[]} />
    </div>
  );
}
