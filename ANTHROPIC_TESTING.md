# Anthropic Integration Testing

This document explains how to run integration tests using the Anthropic Claude API instead of the default Ollama setup.

## Prerequisites

1. **Anthropic API Key**: You need a valid Anthropic API key
2. **Environment Setup**: The API key must be configured in your environment

## Environment Configuration

### Option 1: Use the Test Environment File

Copy the test environment configuration and add your API key:

```bash
cp .env.test.anthropic .env.local
# Then edit .env.local and replace 'sk-ant-api03-your-anthropic-api-key-here' with your actual API key
```

### Option 2: Manual Configuration

Add these variables to your `.env.local` file:

```bash
# LLM Provider Configuration
LLM_PROVIDER=anthropic

# Anthropic Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Stagehand configuration
STAGEHAND_ENV=LOCAL

# Test configuration
USE_RECORDED_TREES=0
RECORD_TREES=0
DEBUG=0
HEADLESS=1
SLOW_MO=0
HIGHLIGHT=0
SCREENSHOT=0
FIXTURE_MODE=0
```

## Running the Tests

### Basic Test Run (Headless)

```bash
npm run test:anthropic
```

### Run with Browser Visible

```bash
npm run test:anthropic:headed
```

### Debug Mode (Step-by-step)

```bash
npm run test:anthropic:debug
```

### Run Specific Test

```bash
npx playwright test src/tests/job-search-service-anthropic.spec.ts --grep "LinkedIn"
```

## Test Structure

The Anthropic integration tests include:

1. **LinkedIn Authentication Test**: Tests authentication detection and handling
2. **Indeed Job Search Test**: Tests basic job searching without authentication
3. **Complex Search Performance Test**: Tests multi-board search with filters and performance metrics

## Key Differences from Ollama Tests

- **Timeout**: Increased to 5 minutes (300,000ms) to account for API latency
- **Configuration**: Uses Anthropic-specific LLM configuration
- **Performance Expectations**: Different performance characteristics compared to local Ollama

## Test Logs

Test logs are automatically saved to the `logs/` directory with the session ID format:

```
logs/job-search-anthropic-{timestamp}.log
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**

   ```
   Error: ANTHROPIC_API_KEY environment variable is required for this test
   ```

   Solution: Ensure your API key is properly set in `.env.local`

2. **Model Not Found**

   ```
   Error: ANTHROPIC_MODEL environment variable is required for this test
   ```

   Solution: Verify the model name is correct in your environment

3. **Rate Limiting**
   If you encounter rate limiting, consider:
   - Running tests with longer delays
   - Using a different API tier
   - Running fewer concurrent tests

### Debug Tips

1. **Enable Browser Visibility**: Use `npm run test:anthropic:headed` to see what's happening
2. **Check Logs**: Review the detailed logs in the `logs/` directory
3. **Use Debug Mode**: Use `npm run test:anthropic:debug` for step-by-step debugging

## Performance Comparison

You can compare performance between Ollama and Anthropic by running both test suites:

```bash
# Run Ollama tests (default)
npm run test

# Run Anthropic tests
npm run test:anthropic
```

The logs will include performance metrics for comparison.

## Cost Considerations

- Anthropic API calls incur costs based on token usage
- Each test run may use several thousand tokens
- Monitor your API usage if running tests frequently
- Consider using shorter test scenarios for development

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- The `.env.test.anthropic` and `.env.test.example` files contain placeholders - replace with your actual keys
- All environment files with real API keys are gitignored for security
- Consider using different API keys for testing vs production
