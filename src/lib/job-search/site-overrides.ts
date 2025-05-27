/**
 * Site-specific override scripts for job boards
 * These are only used when the generic approach needs help
 */

export interface SiteOverride {
  domain: string;
  navigateToSearch?: string;
  performSearch?: string;
  applyEasyApply?: string;
  extractJobsInstruction?: string;
}

// Site-specific overrides - just LinkedIn for now
export const SITE_OVERRIDES: Record<string, SiteOverride> = {
  'linkedin.com': {
    domain: 'linkedin.com',
    navigateToSearch: 'Click on "Jobs" in the main navigation',
    performSearch:
      'Type "{keywords}" in the "Search job titles or companies" field, type "{location}" in the location field, then press Enter',
    applyEasyApply: 'Click on the "Easy Apply" filter button',
    extractJobsInstruction:
      'Extract all job cards from the search results. Each job card contains the job title, company name, location, posted time, and whether it has Easy Apply (indicated by an "Easy Apply" button)',
  },
};

/**
 * Get override for a specific URL
 */
export function getOverrideForUrl(url: string): SiteOverride | null {
  const hostname = new URL(url).hostname;
  return (
    Object.values(SITE_OVERRIDES).find((override) => hostname.includes(override.domain)) || null
  );
}
