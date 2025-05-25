import { AINavigator } from '../app/services/aiNavigator';
import { LLMClient } from '../app/services/llmClient';
import { createFileLogger } from '../app/utils/fileLogger';
import OpenAI from 'openai';
import { getLatestTree, CollectedTree } from './fixtures/load-collected-trees';

// Test configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:32b';

// Create a mock page that returns collected accessibility tree data
function createMockPage(collectedNodes: any[], url: string = 'https://www.linkedin.com/jobs/') {
  const eventListeners: { [event: string]: Function[] } = {};
  
  const mockCDP = {
    send: async (method: string, params?: any) => {
      switch (method) {
        case 'DOM.enable':
        case 'Accessibility.enable':
        case 'Runtime.enable':
        case 'Network.enable':
          return {};
        case 'DOM.getDocument':
          // Return a simple DOM structure for XPath mapping
          return {
            root: {
              nodeId: 1,
              nodeName: 'HTML',
              children: [
                { nodeId: 2, nodeName: 'BODY', children: [] }
              ]
            }
          };
        case 'Accessibility.getFullAXTree':
          // Return the collected accessibility tree nodes
          return { nodes: collectedNodes };
        case 'DOM.resolveNode':
          // Mock DOM node resolution
          return {
            object: {
              objectId: `mock-object-${params?.backendNodeId}`
            }
          };
        case 'Runtime.callFunctionOn':
          // Mock element inspection
          return {
            result: {
              value: {
                tagName: 'INPUT',
                attributes: { class: 'mock-input', placeholder: 'Search' },
                xpath: '//input[@placeholder="Search"]',
                selector: 'input.mock-input'
              }
            }
          };
        default:
          return {};
      }
    },
    on: (event: string, listener: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(listener);
    },
    off: (event: string, listener: Function) => {
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(listener);
        if (index > -1) {
          eventListeners[event].splice(index, 1);
        }
      }
    },
    detach: async () => {}
  };

  return {
    url: () => url,
    context: () => ({
      newCDPSession: () => Promise.resolve(mockCDP)
    }),
    waitForTimeout: async (ms: number) => {},
    click: async (selector: string) => {},
    type: async (selector: string, text: string) => {},
    keyboard: {
      press: async (key: string) => {}
    }
  };
}

// Test cases based on real LinkedIn navigation patterns
interface TestCase {
  name: string;
  instruction: string;
  expectedToFind: boolean;
  minElements?: number;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Find job search input',
    instruction: 'Find the job title search input',
    expectedToFind: true,
    minElements: 1,
    description: 'Should find the job title search combobox using real AI Navigator',
  },
];

// Create AI Navigator instance for testing
function createTestNavigator(collectedNodes: any[], logger: any): AINavigator {
  const openaiClient = new OpenAI({
    baseURL: `${OLLAMA_URL}/v1`,
    apiKey: 'ollama',
  });

  const llmClient = new LLMClient({
    modelName: MODEL,
    client: openaiClient,
    logger: (message: string, data?: any) => {
      logger.debug(message, data);
      console.log(`   [DEBUG] ${message}`, data ? JSON.stringify(data) : '');
    },
  });

  const mockPage = createMockPage(collectedNodes);

  return new AINavigator({
    page: mockPage as any,
    llmClient,
    logger,
    debugMode: true,
  });
}

// Run tests
async function runTests() {
  console.log('🧪 Running realistic LinkedIn navigation tests with AI Navigator...\n');
  
  // Load the latest collected tree
  const collectedNodes = getLatestTree();
  if (!collectedNodes || collectedNodes.length === 0) {
    console.error('❌ No collected accessibility trees found!');
    console.log('   Run the agent with --fixtures flag to generate test data:');
    console.log('   pnpm dev:fixtures');
    return;
  }
  
  console.log(`✅ Using collected accessibility tree with ${collectedNodes.length} nodes from real LinkedIn page\n`);
  console.log('🔧 Testing actual AI Navigator production code path\n');

  const logger = createFileLogger('src/tests/logs/ollama-realistic-test');
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Instruction: "${testCase.instruction}"`);
    console.log(`   Expected to find elements: ${testCase.expectedToFind}`);

    logger.info(`Running test: ${testCase.name}`, {
      instruction: testCase.instruction,
      expectedToFind: testCase.expectedToFind,
    });

    try {
      // Create AI Navigator with collected nodes
      const navigator = createTestNavigator(collectedNodes, logger);

      // Use the actual findElements method from AI Navigator
      const foundElements = await navigator.findElements(testCase.instruction);

      const success = testCase.expectedToFind 
        ? foundElements.length >= (testCase.minElements || 1)
        : foundElements.length === 0;

      if (success) {
        console.log(`   ✅ PASSED`);
        console.log(`   Found ${foundElements.length} elements`);
        
        if (foundElements.length > 0) {
          console.log(`   Elements found by AI Navigator:`);
          foundElements.forEach((element, index) => {
            console.log(`     ${index + 1}. Selector: ${element.selector}`);
            console.log(`        XPath: ${element.xpath}`);
            console.log(`        Description: ${element.description}`);
            console.log(`        Confidence: ${element.confidence}`);
          });
        }
        
        logger.info(`Test passed: ${testCase.name}`, { 
          foundCount: foundElements.length,
          elements: foundElements.map(e => ({ selector: e.selector, description: e.description }))
        });
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Expected to find elements: ${testCase.expectedToFind}`);
        console.log(`   Actually found: ${foundElements.length} elements`);
        
        if (foundElements.length > 0) {
          console.log(`   Unexpected elements found:`);
          foundElements.forEach((element, index) => {
            console.log(`     ${index + 1}. ${element.description} (${element.selector})`);
          });
        }
        
        logger.error(`Test failed: ${testCase.name}`, {
          expectedToFind: testCase.expectedToFind,
          actuallyFound: foundElements.length,
          elements: foundElements
        });
        failed++;
      }

      // Clean up navigator
      await navigator.cleanup();

    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      logger.error(`Test error: ${testCase.name}`, { error: String(error) });
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    `📊 Test Results: ${passed}/${testCases.length} passed (${Math.round((passed / testCases.length) * 100)}%)`
  );
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log(
      '\n⚠️  Some tests failed. This indicates issues with the actual AI Navigator production code.'
    );
    console.log('Check the logs for detailed debugging information.');
  } else {
    console.log('\n🎉 All tests passed! AI Navigator is working correctly with real LinkedIn data.');
  }
}

// Run the tests
runTests().catch(console.error);
