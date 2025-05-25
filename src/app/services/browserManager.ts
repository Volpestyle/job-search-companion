/**
 * Lightweight browser automation manager
 * Replaces Stagehand with direct Playwright usage + our AINavigator
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';

export interface BrowserConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
}

export class BrowserManager {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(private config: BrowserConfig = {}) {
    this.config = {
      headless: false,
      viewport: { width: 1280, height: 800 },
      timeout: 30000,
      ...config,
    };
  }

  async init(): Promise<void> {
    // Launch browser
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    // Create context
    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
    });

    // Set default timeout
    this.context.setDefaultTimeout(this.config.timeout!);

    // Create page
    this.page = await this.context.newPage();
  }

  async applyCookies(cookies: any[]): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }
    await this.context.addCookies(cookies);
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  get browserInstance(): Browser {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    return this.browser;
  }

  get contextInstance(): BrowserContext {
    if (!this.context) {
      throw new Error('Browser context not initialized');
    }
    return this.context;
  }

  get pageInstance(): Page {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return this.page;
  }
}