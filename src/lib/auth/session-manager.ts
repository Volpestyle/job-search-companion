/**
 * Generic session manager that handles authentication for any website
 * Automatically detects login pages and saves/restores cookies
 */

import { BrowserContext, Cookie } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { LogLevel } from '@/app/utils/logger';

export interface SessionConfig {
  sessionDir?: string;
  logger?: any;
}

export class SessionManager {
  private sessionDir: string;
  private logger?: any;
  private context: BrowserContext;

  constructor(context: BrowserContext, config: SessionConfig = {}) {
    this.context = context;
    this.sessionDir = config.sessionDir || '.sessions';
    this.logger = config.logger;
  }

  /**
   * Get a sanitized filename for a domain
   */
  private getDomainKey(url: string): string {
    try {
      const domain = new URL(url).hostname;
      // Remove www. prefix and sanitize for filesystem
      return domain.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '_');
    } catch {
      // Fallback to hash if URL parsing fails
      return crypto.createHash('md5').update(url).digest('hex');
    }
  }

  /**
   * Load cookies for a specific domain
   */
  async loadSession(url: string): Promise<boolean> {
    const domainKey = this.getDomainKey(url);
    const sessionPath = path.join(this.sessionDir, `${domainKey}.json`);

    try {
      const sessionData = await fs.readFile(sessionPath, 'utf-8');
      const { cookies, savedAt } = JSON.parse(sessionData);

      // Check if session is reasonably fresh (30 days)
      const ageInDays = (Date.now() - new Date(savedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 30) {
        this.log(LogLevel.WARN, `Session for ${domainKey} is ${Math.round(ageInDays)} days old`);
      }

      await this.context.addCookies(cookies);
      this.log(LogLevel.INFO, `Loaded ${cookies.length} cookies for ${domainKey}`);
      return true;
    } catch (error) {
      this.log(LogLevel.DEBUG, `No saved session found for ${domainKey}`);
      return false;
    }
  }

  /**
   * Save cookies for a specific domain
   */
  async saveSession(url: string): Promise<void> {
    const domainKey = this.getDomainKey(url);
    const cookies = await this.context.cookies();

    // Filter cookies relevant to this domain
    const domain = new URL(url).hostname;
    const relevantCookies = cookies.filter(
      (cookie) =>
        cookie.domain.includes(domain.replace(/^www\./, '')) ||
        cookie.domain === `.${domain}` ||
        cookie.domain === domain
    );

    if (relevantCookies.length === 0) {
      this.log(LogLevel.WARN, `No cookies to save for ${domainKey}`);
      return;
    }

    // Ensure session directory exists
    await fs.mkdir(this.sessionDir, { recursive: true });

    // Save session data
    const sessionPath = path.join(this.sessionDir, `${domainKey}.json`);
    const sessionData = {
      domain: domainKey,
      cookies: relevantCookies,
      savedAt: new Date().toISOString(),
    };

    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
    this.log(LogLevel.INFO, `Saved ${relevantCookies.length} cookies for ${domainKey}`);
  }

  /**
   * Get all saved sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      await fs.access(this.sessionDir);
      const files = await fs.readdir(this.sessionDir);
      return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * Clear a specific session
   */
  async clearSession(url: string): Promise<void> {
    const domainKey = this.getDomainKey(url);
    const sessionPath = path.join(this.sessionDir, `${domainKey}.json`);

    try {
      await fs.unlink(sessionPath);
      this.log(LogLevel.INFO, `Cleared session for ${domainKey}`);
    } catch (error) {
      this.log(LogLevel.DEBUG, `No session to clear for ${domainKey}`);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console.log(`[SessionManager:${level}] ${message}`, data || '');
    }
  }
}
