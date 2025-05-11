/**
 * Types for Stagehand integration
 */
import { LLMClient } from '@browserbasehq/stagehand';

/**
 * Stagehand environment types
 */
export type StagehandEnvironment = 'LOCAL' | 'AWS';

/**
 * Configuration object for Stagehand
 * Based on the ConstructorParams interface from @browserbasehq/stagehand
 */
export interface StagehandConfig {
  /**
   * The environment to use for Stagehand
   */
  env: StagehandEnvironment;

  /**
   * The verbosity of the Stagehand logger
   * 0 - No logs
   * 1 - Only errors
   * 2 - All logs
   */
  verbose?: 0 | 1 | 2;

  /**
   * The timeout to use for the DOM to settle
   * @default 10000
   */
  domSettleTimeoutMs?: number;

  /**
   * The parameters to use for launching a local browser
   */
  localBrowserLaunchOptions?: {
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
  };

  /**
   * The LLM client to use for Stagehand
   */
  llmClient?: LLMClient;

  /**
   * Session ID for AWS environment (future implementation)
   */
  sessionId?: string;

  /**
   * AWS credentials for cloud-based browser sessions (future implementation)
   */
  awsConfig?: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
}
