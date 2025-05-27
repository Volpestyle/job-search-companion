/**
 * Authentication Flow Manager
 * Handles the interactive authentication process with frontend communication
 */

import { Page } from '@browserbasehq/stagehand';
import { BrowserContext } from 'playwright';
import { SessionManager } from './session-manager';
import { LogLevel } from '@/app/utils/logger';

export interface AuthState {
  status: 'checking' | 'required' | 'in-progress' | 'completed' | 'failed';
  message: string;
  boardName: string;
  details?: {
    loginUrl?: string;
    authType?: string; // 'email-password' | 'oauth' | 'unknown'
    availableActions?: string[];
  };
}

// Define clear patterns for auth detection
const AUTH_INDICATORS = [
  'login',
  'log in',
  'sign in',
  'signin',
  'authenticate',
  'email field',
  'password field',
  'username field',
  'create account',
  'register',
  'sign up',
  'continue with google',
  'join now',
  'forgot password',
];

export class AuthFlowManager {
  private sessionManager: SessionManager;
  private logger?: any;
  private page: Page;

  constructor(page: Page, context: BrowserContext, logger?: any) {
    this.page = page;
    this.sessionManager = new SessionManager(context, { logger });
    this.logger = logger;
  }

  /**
   * Check authentication status and handle if needed
   */
  async checkAndHandleAuth({
    boardName,
    boardUrl,
    onAuthStateChange,
  }: {
    boardName: string;
    boardUrl: string;
    onAuthStateChange?: (state: AuthState) => void;
  }): Promise<boolean> {
    // Notify checking status
    this.updateAuthState(onAuthStateChange, {
      status: 'checking',
      message: `Checking authentication for ${boardName}...`,
      boardName,
    });

    // Try to load saved session
    const hasSession = await this.sessionManager.loadSession(boardUrl);
    if (hasSession) {
      this.log(LogLevel.INFO, `Loaded saved session for ${boardName}`);
    }

    // Navigate to the board
    await this.page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');

    // Use Stagehand's observe to detect authentication state
    const authRequired = await this.detectAuthRequired();

    if (!authRequired) {
      this.updateAuthState(onAuthStateChange, {
        status: 'completed',
        message: `Already authenticated with ${boardName}`,
        boardName,
      });
      return true;
    }

    // Auth is required
    this.log(LogLevel.INFO, `Authentication required for ${boardName}`);

    // Analyze the auth page
    // const authDetails = await this.analyzeAuthPage();

    // this.updateAuthState(onAuthStateChange, {
    //   status: 'required',
    //   message: `Please log in to ${boardName} in the browser window`,
    //   boardName,
    //   details: authDetails,
    // });

    // Wait for user to complete authentication
    const authenticated = await this.waitForAuthentication(boardName, onAuthStateChange);

    if (authenticated) {
      // Save the session
      await this.sessionManager.saveSession(boardUrl);

      this.updateAuthState(onAuthStateChange, {
        status: 'completed',
        message: `Successfully authenticated with ${boardName}`,
        boardName,
      });
      return true;
    } else {
      this.updateAuthState(onAuthStateChange, {
        status: 'failed',
        message: `Authentication failed or timed out for ${boardName}`,
        boardName,
      });
      return false;
    }
  }

  /**
   * Use Stagehand's observe to detect if authentication is required
   */
  private async detectAuthRequired(): Promise<boolean> {
    try {
      // Get focused observations for auth detection
      const authObservations = await this.page.observe({
        instruction: `Find all login, sign in, sign up, or authentication related buttons and forms on this page. Include the full text of each element.`,
      });

      let authRelatedElements = 0;
      const matchedElements: string[] = [];

      authObservations.forEach((obs) => {
        const desc = obs.description.toLowerCase();
        // Also check arguments array if it exists
        const args = (obs as any).arguments || [];
        const argsText = args.join(' ').toLowerCase();
        const combinedText = `${desc} ${argsText}`;

        let isAuthElement = false;

        // Check if any auth indicator matches this element
        for (const indicator of AUTH_INDICATORS) {
          if (combinedText.includes(indicator)) {
            isAuthElement = true;
            matchedElements.push(
              `"${obs.description}" (matched: "${indicator}"${argsText ? ` in args: "${args.join(', ')}"` : ''})`
            );
            break; // Don't double-count same element
          }
        }

        if (isAuthElement) {
          authRelatedElements++;
        }
      });

      this.log(LogLevel.DEBUG, 'Auth detection', {
        authRelatedElements,
        observations: authObservations.map((o) => o.description),
        matchedElements,
      });

      return authRelatedElements > 0;
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to detect auth state', { error });
      // Conservative fallback: assume auth is needed if we can't detect properly
      return true;
    }
  }

  /**
   * Analyze the authentication page to provide helpful details
   */
  private async analyzeAuthPage(): Promise<AuthState['details']> {
    try {
      const observations = await this.page.observe({
        instruction:
          'Identify all authentication options on this page, including email/password forms, social login buttons (Google, Facebook, LinkedIn, etc.), and any other login methods.',
      });

      const availableActions = observations.map((obs: { description: string }) => obs.description);

      // Determine auth type
      let authType: string = 'unknown';
      const hasEmailPassword = availableActions.some((action: string) => {
        const lower = action.toLowerCase();
        return (
          (lower.includes('email') || lower.includes('username')) && lower.includes('password')
        );
      });

      const hasOAuth = availableActions.some((action: string) => {
        const lower = action.toLowerCase();
        return (
          lower.includes('google') ||
          lower.includes('facebook') ||
          lower.includes('linkedin') ||
          lower.includes('microsoft') ||
          lower.includes('continue with')
        );
      });

      if (hasEmailPassword && hasOAuth) {
        authType = 'unknown'; // Multiple options
      } else if (hasEmailPassword) {
        authType = 'email-password';
      } else if (hasOAuth) {
        authType = 'oauth';
      }

      return {
        loginUrl: this.page.url(),
        authType,
        availableActions: availableActions.slice(0, 5), // Limit to 5 most relevant
      };
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to analyze auth page', { error });
      return {
        loginUrl: this.page.url(),
        authType: 'unknown',
      };
    }
  }

  /**
   * Wait for authentication to complete using observe
   */
  private async waitForAuthentication(
    boardName: string,
    onAuthStateChange?: (state: AuthState) => void
  ): Promise<boolean> {
    const timeout = 300000; // 5 minutes
    const checkInterval = 3000; // Check every 3 seconds
    const startTime = Date.now();

    this.updateAuthState(onAuthStateChange, {
      status: 'in-progress',
      message: `Waiting for you to complete authentication with ${boardName}...`,
      boardName,
    });

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(checkInterval);

      try {
        // Reuse the same detection logic that already works!
        const stillNeedsAuth = await this.detectAuthRequired();

        if (!stillNeedsAuth) {
          this.log(LogLevel.INFO, `Authentication completed for ${boardName}`);
          return true;
        }

        this.log(LogLevel.DEBUG, `Still waiting for authentication completion for ${boardName}`);
      } catch (error) {
        this.log(LogLevel.DEBUG, 'Error checking auth state, continuing to wait', { error });
        // Continue checking - don't fail on temporary errors
      }
    }

    this.log(LogLevel.ERROR, `Authentication timeout for ${boardName} after ${timeout / 1000}s`);
    return false;
  }

  private updateAuthState(
    onAuthStateChange: ((state: AuthState) => void) | undefined,
    state: AuthState
  ): void {
    if (onAuthStateChange) {
      onAuthStateChange(state);
    }
    this.log(LogLevel.INFO, `Auth state: ${state.status}`, { state });
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console.log(`[AuthFlowManager:${level}] ${message}`, data || '');
    }
  }
}
