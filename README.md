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
- pnpm package manager
- Ollama installed and running (see Ollama Setup below)
- Chrome/Chromium browser (automatically installed by Playwright)

### Environment Variables

Create a `.env.local` file with:

```env
# Ollama configuration
OLLAMA_HOST=127.0.0.1
OLLAMA_PORT=11434
OLLAMA_MODEL=mistral  # Options: mistral, qwen2.5:7b, llama3.2:3b

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

## Ollama Setup

This application requires Ollama for AI-powered job data extraction. Here's how to set it up:

### Installing Ollama

1. **macOS**:

   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Linux**:

   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

3. **Windows**: Download from [ollama.com](https://ollama.com/download)

### Running Ollama

1. Start Ollama service:

   ```bash
   ollama serve
   ```

2. Pull the required model:

   ```bash
   # Recommended for best extraction quality:
   ollama pull mistral

   # Alternative options:
   # ollama pull qwen2.5:7b  # Best for structured data
   # ollama pull llama3.2:3b # Fastest option
   ```

3. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Remote Ollama Setup

If running Ollama on a different machine:

1. Start Ollama with network binding:

   ```bash
   OLLAMA_HOST=0.0.0.0 ollama serve
   ```

2. Update your `.env.local`:
   ```env
   OLLAMA_HOST=192.168.1.100  # Replace with your Ollama server IP
   OLLAMA_PORT=11434
   ```

## LinkedIn Authentication (Optional)

The job search agent can work with LinkedIn to find job listings. Since LinkedIn requires authentication, we provide a secure way to save and reuse your login session.

### How It Works

1. **Cookie Extraction**: After manual login, we save your LinkedIn session cookies
2. **Cookie Injection**: When the agent runs, we inject cookies using Playwright's [context.addCookies](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-cookies) after browser initialization
3. **Local Storage**: Your session is saved locally in `.linkedin-session/` (automatically added to .gitignore)
4. **No Credentials**: We never store your username/password, only session cookies

### Setting Up LinkedIn Authentication

Run the authentication setup script:

```bash
pnpm linkedin-auth
```

This will:

1. Open a browser window
2. Navigate to LinkedIn login page
3. Wait for you to manually log in (including any 2FA/captcha)
4. Save your session cookies for reuse
5. Close the browser

### Session Management

- **Duration**: LinkedIn's `li_at` authentication cookie lasts 1 year (per [LinkedIn's cookie policy](https://www.linkedin.com/legal/l/cookie-table))
- **Expiration Detection**: The agent automatically detects expired sessions and prompts for re-authentication
- **Session Age Warning**: Sessions older than 30 days will trigger a warning in logs (though they remain valid)
- **Re-authentication**: You'll need to run `pnpm linkedin-auth` again if:
  - The agent reports "LinkedIn session has expired"
  - LinkedIn logs you out for security reasons (suspicious activity, password change, etc.)
  - You manually log out on another device
  - You clear browser cookies on linkedin.com

### Privacy & Security

- Session data is stored locally only
- Never committed to version control
- No passwords are stored
- You can delete `.linkedin-session/` anytime to remove the saved session

## Using the Job Search Agent

### What Happens When You Click "Start Agent"

1. **Browser Launch**: Playwright opens a new Chrome window
2. **LinkedIn Navigation**: Automatically navigates to LinkedIn job search
3. **Search Execution**: Enters your keywords and location, applies filters
4. **Data Extraction**: Uses Ollama to analyze and extract job details
5. **Results Display**: Shows structured job data in the application

### Common Issues and Solutions

**Ollama Connection Failed**

- Ensure Ollama is running: `curl http://localhost:11434/api/tags`
- Check firewall settings if using remote Ollama
- Verify correct host/port in `.env.local`

**Model Not Found**

- Pull the required model: `ollama pull mistral`
- Or update `OLLAMA_MODEL` in `.env.local` to match your installed model

**Browser Automation Issues**

- Playwright will auto-install Chrome on first run
- If issues persist: `pnpm exec playwright install chromium`

## LLM Integration

The application uses Ollama for:

- Extracting structured job data from LinkedIn pages
- Analyzing job descriptions
- Matching jobs to user profiles (future feature)

### Recommended Models

For optimal performance on Apple Silicon (M1/M2/M3):

| Model         | Size | Best For                          | Pull Command              |
| ------------- | ---- | --------------------------------- | ------------------------- |
| **Mistral**   | 7B   | General use, reliable extraction  | `ollama pull mistral`     |
| **Qwen2.5**   | 7B   | Best structured data extraction   | `ollama pull qwen2.5:7b`  |
| **Llama 3.2** | 3B   | Fastest processing, good accuracy | `ollama pull llama3.2:3b` |

Update `OLLAMA_MODEL` in `.env.local` to switch models.

## Future Improvements

- AWS integration for cloud-based browser automation
- Resume parsing and customization
- Automated application submission
- Interview preparation assistance
