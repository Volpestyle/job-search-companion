# Tests

This directory contains integration and unit tests for the Job Search Companion application.

## Integration Tests

### AI Navigator Tests

The `ai-navigator.spec.ts` file tests the AI-powered browser navigation against real websites using Playwright Test.

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with LinkedIn authentication
pnpm test:linkedin

# Run tests without authentication (public pages only)
pnpm test:no-auth

# Run tests with visible browser (authenticated)
pnpm test:headed

# Debug tests interactively (authenticated)
pnpm test:debug

# Open Playwright UI mode
pnpm test:ui

# View test report
pnpm test:report

# Run with fixture recording (authenticated)
pnpm test:fixtures
```

#### Best Visibility Options

For the best visibility into what the AI Navigator is doing:

**1. Interactive UI Mode (Recommended)**

```bash
pnpm test:ui
```

- Opens Playwright's UI where you can:
  - See all tests in a sidebar
  - Click to run individual tests
  - Watch the browser in real-time
  - See logs and errors inline
  - Time-travel through test steps

**2. Debug Mode**

```bash
pnpm test:debug
```

- Opens Playwright Inspector
- Step through tests line by line
- See browser state at each step
- Inspect elements and selectors
- Perfect for debugging failures

**3. Headed Mode with Slow Motion**

```bash
SLOW_MO=1000 pnpm test:headed
```

- Shows browser window
- Slows down actions by 1 second
- Good for watching AI decisions
- Add `HIGHLIGHT=1` to highlight found elements

**4. Watch Test Execution**

```bash
# See what elements the AI finds
DEBUG=1 pnpm test:headed

# Take screenshots of found elements
SCREENSHOT=1 pnpm test:headed

# Pause after finding elements
PAUSE=1 pnpm test:headed
```

**5. View Test Reports**

```bash
# After running tests
pnpm test:report
```

- Opens HTML report with:
  - Test results and timings
  - Screenshots on failure
  - Video recordings (on failure)
  - Full test traces

#### Authentication Setup

Tests can run with or without LinkedIn authentication:

1. **Generate LinkedIn session**: Run `pnpm linkedin-auth` and log in manually
2. **Session is saved**: Stored in `.linkedin-session/session.json`
3. **Tests use session**: The `setup` project loads cookies and localStorage
4. **Auth state cached**: Playwright saves auth state in `playwright/.auth/`

The authenticated tests will have access to logged-in LinkedIn features.

#### Environment Variables

- `OLLAMA_URL` - Ollama API URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model to use (default: qwen2.5:32b)
- `USE_RECORDED_TREES` - Use recorded accessibility trees instead of live sites
- `RECORD_TREES` - Record accessibility trees during test run
- `DEBUG` - Show debug output
- `HEADLESS` - Run browser in headless mode (default: 1)
- `SLOW_MO` - Slow down browser actions by X milliseconds
- `HIGHLIGHT` - Highlight found elements in browser (requires HEADLESS=0)
- `SCREENSHOT` - Take screenshots of found elements

#### Test Structure

Each test case includes:

- **name**: Test identifier
- **url**: URL to test against
- **instruction**: Natural language instruction for AI Navigator
- **expectedToFind**: Whether elements should be found
- **minElements**: Minimum number of elements expected

#### Benefits of Integration Tests

1. **Real Browser Testing**: Tests actual Chrome DevTools Protocol integration
2. **No Mocking**: Tests real interactions, not mock implementations
3. **Flexibility**: Can test against any website
4. **Recording**: Can record accessibility trees for offline/fast testing
5. **Visual Debugging**: Can see what the AI is finding in real-time

## Test Organization

- `/fixtures` - Test data and recorded accessibility trees
- `/logs` - Test execution logs
- `/screenshots` - Visual test artifacts (when SCREENSHOT=1)
