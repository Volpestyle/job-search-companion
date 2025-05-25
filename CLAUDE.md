# Job Search Companion - Claude Code Instructions

## Important Reminders

- **Always update PRODUCT_SPEC.md** when design changes or new features are added
- Use **AWS** for cloud browser automation (not Browserbase)
- Prioritize user privacy and local processing with Ollama

## Extending the Design Pattern

### Adding New Job Boards

1. Create new strategy in `src/app/api/stagehand/strategies/{board}-strategy.ts`
2. Extend the `BaseStrategy` abstract class
3. Implement required methods:
   - `search()` - Main orchestration
   - `navigateToJobs()` - Navigate to job search page
   - `fillSearchForm()` - Fill search parameters
   - `extractJobs()` - Extract job data with Ollama
4. Register in `strategies` object in `main.ts`
5. Add board config to `JOB_BOARDS` constant

### Key Patterns to Follow

- Use `createFileLogger(sessionId)` for all logging
- Call `logger.progress()` for real-time UI updates
- Validate with Zod schemas before processing
- Handle errors with user-friendly messages
- Take screenshots on errors for debugging

## Technical Guidelines

### Stagehand/Playwright

- **Prefer Stagehand methods over direct Playwright**
  - Use `stagehand.page.observe()` to find elements with AI
  - Use `stagehand.page.act()` for interactions, not `page.click()`
  - Use `page.extract()` for data extraction (page is from context)
  - **Important**: Stagehand methods are on the page object, not the stagehand instance
  - Look at `../stagehand` source code for implementation examples
- Check for authentication before operations
- Apply saved cookies with `context.addCookies()` (Playwright method is OK here)
- Close resources properly after use
- **Never arbitrarily increase timeouts** - fix the root cause instead
- Use appropriate `waitUntil` options ('domcontentloaded' for dynamic sites)

### Ollama Integration

- Run pre-flight checks before operations
- Log LLM requests/responses for debugging
- Use structured prompts with examples

### Progress Updates

- Use Server-Sent Events (SSE) for real-time updates
- Progress phases: initialization (0-40%), search (40-70%), extraction (70-100%)
- Update UI optimistically when possible

## Debugging

- **Always check `agent-logs/{sessionId}.log`** for detailed execution logs
- Verify progress updates are being logged
- Set `verbose: 2` in Stagehand config for more details
- **Common Issues:**
  - LLM misunderstanding prompts - be very specific
  - Check LLM responses in logs to see what it's returning
- **DOM Debugging:**
  - Log simplified DOM snapshots to understand page structure
  - Focus on interactive elements (input, button, combobox roles)
  - Check aria-labels and placeholders for element identification

## Testing Checklist

Before committing:

- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm lint`
- [ ] Test LinkedIn authentication flow
- [ ] Verify Ollama connectivity
- [ ] Check no sensitive data in logs
- [ ] Update PRODUCT_SPEC.md if design changed

## AWS Integration Notes

When implementing cloud automation:

- Use AWS EC2 instances with Playwright pre-installed
- Consider Lambda for lightweight operations
- Implement proper IAM roles and security groups
- Use S3 for temporary file storage if needed
- Monitor costs with CloudWatch

@./PRODUCT_SPEC.md
