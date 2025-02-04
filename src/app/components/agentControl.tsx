"use client";
import { Play, Pause } from "lucide-react";
import { useState } from "react";

export default function AgentControl() {
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6 shadow shadow-[var(--border)] bg-[var(--input)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-[var(--foreground)]">
              AI Job Search Agent
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              The agent will search and prepare applications based on your
              profile
            </p>
          </div>
          <button
            onClick={() => setIsAgentRunning(!isAgentRunning)}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isAgentRunning
                ? "bg-red-950 text-red-200 hover:bg-red-900"
                : "bg-green-950 text-green-200 hover:bg-green-900"
            }`}
          >
            {isAgentRunning ? (
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
      </div>
    </div>
  );
}
