"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="shadow-sm border-b border-[var(--border)] bg-[var(--input)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Turbo Job Hunt
            </h1>
            <Briefcase className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <nav className="flex space-x-8">
            <Link
              href="/profile"
              className={`px-3 py-2 text-sm font-medium ${
                pathname === "/profile"
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Profile
            </Link>
            <Link
              href="/jobs"
              className={`px-3 py-2 text-sm font-medium ${
                pathname === "/jobs"
                  ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Jobs
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
