/**
 * Lightweight AI-powered browser navigation with full accessibility tree
 * Implements Stagehand's sophisticated DOM processing for reliability
 */

import { Page, CDPSession } from 'playwright';
import { LLMClient } from './llmClient';
import { createFileLogger } from '@/app/utils/fileLogger';
import { createElementFindingPrompt, ELEMENT_FINDING_SYSTEM_PROMPT } from './prompts/elementFindingPrompt';

export interface AINavigatorOptions {
  page: Page;
  llmClient: LLMClient;
  logger?: ReturnType<typeof createFileLogger>;
  debugMode?: boolean;
}

interface AccessibilityNode {
  nodeId: string;
  backendNodeId: number;
  role?: string;
  name?: string;
  value?: string;
  description?: string;
  children?: AccessibilityNode[];
  properties?: Array<{ name: string; value: any }>;
  xpath?: string;
}

interface ElementMapping {
  backendNodeId: number;
  xpath: string;
  selector: string;
  attributes: Record<string, string>;
}

interface SingleAction {
  action: 'click' | 'type' | 'select' | 'press' | 'clear';
  target?: string;
  value?: string;
  key?: string;
}

interface ActionPlan {
  actions: SingleAction[];
}

interface FoundElement {
  selector: string;
  xpath: string;
  confidence: number;
  description: string;
}

interface LLMFoundElement {
  nodeId: number | string;  // Can be either number or string
  description: string;
  confidence: number;
}

interface FindElementsResponse {
  elements: LLMFoundElement[];
}

export class AINavigator {
  private page: Page;
  private llm: LLMClient;
  private logger?: ReturnType<typeof createFileLogger>;
  private cdp?: CDPSession;
  private debugMode: boolean;
  private elementMappings: Map<number, ElementMapping> = new Map();
  private nodeIdToBackendId: Map<number, number> = new Map();
  private fixtureMode: boolean = process.env.FIXTURE_MODE === '1' || process.argv.includes('--fixtures');
  private collectedTrees: any[] = [];

  get pageInstance(): Page {
    return this.page;
  }
  
  /**
   * Save collected accessibility trees as test fixtures
   */
  async saveFixtures(): Promise<void> {
    if (!this.fixtureMode || this.collectedTrees.length === 0) {
      return;
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    
    const fixtureDir = path.join(process.cwd(), 'src/tests/fixtures');
    const fixtureFile = path.join(fixtureDir, 'collected-accessibility-trees.json');
    
    try {
      await fs.mkdir(fixtureDir, { recursive: true });
      await fs.writeFile(
        fixtureFile,
        JSON.stringify(this.collectedTrees, null, 2),
        'utf-8'
      );
      
      if (this.logger) {
        this.logger.info(`Saved ${this.collectedTrees.length} accessibility trees to ${fixtureFile}`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error('Failed to save fixtures', { error });
      }
    }
  }

  constructor(options: AINavigatorOptions) {
    this.page = options.page;
    this.llm = options.llmClient;
    this.logger = options.logger;
    this.debugMode = options.debugMode || false;
    
    if (this.fixtureMode && this.logger) {
      this.logger.info('AI Navigator running in fixture mode - will save accessibility trees');
    }
  }

  /**
   * Initialize CDP session and enable required domains
   */
  private async initCDP(): Promise<CDPSession> {
    if (!this.cdp) {
      this.cdp = await this.page.context().newCDPSession(this.page);
      await this.cdp.send('DOM.enable');
      await this.cdp.send('Accessibility.enable');
      await this.cdp.send('Runtime.enable');
    }
    return this.cdp;
  }

  /**
   * Wait for DOM to settle using network monitoring
   */
  private async waitForDOMSettle(timeout: number = 3000): Promise<void> {
    const cdp = await this.initCDP();

    return new Promise((resolve) => {
      let settleTimer: NodeJS.Timeout;
      let requestCount = 0;
      let responseCount = 0;

      const checkSettle = () => {
        if (requestCount === responseCount) {
          clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            cdp.off('Network.requestWillBeSent', onRequest);
            cdp.off('Network.responseReceived', onResponse);
            cdp.off('Network.loadingFailed', onResponse);
            resolve();
          }, 500); // 500ms of network quiet
        }
      };

      const onRequest = () => {
        requestCount++;
        clearTimeout(settleTimer);
      };

      const onResponse = () => {
        responseCount++;
        checkSettle();
      };

      // Enable network tracking
      cdp.send('Network.enable');
      cdp.on('Network.requestWillBeSent', onRequest);
      cdp.on('Network.responseReceived', onResponse);
      cdp.on('Network.loadingFailed', onResponse);

      // Fallback timeout
      setTimeout(() => {
        cdp.off('Network.requestWillBeSent', onRequest);
        cdp.off('Network.responseReceived', onResponse);
        cdp.off('Network.loadingFailed', onResponse);
        resolve();
      }, timeout);

      // Initial check in case network is already quiet
      checkSettle();
    });
  }

  /**
   * Get full accessibility tree with backend node mapping
   */
  private async getFullAccessibilityTree(): Promise<{
    tree: string;
    mappings: Map<number, ElementMapping>;
  }> {
    const cdp = await this.initCDP();

    try {
      // Enable DOM domain first to build xpath mappings
      await cdp.send('DOM.enable');

      // Get the full DOM tree
      const { root } = await cdp.send('DOM.getDocument', {
        depth: -1,
        pierce: true,
      });

      // Build xpath mappings for ALL nodes first
      const xpathMap: Record<number, string> = {};
      this.buildXPathMap(root, '', xpathMap);

      // Get the accessibility tree
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');

      // Build comprehensive element mappings using our sophisticated method
      await this.buildElementMappings(nodes);

      // Format tree for LLM
      const treeString = this.formatAccessibilityTree(nodes);

      // Only log tree stats in debug mode
      if (this.debugMode && this.logger) {
        this.logger.debug('Accessibility tree processed', {
          nodeCount: nodes.length,
          mappedCount: this.elementMappings.size,
          nodeIdToBackendIdSize: this.nodeIdToBackendId.size,
          treeLength: treeString.length,
          estimatedTokens: Math.ceil(treeString.length / 4), // Rough token estimate
        });

        // Log a small sample of the tree that the LLM will see
        const treeLines = treeString.split('\n');
        const searchLines = treeLines.filter(
          (line) => line.toLowerCase().includes('search') || line.toLowerCase().includes('combobox')
        );
        this.logger.debug('Tree lines containing search/combobox', {
          searchLines: searchLines.slice(0, 5),
        });
      }

      await cdp.send('DOM.disable');

      return { tree: treeString, mappings: this.elementMappings };
    } catch (error) {
      if (this.logger) {
        this.logger.error('Failed to get accessibility tree', { error });
      }
      throw error;
    }
  }

  /**
   * Build XPath map for all DOM nodes recursively
   */
  private buildXPathMap(node: any, path: string, xpathMap: Record<number, string>): void {
    if (node.backendNodeId) {
      xpathMap[node.backendNodeId] = path || '/';
    }

    if (!node.children || node.children.length === 0) return;

    const counters: Record<string, number> = {};

    for (const child of node.children) {
      const name = String(child.nodeName).toLowerCase();
      const counterKey = `${child.nodeType}:${name}`;
      const idx = (counters[counterKey] = (counters[counterKey] ?? 0) + 1);

      const segment =
        child.nodeType === 3
          ? `text()[${idx}]`
          : child.nodeType === 8
            ? `comment()[${idx}]`
            : `${name}[${idx}]`;

      this.buildXPathMap(child, `${path}/${segment}`, xpathMap);
    }
  }

  /**
   * Build mappings from backend node IDs to selectors and XPaths
   */
  private async buildElementMappings(nodes: any[]): Promise<void> {
    const cdp = await this.initCDP();

    for (const node of nodes) {
      if (node.backendDOMNodeId) {
        try {
          // Get DOM node details
          const { object } = await cdp.send('DOM.resolveNode', {
            backendNodeId: node.backendDOMNodeId,
          });

          if (object.objectId) {
            // Get element attributes and generate selectors
            const attributes = await cdp.send('Runtime.callFunctionOn', {
              objectId: object.objectId,
              functionDeclaration: `
                function() {
                  if (!this || this.nodeType !== 1) return null;
                  
                  const attrs = {};
                  for (let attr of this.attributes) {
                    attrs[attr.name] = attr.value;
                  }
                  
                  // Generate selectors
                  let xpath = '';
                  let selector = '';
                  
                  // Generate XPath
                  let path = '';
                  let element = this;
                  while (element && element.nodeType === 1) {
                    let index = 0;
                    let sibling = element.previousElementSibling;
                    while (sibling) {
                      if (sibling.tagName === element.tagName) index++;
                      sibling = sibling.previousElementSibling;
                    }
                    const tagName = element.tagName.toLowerCase();
                    const position = index > 0 ? '[' + (index + 1) + ']' : '';
                    path = '/' + tagName + position + path;
                    element = element.parentElement;
                  }
                  xpath = path;
                  
                  // Generate CSS selector
                  if (this.id) {
                    selector = '#' + this.id;
                  } else if (attrs['aria-label']) {
                    selector = '[aria-label="' + attrs['aria-label'] + '"]';
                  } else if (attrs.name) {
                    selector = '[name="' + attrs.name + '"]';
                  } else if (attrs.placeholder) {
                    selector = '[placeholder="' + attrs.placeholder + '"]';
                  } else {
                    selector = xpath; // Fallback to xpath
                  }
                  
                  return {
                    tagName: this.tagName.toLowerCase(),
                    attributes: attrs,
                    xpath: xpath,
                    selector: selector,
                    text: this.textContent ? this.textContent.trim().substring(0, 100) : '',
                    visible: this.offsetParent !== null
                  };
                }
              `,
              returnByValue: true,
            });

            if (attributes.result?.value) {
              const info = attributes.result.value;
              this.elementMappings.set(node.backendDOMNodeId, {
                backendNodeId: node.backendDOMNodeId,
                xpath: info.xpath,
                selector: info.selector,
                attributes: info.attributes,
              });
            }

            // Release the object
            await cdp.send('Runtime.releaseObject', { objectId: object.objectId });
          }
        } catch (error) {
          // Skip nodes that can't be resolved
          if (this.debugMode && this.logger) {
            this.logger.debug('Could not resolve node', {
              backendNodeId: node.backendDOMNodeId,
              error: error,
            });
          }
        }
      }
    }
  }

  /**
   * Filter accessibility tree nodes to remove noise while preserving semantic meaning
   */
  private filterMeaningfulNodes(nodes: any[]): any[] {
    const NOISE_ROLES = new Set([
      'generic',
      'presentation', 
      'none',
      'InlineTextBox',
      'LineBreak',
      'StaticText', // Often auto-generated, let the LLM decide what text is important
    ]);

    const ALWAYS_INCLUDE_ROLES = new Set([
      // Interactive elements
      'button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'searchbox', 
      'menuitem', 'tab', 'option', 'slider', 'spinbutton',
      
      // Structural/semantic elements
      'heading', 'article', 'section', 'main', 'navigation', 'banner', 'contentinfo',
      'list', 'listitem', 'table', 'row', 'cell', 'columnheader', 'rowheader',
      'form', 'group', 'region', 'landmark',
      
      // Content elements that provide context
      'text', 'paragraph', 'document', 'application',
      
      // Root elements
      'RootWebArea', 'WebArea'
    ]);

    // Create a map for fast node lookup
    const nodeMap = new Map();
    for (const node of nodes) {
      nodeMap.set(node.nodeId, node);
    }

    // Check if a node should be included
    const shouldInclude = (node: any): boolean => {
      const role = node.role?.value;
      
      // Always exclude noise
      if (NOISE_ROLES.has(role)) {
        return false;
      }
      
      // Always include semantic roles
      if (ALWAYS_INCLUDE_ROLES.has(role)) {
        return true;
      }
      
      // Include if it has meaningful properties (focusable, clickable, etc.)
      if (node.properties?.some((prop: any) => 
        ['focusable', 'clickable', 'editable'].includes(prop.name) && prop.value?.value)) {
        return true;
      }
      
      // Include if it has meaningful text content
      const name = node.name?.value?.trim();
      const value = node.value?.value?.trim();
      if ((name && name.length > 2) || (value && value.length > 2)) {
        return true;
      }
      
      // Include if it has children that might be meaningful (container logic)
      if (node.childIds && node.childIds.length > 0) {
        return true; // Let the recursive filtering handle children
      }
      
      return false;
    };

    // Filter nodes
    const filtered = nodes.filter(shouldInclude);
    
    // Rebuild parent-child relationships for filtered nodes
    const rebuildRelationships = (node: any): any => {
      const filteredChildren = [];
      
      if (node.childIds) {
        for (const childId of node.childIds) {
          const childNode = nodeMap.get(childId);
          if (childNode && filtered.includes(childNode)) {
            filteredChildren.push(rebuildRelationships(childNode));
          }
        }
      }
      
      return {
        ...node,
        children: filteredChildren
      };
    };

    // Find root nodes and rebuild tree
    const rootNodes = filtered.filter(node => 
      !filtered.some(potential => 
        potential.childIds?.includes(node.nodeId)
      )
    );

    return rootNodes.map(rebuildRelationships);
  }

  /**
   * Format accessibility tree for LLM consumption
   */
  private formatAccessibilityTree(nodes: any[]): string {
    // Clear previous mapping
    this.nodeIdToBackendId.clear();
    

    // First pass: Build ALL mappings
    const buildMappings = (node: any): void => {
      const nodeId = node.nodeId;
      
      // Create mapping from nodeId to backendDOMNodeId
      if (node.backendDOMNodeId) {
        this.nodeIdToBackendId.set(nodeId, node.backendDOMNodeId);
      }

      // Process children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          buildMappings(child);
        }
      }
    };

    // Build mappings for ALL nodes first
    for (const node of nodes) {
      buildMappings(node);
    }

    // Second pass: Format the tree
    const formatNode = (node: any, depth: number = 0): string => {
      const nodeId = node.nodeId;

      // Debug logging for combobox elements
      if (node.role?.value === 'combobox' && this.debugMode && this.logger) {
        this.logger.debug('Found combobox in tree', {
          nodeId: nodeId,
          backendDOMNodeId: node.backendDOMNodeId,
          name: node.name?.value,
          hasMapping: this.elementMappings.has(node.backendDOMNodeId || -1),
        });
      }

      const indent = '  '.repeat(depth);
      const role = node.role?.value || 'generic';
      const name = node.name?.value || '';
      const value = node.value?.value || '';

      // Clean up text content
      const cleanName = name.replace(/\s+/g, ' ').trim();
      const cleanValue = value.replace(/\s+/g, ' ').trim();
      const displayText = cleanValue || cleanName;

      let nodeString = `${indent}[${nodeId}] ${role}`;
      if (displayText) {
        nodeString += `: ${displayText}`;
      }

      // Add important properties
      if (node.properties) {
        const importantProps = node.properties.filter((prop: any) =>
          ['required', 'disabled', 'checked', 'selected', 'expanded'].includes(prop.name)
        );
        if (importantProps.length > 0) {
          const props = importantProps.map((p: any) => `${p.name}=${p.value.value}`).join(' ');
          nodeString += ` (${props})`;
        }
      }

      let result = nodeString;

      // Process children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const childString = formatNode(child, depth + 1);
          if (childString.trim()) {
            result += '\n' + childString;
          }
        }
      }

      return result;
    };

    // Filter to only include meaningful nodes using comprehensive structural filtering
    const meaningfulNodes = this.filterMeaningfulNodes(nodes);
    
    // In fixture mode, save the FILTERED tree
    if (this.fixtureMode && meaningfulNodes.length > 0) {
      const url = this.page.url();
      const title = nodes[0]?.name?.value || nodes[0]?.name || 'Unknown Page';
      this.collectedTrees.push({
        url,
        title,
        timestamp: new Date().toISOString(),
        nodes: JSON.parse(JSON.stringify(meaningfulNodes)), // Save filtered nodes
        originalNodeCount: nodes.length,
        filteredNodeCount: meaningfulNodes.length
      });
      
      if (this.logger) {
        this.logger.debug('Collected filtered accessibility tree for fixtures', { 
          url, 
          title, 
          originalNodeCount: nodes.length,
          filteredNodeCount: meaningfulNodes.length,
          reductionRatio: `${Math.round((1 - meaningfulNodes.length / nodes.length) * 100)}%`
        });
      }
    }

    // Find root nodes (those without parents in our filtered set)
    const rootNodes = meaningfulNodes.filter(
      (node) =>
        !meaningfulNodes.some((potential) =>
          potential.children?.some((child: any) => child.nodeId === node.nodeId)
        )
    );

    return rootNodes.map((node) => formatNode(node)).join('\n');
  }

  /**
   * Find elements using the accessibility tree
   */
  async findElements(instruction: string): Promise<FoundElement[]> {
    await this.waitForDOMSettle();
    const { tree, mappings } = await this.getFullAccessibilityTree();

    // Use shared prompt for consistency
    const prompt = createElementFindingPrompt(instruction, tree);

    try {
      const response = await this.llm.createCompletion<FindElementsResponse>({
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
      const elements = result.elements || [];

      if (this.logger) {
        this.logger.debug('LLM element finding response', {
          instruction,
          responseElements: elements,
          elementCount: elements.length,
        });
      }

      // Map nodeIds from LLM to actual selectors using our mappings
      const foundElements: FoundElement[] = [];

      for (const element of elements) {
        // Get the backend node ID from our sequential nodeId
        // Convert nodeId to number if it's a string
        const nodeIdNum = typeof element.nodeId === 'string' ? parseInt(element.nodeId, 10) : element.nodeId;
        const backendNodeId = this.nodeIdToBackendId.get(nodeIdNum);

        if (backendNodeId) {
          // Find the element mapping for this backend node ID
          const mapping = mappings.get(backendNodeId);

          if (mapping) {
            // Only log mapping in debug mode if selector looks suspicious
            if (this.logger && this.debugMode && mapping.selector.includes('footer')) {
              this.logger.warn('Suspicious element mapping to footer', {
                nodeId: element.nodeId,
                selector: mapping.selector,
                description: element.description,
              });
            }

            // Use xpath with the xpath= prefix for Playwright
            const playwrightSelector = `xpath=${mapping.xpath}`;

            foundElements.push({
              selector: playwrightSelector,
              xpath: mapping.xpath,
              description: element.description || '',
              confidence: element.confidence || 0.7,
            });
          } else {
            // Fallback: try to create a selector based on accessibility info
            if (this.logger) {
              this.logger.debug('No mapping found for backend node', {
                nodeId: element.nodeId,
                backendNodeId,
              });
            }
          }
        } else {
          if (this.logger) {
            this.logger.warn('No backend node ID for nodeId', {
              nodeId: element.nodeId,
              availableNodeIds: Array.from(this.nodeIdToBackendId.keys()).slice(0, 10),
              mappingSize: this.nodeIdToBackendId.size,
            });
          }
        }
      }

      if (this.logger) {
        this.logger.debug('Found elements via accessibility tree', {
          instruction,
          found: foundElements.length,
        });
      }

      return foundElements;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Element finding failed', { error });
      }
      return [];
    }
  }

  /**
   * Perform an action using accessibility tree understanding
   */
  async act(instruction: string): Promise<boolean> {
    if (this.logger) {
      this.logger.info('Performing action', { instruction });
    }

    try {
      // Parse the instruction into action(s)
      const actionPrompt = `Parse this instruction into a sequence of actions: "${instruction}"

Examples:
- "Click on search box and type 'hello'" -> 2 actions: click, then type
- "Type 'software engineer'" -> 1 action: type
- "Press Enter" -> 1 action: press

Return JSON:
{
  "actions": [
    {
      "action": "click" | "type" | "select" | "press" | "clear",
      "target": "description of what to find (optional for type/press)",
      "value": "text to type (if action is type)",
      "key": "key to press (if action is press)"
    }
  ]
}`;

      const actionResponse = await this.llm.createCompletion<ActionPlan>({
        messages: [
          { role: 'system', content: 'Parse user instructions into structured action sequences.' },
          { role: 'user', content: actionPrompt },
        ],
        temperature: 0.1,
        responseFormat: 'json',
      });

      const actionPlan = actionResponse.data;

      if (this.logger) {
        this.logger.debug('Parsed action plan', {
          actions: actionPlan.actions,
          count: actionPlan.actions.length,
        });
      }

      // Execute each action in sequence
      for (const action of actionPlan.actions) {
        // Find the target element if needed
        if (action.target) {
          const elements = await this.findElements(action.target);
          if (elements.length === 0) {
            throw new Error(`Could not find element: ${action.target}`);
          }

          // Use the highest confidence element
          const targetElement = elements.sort((a, b) => b.confidence - a.confidence)[0];

          if (this.logger) {
            this.logger.info('Executing action', {
              action: action.action,
              targetDescription: targetElement.description,
              targetSelector: targetElement.selector,
              value: action.value,
            });
          }

          // Perform the action
          switch (action.action) {
            case 'click':
              await this.page.click(targetElement.selector, { timeout: 10000 });
              break;
            case 'type':
              await this.page.click(targetElement.selector);
              // Clear the field first, then type
              await this.page.fill(targetElement.selector, '');
              await this.page.type(targetElement.selector, action.value || '');
              break;
            case 'clear':
              await this.page.fill(targetElement.selector, '');
              break;
            case 'select':
              await this.page.selectOption(targetElement.selector, action.value || '');
              break;
            case 'press':
              if (action.key) {
                await this.page.press(targetElement.selector, action.key);
              }
              break;
          }

          if (this.logger) {
            this.logger.info('Action completed successfully', {
              action: action.action,
              target: targetElement.description,
              selector: targetElement.selector,
            });
          }
        } else if (action.action === 'press' && action.key) {
          // Global key press
          await this.page.keyboard.press(action.key);
          if (this.logger) {
            this.logger.info('Global key press completed', { key: action.key });
          }
        } else if (action.action === 'type' && action.value) {
          // Type without target (current focus)
          await this.page.keyboard.type(action.value);
          if (this.logger) {
            this.logger.info('Typed text at current focus', { value: action.value });
          }
        }

        // Small delay between actions to ensure they complete
        await this.page.waitForTimeout(500);
      }

      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Action failed', { instruction, error });
      }
    }

    return false;
  }

  /**
   * Extract structured data from the page
   */
  async extract<T = any>(
    instruction: string,
    options?: {
      schema?: Record<string, any>;
      area?: string; // Focus on specific area
    }
  ): Promise<T | null> {
    await this.waitForDOMSettle();

    let content: string;
    if (options?.area) {
      // Focus on specific area of the page
      const elements = await this.findElements(options.area);
      if (elements.length > 0) {
        content = (await this.page.locator(elements[0].selector).textContent()) || '';
      } else {
        content = (await this.page.textContent('body')) || '';
      }
    } else {
      // Use full accessibility tree for context
      const { tree } = await this.getFullAccessibilityTree();
      content = tree;
    }

    const schemaPrompt = options?.schema
      ? `\n\nStructure the data exactly like this:\n${JSON.stringify(options.schema, null, 2)}`
      : '\n\nReturn the data as structured JSON.';

    const prompt = `Extract: ${instruction}

From this content:
${content.substring(0, 15000)}${schemaPrompt}

Rules:
- Extract ALL instances that match the request (not just the first one)
- Look for patterns like job cards, listings, or repeated structures
- Preserve exact text from the source
- Return null for missing data
- For links, include full URLs if available
- IMPORTANT: If looking for jobs, extract EVERY job you can find in the content`;

    try {
      const response = await this.llm.createCompletion({
        messages: [
          {
            role: 'system',
            content: 'Extract structured data from web content. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        responseFormat: 'json',
      });

      const result = response.data;

      if (this.logger) {
        this.logger.debug('Extraction completed', { instruction });
      }

      return result as T;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Extraction failed', { error });
      }
      return null;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Save fixtures before cleanup if in fixture mode
    if (this.fixtureMode) {
      await this.saveFixtures();
    }
    
    if (this.cdp) {
      try {
        await this.cdp.detach();
      } catch {
        // Ignore cleanup errors
      }
      this.cdp = undefined;
    }
    this.elementMappings.clear();
  }
}
