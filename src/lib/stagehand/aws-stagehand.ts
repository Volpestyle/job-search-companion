/**
 * AWS-enabled Stagehand wrapper
 *
 * Extends Stagehand to support AWS browser instances in addition to LOCAL mode
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { chromium } from '@playwright/test';
import { Page, BrowserContext } from '@browserbasehq/stagehand';

export type StagehandEnvironment = 'LOCAL' | 'AWS';

export interface AWSBrowserConfig {
  cdpEndpoint?: string; // WebSocket endpoint for Chrome DevTools Protocol
  region?: string;
  instanceId?: string;
  // Add other AWS-specific config as needed
}

export interface AWSStagehandOptions {
  env: StagehandEnvironment;
  awsConfig?: AWSBrowserConfig;
  modelName?: string;
  modelClientOptions?: any;
  llmClient?: any; // Add support for custom LLM client
  verbose?: boolean;
  domSettleTimeoutMs?: number;
  enableCaching?: boolean;
  headless?: boolean;
  localBrowserLaunchOptions?: any;
  logger?: (logLine: any) => void;
  logInferenceToFile?: boolean;
}

export class AWSStagehand {
  private stagehand: Stagehand | null = null;
  private _page: Page | null = null;
  private _context: BrowserContext | null = null;
  private options: AWSStagehandOptions;

  constructor(options: AWSStagehandOptions) {
    this.options = options;
  }

  async init(): Promise<void> {
    if (this.options.env === 'AWS') {
      // Handle AWS browser connection
      await this.initAWSBrowser();
    } else {
      // Use standard Stagehand for LOCAL
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        modelName: this.options.modelName,
        modelClientOptions: this.options.modelClientOptions,
        llmClient: this.options.llmClient, // Pass custom LLM client
        verbose: this.options.verbose ? 1 : 0,
        domSettleTimeoutMs: this.options.domSettleTimeoutMs,
        enableCaching: this.options.enableCaching,
        logger: this.options.logger,
        logInferenceToFile: this.options.logInferenceToFile,
        localBrowserLaunchOptions: {
          headless: this.options.headless,
          ...this.options.localBrowserLaunchOptions,
        },
      });

      await this.stagehand.init();
      this._page = this.stagehand.page;
      this._context = this.stagehand.context;
    }
  }

  private async initAWSBrowser(): Promise<void> {
    if (!this.options.awsConfig?.cdpEndpoint) {
      throw new Error('AWS CDP endpoint is required for AWS environment');
    }

    // Connect to AWS browser instance via CDP
    const browser = await chromium.connectOverCDP(this.options.awsConfig.cdpEndpoint);
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = context.pages()[0] || (await context.newPage());

    // Now create Stagehand with the connected browser
    // We'll use LOCAL env but provide the CDP URL
    this.stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: this.options.modelName,
      modelClientOptions: this.options.modelClientOptions,
      llmClient: this.options.llmClient, // Pass custom LLM client
      verbose: this.options.verbose ? 1 : 0,
      domSettleTimeoutMs: this.options.domSettleTimeoutMs,
      enableCaching: this.options.enableCaching,
      logger: this.options.logger,
      logInferenceToFile: this.options.logInferenceToFile,
      localBrowserLaunchOptions: {
        cdpUrl: this.options.awsConfig.cdpEndpoint,
      },
    });

    await this.stagehand.init();
    this._page = this.stagehand.page;
    this._context = this.stagehand.context;
  }

  get page(): Page {
    if (!this._page) {
      throw new Error('AWSStagehand not initialized. Call init() first.');
    }
    return this._page;
  }

  get context(): BrowserContext {
    if (!this._context) {
      throw new Error('AWSStagehand not initialized. Call init() first.');
    }
    return this._context;
  }

  async close(): Promise<void> {
    if (this.stagehand) {
      await this.stagehand.close();
    }
  }

  // Delegate other methods to the underlying Stagehand instance
  get metrics() {
    return this.stagehand?.metrics;
  }
}
