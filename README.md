# Job Search Companion

A web application that helps automate the job search process using browser automation and AI.

## Features

- Browser automation with Stagehand
- LinkedIn job search integration
- Local LLM integration with Ollama
- AWS cloud integration (future)

## Technology Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Browser Automation**: Stagehand + Playwright
- **LLM Integration**: Ollama, OpenAI-compatible API
- **Cloud Infrastructure**: AWS (future implementation)

## Local Development

### Prerequisites

- Node.js 20+
- Ollama running locally or on a remote machine
- Appropriate environment variables

### Environment Variables

Create a `.env.local` file with:

```env
# Ollama configuration
OLLAMA_HOST=127.0.0.1
OLLAMA_PORT=11434
OLLAMA_MODEL=llama3

# Stagehand configuration
STAGEHAND_ENV=LOCAL
USE_MOCK_DATA=false

# AWS configuration (future)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

### Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Code Formatting and Linting

This project uses Prettier, ESLint, and Husky for code quality:

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check

# Run ESLint
pnpm lint
```

Git hooks (via Husky) automatically run formatting and linting on commits.

## Browser Automation

The application uses Stagehand, which is built on top of Playwright, to automate browser interactions:

- Opens LinkedIn and searches for jobs based on keywords and location
- Extracts job details using AI
- Provides a structured list of job opportunities

## LLM Integration

By default, the application connects to Ollama for LLM capabilities:

- Uses a custom OpenAI-compatible client
- Supports structured data extraction with Zod schemas
- Can be configured to use different models

## Future Improvements

- AWS integration for cloud-based browser automation
- Resume parsing and customization
- Automated application submission
- Interview preparation assistance
