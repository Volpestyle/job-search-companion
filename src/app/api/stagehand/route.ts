// Force Node.js runtime instead of Edge
export const runtime = 'nodejs';

// This file is intentionally empty.
// We're using server actions instead of API routes.
// The runtime configuration above is needed to help Next.js correctly handle
// the stagehand dependency which uses thread-stream that causes issues in Edge runtime.