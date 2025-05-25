# Job Search Companion - Product Specification

## Overview

Job Search Companion is an AI-powered web application that automates job searching across multiple job boards using browser automation and local LLM processing. The application leverages Stagehand (Playwright-based browser automation) and Ollama (local LLM) to intelligently navigate job sites, extract structured job data, and present it in a unified interface.

## Current State

### Core Features Implemented

#### 1. **Automated Job Search**

- **LinkedIn Integration**: Fully functional job search on LinkedIn with authentication
- **Search Parameters**:
  - Keywords (required): Job title or search terms
  - Location (optional): Geographic location for job search
  - Remote: Toggle for remote-only positions
  - Experience Level: Entry, Mid, Senior, or Any

#### 2. **Authentication System**

- **LinkedIn Session Management**:
  - Manual authentication script (`pnpm linkedin-auth`)
  - Cookie persistence in `.linkedin-session/session.json`
  - Session injection using Playwright's `addCookies()`
  - Session validation and expiry warnings
  - LinkedIn cookies (li_at) last 1 year per official documentation

#### 3. **Real-time Progress Tracking**

- **Server-Sent Events (SSE)** for live updates
- **Progress Bar UI** with three phases:
  - Initialization (Ollama checks, browser launch)
  - Search (Navigation, form filling)
  - Extraction (AI-powered job data parsing)
- **Activity Log** showing recent actions with timestamps

#### 4. **AI-Powered Data Extraction**

- **Ollama Integration** for local LLM processing
- **Structured Data Extraction** using Zod schemas
- **Job Fields Extracted**:
  - Position title
  - Company name
  - Location
  - Salary information
  - Job type (Full-time, Contract, etc.)
  - Experience level
  - Posted date
  - Job description
  - LinkedIn job URL

#### 5. **Error Handling & Validation**

- **Pre-flight Checks**:
  - Ollama connectivity verification
  - Model availability check
  - LinkedIn session validation
- **Input Validation**:
  - Required keywords check
  - Empty search prevention
- **Detailed Error Messages** with actionable instructions

#### 6. **Logging System**

- **File-based Logging** in `agent-logs/` directory
- **Session-based Log Files**: `{sessionId}.log`
- **LLM Request/Response Logging** for debugging
- **Structured Log Entries** with timestamps and metadata

### Technical Architecture

#### Frontend (Next.js 15)

- **Pages**:
  - `/` - Landing page
  - `/jobs` - Job search interface
  - `/profile` - User profile (placeholder)
- **Components**:
  - `AgentControl` - Search parameter inputs and controls
  - `JobsTable` - Results display with source badges
  - `ProgressBar` - Real-time progress visualization
  - `StatusIndicator` - Success/error messaging

#### Backend (Next.js API Routes)

- **API Endpoints**:
  - `/api/stagehand/route` - Main job search endpoint
  - `/api/progress/route` - SSE endpoint for progress updates
- **Strategy Pattern** for job boards:
  - `BaseStrategy` - Abstract class defining interface
  - `LinkedInStrategy` - LinkedIn-specific implementation
  - Extensible design for future job boards

#### Infrastructure

- **Browser Automation**: Stagehand (Playwright wrapper)
  - **Important**: Prioritize Stagehand methods over direct Playwright usage
  - Use `stagehand.act()`, `stagehand.extract()`, `stagehand.observe()` instead of Playwright selectors
  - Refer to `../stagehand` local source code for implementation details
- **AI Processing**: Ollama with OpenAI-compatible API
- **State Management**: React hooks and local state
- **Styling**: Tailwind CSS with CSS variables for theming

### Configuration

#### Environment Variables (.env.local)

```
# Stagehand Configuration
STAGEHAND_ENV=LOCAL  # or BROWSERBASE, AWS
BROWSERBASE_API_KEY=your-key-here

# Ollama Configuration
OLLAMA_MODEL=mistral  # or qwen2.5:7b, llama3.2:3b
OLLAMA_HOST=localhost
OLLAMA_PORT=11434

# Debug Options
STAGEHAND_DEBUG=false
STAGEHAND_VERBOSE=false
```

#### Supported Ollama Models

| Model     | Size | Best For                         | Performance          |
| --------- | ---- | -------------------------------- | -------------------- |
| Mistral   | 7B   | General use, reliable extraction | Balanced             |
| Qwen2.5   | 7B   | Structured data extraction       | High accuracy        |
| Llama 3.2 | 3B   | Fast processing                  | Quick, good accuracy |

## User Workflows

### 1. First-Time Setup

1. Install Ollama and pull a model
2. Configure environment variables
3. Run LinkedIn authentication: `pnpm linkedin-auth`
4. Start the application: `pnpm dev`

### 2. Job Search Flow

1. Navigate to `/jobs`
2. Enter search keywords (required)
3. Set optional filters (location, remote, experience)
4. Click "Start Agent"
5. Monitor real-time progress
6. Review extracted job listings
7. Click job titles to view on LinkedIn

### 3. Session Management

- Sessions persist for future searches
- Re-authentication needed if:
  - LinkedIn invalidates session
  - Session is over 30 days old (warning)
  - User logs out of LinkedIn in browser

## Data Models

### JobSearchParams

```typescript
{
  keywords: string;      // Required search terms
  location?: string;     // Geographic location
  remote?: boolean;      // Remote positions only
  experience?: 'entry' | 'mid' | 'senior' | 'any';
}
```

### Job

```typescript
{
  id: string;           // Unique identifier
  source: string;       // Job board source (e.g., 'linkedin')
  position: string;     // Job title
  company: string;      // Company name
  location?: string;    // Job location
  salary?: string;      // Salary information
  jobType?: string;     // Full-time, Contract, etc.
  experienceLevel?: string;
  postedDate?: string;  // When job was posted
  description?: string; // Job description
  url?: string;         // Link to job posting
}
```

## Security Considerations

1. **Local LLM Processing**: All AI processing happens locally via Ollama
2. **Cookie Security**: LinkedIn session stored locally, gitignored
3. **No Credential Storage**: Users manually authenticate
4. **Sanitized Logging**: Sensitive data redacted in logs

## Current Limitations

1. **Single Job Board**: Only LinkedIn is currently supported
2. **Manual Authentication**: No automated login (by design for security)
3. **No Data Persistence**: Jobs not saved to database
4. **Limited Filtering**: Basic search parameters only
5. **No Application Tracking**: Can't track applied jobs yet

## Planned Features

### Phase 1: Enhanced Search

- [ ] Additional job boards (Indeed, Glassdoor, Dice)
- [ ] Advanced filters (salary range, company size)
- [ ] Saved search profiles
- [ ] Search history

### Phase 2: Data Management

- [ ] Database integration (PostgreSQL/SQLite)
- [ ] Job deduplication across boards
- [ ] Export functionality (CSV, JSON)
- [ ] Job change tracking

### Phase 3: Application Management

- [ ] Application status tracking
- [ ] Resume parsing and storage
- [ ] Cover letter generation
- [ ] Application automation

### Phase 4: Intelligence Layer

- [ ] Job matching algorithm
- [ ] Personalized recommendations
- [ ] Salary insights
- [ ] Company research integration

## Development Guidelines

### Code Organization

- **Separation of Concerns**: UI, business logic, and automation separated
- **Strategy Pattern**: New job boards implement `BaseStrategy`
- **Error Boundaries**: Graceful error handling at all levels
- **Type Safety**: Full TypeScript with Zod validation
- **Stagehand Usage**: Prefer Stagehand's AI-powered methods over direct Playwright
  - Use `observe()` to find elements intelligently
  - Use `act()` for interactions instead of `click()`
  - Use `extract()` for data extraction with AI
  - Check `../stagehand` source code for implementation examples

### Testing Approach

- Manual testing for browser automation
- Unit tests for data transformation
- Integration tests for API endpoints
- E2E tests for critical user flows

### Performance Considerations

- Server-side job search to avoid client resource usage
- Streaming progress updates via SSE
- Efficient DOM querying in Stagehand
- Capped extraction limits (default: 10 jobs)

## Deployment Considerations

### Local Development

- Ollama must be running locally
- LinkedIn session needs manual setup
- Full Playwright installation required

### Production Deployment

- We want to integrate with AWS for a cost-effective cloud browsing solution over browser base.
- Implement proper session management
- Add rate limiting for API endpoints
- Set up monitoring and alerting
