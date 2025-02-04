import AgentControl from "../components/agentControl";
import JobsTable from "../components/jobsTable";
import { Job } from "../types/general-types";

export default function JobsContent({ jobs }: { jobs: Job[] }) {
  return (
    <div>
      <AgentControl />
      <JobsTable jobs={jobs} />
    </div>
  );
}
