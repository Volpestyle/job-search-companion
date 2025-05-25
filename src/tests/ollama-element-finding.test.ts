import { LLMClient } from '../app/services/llmClient';
import { createFileLogger } from '../app/utils/fileLogger';
import {
  createElementFindingPrompt,
  ELEMENT_FINDING_SYSTEM_PROMPT,
} from '../app/services/prompts/elementFindingPrompt';
import OpenAI from 'openai';

interface TestScenario {
  name: string;
  instruction: string;
  tree: string;
  expectedNodeIds: number[];
  description: string;
}

interface LLMFoundElement {
  nodeId: number | string;
  description: string;
  confidence: number;
}

interface FindElementsResponse {
  elements: LLMFoundElement[];
}

// Test scenarios covering common cases
const testScenarios: TestScenario[] = [
  {
    name: 'Find search combobox',
    instruction: 'combobox element that has "Search by title, skill, or company"',
    tree: `[2] RootWebArea: Jobs | LinkedIn
[260] region: Toast message
[410] banner: Global Navigation
[4] combobox: Search by title, skill, or company (required=false expanded=false)
[7] combobox: City, state, or zip code (required=false expanded=false)
[431] StaticText: Search by title, skill, or company
[464] StaticText: City, state, or zip code
[500] button: Search
[520] link: Advanced search`,
    expectedNodeIds: [4],
    description: 'Should find combobox, not StaticText with same content',
  },
  {
    name: 'Find search button',
    instruction: 'search button',
    tree: `[100] navigation: Search bar
[101] combobox: Search
[102] button: Submit search
[103] button: Search
[104] link: Search results
[105] StaticText: Search`,
    expectedNodeIds: [102, 103],
    description: 'Should find all buttons related to search',
  },
  {
    name: 'Find multiple buttons',
    instruction: 'button',
    tree: `[50] main: Content area
[51] button: Save
[52] button: Cancel
[53] link: Home
[54] StaticText: Click here
[55] button: Submit`,
    expectedNodeIds: [51, 52, 55],
    description: 'Should find all button elements',
  },
  {
    name: 'Find specific link',
    instruction: 'link that says "My jobs"',
    tree: `[700] navigation: Menu
[701] link: Home
[702] link: My Network
[703] link: Jobs
[704] link: My jobs
[705] link: Messaging
[706] StaticText: My jobs`,
    expectedNodeIds: [704],
    description: 'Should find specific link, not StaticText',
  },
  {
    name: 'Find text input',
    instruction: 'email input field',
    tree: `[200] form: Login form
[201] label: Email address
[202] textbox: Enter your email (required=true)
[203] label: Password
[204] textbox: Enter your password (required=true)
[205] button: Sign in`,
    expectedNodeIds: [202],
    description: 'Should identify email field by context',
  },
  {
    name: 'Ignore non-interactive elements',
    instruction: 'click on "Welcome"',
    tree: `[300] main: Dashboard
[301] heading: Welcome
[302] StaticText: Welcome
[303] button: Welcome page
[304] link: Welcome guide
[305] InlineTextBox: Welcome`,
    expectedNodeIds: [303, 304],
    description: 'Should ignore StaticText and InlineTextBox for click actions',
  },
  {
    name: 'Complex nested structure',
    instruction: 'search combobox or input field',
    tree: `[1] RootWebArea: Page
[2] banner: Header
  [3] navigation: Main nav
    [4] LabelText
    [5] combobox: Search by title, skill, or company (required=false expanded=false)
    [6] button: Search
  [7] region: Sidebar
    [8] textbox: Quick search
    [9] button: Go`,
    expectedNodeIds: [5, 8],
    description: 'Should find both combobox and textbox for search',
  },
  {
    name: 'Empty result',
    instruction: 'video player',
    tree: `[400] article: Blog post
[401] heading: How to use our product
[402] paragraph: Lorem ipsum
[403] image: Screenshot
[404] link: Read more`,
    expectedNodeIds: [],
    description: 'Should return empty array when no matches',
  },
];

async function runTests() {
  console.log('🧪 Starting Ollama Element Finding Tests\n');

  const logger = createFileLogger('src/tests/logs/ollama-test');
  
  // Initialize OpenAI client for Ollama
  const openaiClient = new OpenAI({
    baseURL: 'http://localhost:11434/v1',
    apiKey: 'ollama', // Ollama doesn't need a real API key
  });

  // Create LLMClient with proper structure
  const llmClient = new LLMClient({
    modelName: 'qwen2.5:32b',
    client: openaiClient,
    logger: (message: string, data?: any) => {
      logger.debug(message, data);
    }
  });

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log(`   Instruction: "${scenario.instruction}"`);
    console.log(`   Expected nodeIds: [${scenario.expectedNodeIds.join(', ')}]`);

    try {
      const prompt = createElementFindingPrompt(scenario.instruction, scenario.tree);

      const response = await llmClient.createCompletion<FindElementsResponse>({
        messages: [
          {
            role: 'system',
            content: ELEMENT_FINDING_SYSTEM_PROMPT,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        responseFormat: 'json',
      });

      const result = response.data;
      const foundNodeIds = result.elements.map((el) =>
        typeof el.nodeId === 'string' ? parseInt(el.nodeId, 10) : el.nodeId
      );

      // Check if found nodeIds match expected
      const isCorrect =
        foundNodeIds.length === scenario.expectedNodeIds.length &&
        foundNodeIds.every((id) => scenario.expectedNodeIds.includes(id)) &&
        scenario.expectedNodeIds.every((id) => foundNodeIds.includes(id));

      if (isCorrect) {
        console.log(`   ✅ PASSED`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Found nodeIds: [${foundNodeIds.join(', ')}]`);
        console.log(`   Returned elements:`, result.elements);
        failed++;
      }

      console.log(`   ${scenario.description}`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`   Total tests: ${testScenarios.length}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Success rate: ${((passed / testScenarios.length) * 100).toFixed(1)}%`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
