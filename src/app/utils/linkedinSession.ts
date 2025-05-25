/**
 * LinkedIn session management utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { Cookie } from 'playwright';

const SESSION_DIR = path.join(process.cwd(), '.linkedin-session');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

export interface LinkedInSession {
  cookies: Cookie[];
  localStorage: Record<string, string>;
  userAgent?: string;
  savedAt: string;
}

/**
 * Load saved LinkedIn session
 */
export async function loadLinkedInSession(): Promise<LinkedInSession | null> {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf-8');
    return JSON.parse(data) as LinkedInSession;
  } catch (error) {
    return null;
  }
}

/**
 * Check if LinkedIn session exists
 */
export async function hasLinkedInSession(): Promise<boolean> {
  try {
    await fs.access(SESSION_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get session age in hours
 */
export async function getSessionAge(): Promise<number | null> {
  const session = await loadLinkedInSession();
  if (!session) return null;

  const savedAt = new Date(session.savedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

  return hoursDiff;
}

/**
 * Apply session to browser context
 */
export async function applyLinkedInSession(context: any, session: LinkedInSession) {
  // Add cookies
  await context.addCookies(session.cookies);

  // We can't directly set localStorage before navigation,
  // but we can inject it after page load
  return {
    async injectLocalStorage(page: any) {
      await page.evaluate((items: Record<string, string>) => {
        Object.entries(items).forEach(([key, value]) => {
          window.localStorage.setItem(key, value);
        });
      }, session.localStorage);
    },
  };
}
