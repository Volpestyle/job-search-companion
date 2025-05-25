'use client';
import { ArrowRight, Bot, ThumbsUp, Play, UserCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-5xl font-bold text-[var(--foreground)] mb-6">
              <span className="text-[var(--accent)] block">Turbo-charge</span>
              your job search
            </h1>
            <p className="text-xl text-[var(--muted-foreground)] mb-8">
              Let an AI agent handle the tedious parts of job hunting. Upload your resume once, and
              watch as the agent finds and fills out applications for you. You stay in control -
              review and approve each submission.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {}}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
              >
                Try it out
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="bg-[var(--input)] rounded-lg shadow-lg shadow-[var(--border)] p-6 max-w-lg">
              <div className="flex items-center space-x-3 mb-6">
                <Bot className="w-6 h-6 text-[var(--accent)]" />
                <div className="h-2 bg-[var(--accent)] rounded-full w-24 animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-2 bg-[var(--muted)] rounded-full w-3/4"></div>
                <div className="h-2 bg-[var(--muted)] rounded-full w-1/2"></div>
                <div className="h-2 bg-[var(--muted)] rounded-full w-5/6"></div>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-950 text-green-200">
                    Match: 95%
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--accent)] text-white">
                    Senior Level
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-[var(--input)] rounded-lg shadow-lg shadow-[var(--border)] p-4">
              <div className="flex items-center space-x-2">
                <ThumbsUp className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-[var(--foreground)]">Auto-filled</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[var(--input)] rounded-lg p-6 shadow-lg shadow-[var(--border)]">
            <div className="w-12 h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              AI-Powered Search
            </h3>
            <p className="text-[var(--muted-foreground)]">
              Our AI agent continuously scans job boards to find positions matching your profile and
              preferences.
            </p>
          </div>

          <div className="bg-[var(--input)] rounded-lg p-6 shadow-lg shadow-[var(--border)]">
            <div className="w-12 h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center mb-4">
              <Play className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Automated Applications
            </h3>
            <p className="text-[var(--muted-foreground)]">
              Save time with AI-powered form filling. Review and approve applications before they're
              submitted.
            </p>
          </div>

          <div className="bg-[var(--input)] rounded-lg p-6 shadow-lg shadow-[var(--border)]">
            <div className="w-12 h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center mb-4">
              <UserCircle2 className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              You're in Control
            </h3>
            <p className="text-[var(--muted-foreground)]">
              Review each application before submission. Save interesting positions or mark them as
              not interested.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
