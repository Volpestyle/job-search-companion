#!/usr/bin/env tsx
/**
 * LinkedIn Authentication Setup
 *
 * This script helps users authenticate with LinkedIn by:
 * 1. Opening a browser window
 * 2. Navigating to LinkedIn
 * 3. Waiting for manual login
 * 4. Saving the authenticated session for reuse
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const SESSION_DIR = path.join(process.cwd(), '.linkedin-session');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

async function ensureSessionDir() {
  await fs.mkdir(SESSION_DIR, { recursive: true });
}

async function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  console.log('🔐 LinkedIn Authentication Setup');
  console.log('================================\n');

  try {
    await ensureSessionDir();

    // Launch browser in non-headless mode
    console.log('📱 Launching browser...');
    const browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized'],
    });

    const context = await browser.newContext({
      viewport: null, // Use full window size
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Navigate to LinkedIn
    console.log('🌐 Navigating to LinkedIn...\n');
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'networkidle',
    });

    console.log('📝 Please log in to LinkedIn in the browser window that just opened.');
    console.log('   - Enter your email and password');
    console.log('   - Complete any captcha or 2FA if required');
    console.log('   - Make sure you can see your LinkedIn home feed\n');

    await waitForEnter('Press ENTER after you have successfully logged in...');

    // Verify login by checking for specific elements
    console.log('\n✅ Verifying login status...');

    try {
      // Check if we're already on a logged-in page
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);

      // If we see /feed, /home, or /in/ in the URL, we're likely logged in
      const isOnLoggedInPage =
        currentUrl.includes('/feed') || currentUrl.includes('/home') || currentUrl.includes('/in/');

      if (!isOnLoggedInPage) {
        console.log('Navigating to feed to verify login...');
        await page.goto('https://www.linkedin.com/feed/', {
          waitUntil: 'domcontentloaded', // Don't wait for network idle
          timeout: 30000,
        });
      }

      // Wait for navigation to complete
      await page.waitForLoadState('domcontentloaded');

      // Check URL after navigation
      const finalUrl = page.url();
      console.log('Final URL:', finalUrl);

      // If we got redirected to login page, we're not logged in
      if (finalUrl.includes('/login') || finalUrl.includes('/signin')) {
        throw new Error('Got redirected to login page - authentication failed');
      }

      // Additional check for LinkedIn navigation elements
      try {
        await page.waitForSelector('nav', { timeout: 5000 });
        console.log('Found navigation element - login confirmed');
      } catch (e) {
        console.log('Warning: Could not find navigation, but URL suggests logged in');
      }

      console.log('✅ Login successful!');

      // Save cookies and localStorage
      console.log('💾 Saving session...');

      const cookies = await context.cookies();
      const localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      const sessionData = {
        cookies,
        localStorage,
        userAgent: context._options.userAgent,
        savedAt: new Date().toISOString(),
      };

      await fs.writeFile(SESSION_FILE, JSON.stringify(sessionData, null, 2));
      console.log(`✅ Session saved to ${SESSION_FILE}`);

      // Add to .gitignore if not already there
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      try {
        const gitignore = await fs.readFile(gitignorePath, 'utf-8');
        if (!gitignore.includes('.linkedin-session')) {
          await fs.appendFile(gitignorePath, '\n# LinkedIn session data\n.linkedin-session/\n');
          console.log('✅ Added .linkedin-session to .gitignore');
        }
      } catch (error) {
        // .gitignore might not exist
      }

      console.log('\n🎉 LinkedIn authentication setup complete!');
      console.log('   Your job search agent can now use your LinkedIn session.');
      console.log('\n⚠️  Note: You may need to re-authenticate if:');
      console.log('   - LinkedIn logs you out due to inactivity');
      console.log('   - You log out manually from another device');
      console.log('   - LinkedIn detects unusual activity\n');
    } catch (error) {
      console.error('\n❌ Login verification failed!');
      console.error('   Please make sure you completed the login process.');
      throw error;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('\n❌ Authentication setup failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
