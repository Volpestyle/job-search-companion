/**
 * Test Setup
 *
 * This file loads environment variables and performs global test setup
 */

// Load test environment variables
import { config } from 'dotenv';
import path from 'path';

async function globalSetup() {
  // Load .env.test file for test environment
  config({ path: path.join(process.cwd(), '.env.test') });

  // Log environment variables for debugging
  console.log('🔧 Test Environment Variables Loaded:');
  console.log('  LLM_PROVIDER:', process.env.LLM_PROVIDER);
  console.log('  OLLAMA_HOST:', process.env.OLLAMA_HOST);
  console.log('  OLLAMA_PORT:', process.env.OLLAMA_PORT);
  console.log('  OLLAMA_MODEL:', process.env.OLLAMA_MODEL);
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '***SET***' : 'NOT_SET');
  console.log('  ANTHROPIC_MODEL:', process.env.ANTHROPIC_MODEL);
  console.log('  STAGEHAND_ENV:', process.env.STAGEHAND_ENV);
  console.log('  HEADLESS:', process.env.HEADLESS);
}

export default globalSetup;
