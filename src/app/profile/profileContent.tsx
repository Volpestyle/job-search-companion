'use client';
import { UserCircle2 } from 'lucide-react';

export default function ProfileContent() {
  return (
    <div className="rounded-lg p-6 shadow shadow-[var(--border)]">
      <div className="flex items-center space-x-4 mb-6">
        <UserCircle2 className="w-16 h-16 text-[var(--muted-foreground)]" />
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Your Profile</h2>
          <p className="text-[var(--muted-foreground)]">
            Complete your profile to help AI find the best matches
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Full Name</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--input)] text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Professional Summary
          </label>
          <textarea
            rows={4}
            className="mt-1 block w-full rounded-md border-[var(--border)] bg-[var(--input)] text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Resume</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[var(--border)] border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <div className="flex text-sm text-[var(--muted-foreground)]">
                <label className="relative cursor-pointer rounded-md font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
                  <span>Upload a file</span>
                  <input type="file" className="sr-only" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
