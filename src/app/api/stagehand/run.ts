"use server";

/**
 * This is the server-side entry point for Stagehand integration.
 * It follows the approach from stagehand-nextjs-quickstart.
 */

// Note: We can't export runtime here because this is a "use server" file
// We'll add the runtime configuration to route.ts instead

import { Stagehand } from "@browserbasehq/stagehand";
import OpenAI from "openai";
import { z } from "zod";
import {
  ollamaConfig,
  stagehandEnv,
  awsConfig,
} from "@/app/config/environment";
import { searchLinkedInJobs } from "./main";
import { JobSearchParams } from "@/app/types/general-types";
import { OllamaClient } from "@/app/services/ollamaClient";
import {
  StagehandConfig,
  StagehandEnvironment,
} from "@/app/types/stagehand-types";

// Create a Stagehand configuration based on environment settings
const createStagehandConfig = (sessionId?: string): StagehandConfig => {
  // Base configuration
  const config: StagehandConfig = {
    env: stagehandEnv.environment as StagehandEnvironment,
    verbose: 1,
    localBrowserLaunchOptions: {
      headless: false,
      viewport: {
        width: 1280,
        height: 800,
      },
    },
    sessionId,
  };

  // Add additional configuration for LOCAL environment (Ollama)
  if (stagehandEnv.environment === "LOCAL") {
    // Create OpenAI client for Ollama
    const openaiClient = new OpenAI({
      apiKey: "ollama", // Placeholder for Ollama
      baseURL: `http://${ollamaConfig.host}:${ollamaConfig.port}/v1`,
    });

    // Create our custom LLMClient adapter
    const llmClient = new OllamaClient({
      modelName: ollamaConfig.modelName,
      client: openaiClient,
    });

    // Add LLM client to config
    return {
      ...config,
      llmClient: llmClient,
    };
  }

  // TODO: For AWS environment (future implementation)
  if (stagehandEnv.environment === "AWS") {
    // Note: We'll need to map Stagehand's expected configuration to AWS
    // This is a stub for future implementation
    return {
      ...config,
      // Stagehand expects "LOCAL" or "BROWSERBASE" - we use LOCAL for now
      // In the future, we can implement a AWS-specific adapter
      env: "LOCAL",
      awsConfig: {
        region: awsConfig.region,
        credentials: awsConfig.credentials,
      },
    };
  }

  return config;
};

// Run Stagehand with the provided configuration
export async function runStagehand(
  params: JobSearchParams,
  sessionId?: string
) {
  console.log("Starting LinkedIn job search with params:", params);

  let stagehand = null;

  try {
    // Get the configuration
    const config = createStagehandConfig(sessionId);

    // Log config without circular references
    const safeConfig: Partial<StagehandConfig> & {
      hasLLMClient: boolean;
      llmClientType?: string;
      llmClientModel?: string;
      hasAwsConfig?: boolean;
    } = {
      env: config.env,
      verbose: config.verbose,
      localBrowserLaunchOptions: config.localBrowserLaunchOptions,
      sessionId: config.sessionId,
      hasAwsConfig: !!config.awsConfig,
      hasLLMClient: !!config.llmClient,
      llmClientType: config.llmClient?.type,
      llmClientModel: config.llmClient?.modelName,
    };

    console.log("Using configuration:", JSON.stringify(safeConfig, null, 2));

    // Create the Stagehand instance - this is where the worker path error occurs
    console.log("Creating Stagehand instance...");

    // TODO: Customize StagehandConfig to match your needs
    // Stagehand only accepts "LOCAL" or "BROWSERBASE" for env,
    // so make sure we're using a compatible value
    const stagehandCompatibleConfig = {
      ...config,
      env: "LOCAL" as const, // Override to ensure Stagehand accepts our config
    };
    stagehand = new Stagehand(stagehandCompatibleConfig);

    // Initialize the browser
    console.log("Initializing browser...");
    await stagehand.init();
    console.log("Stagehand initialized successfully");

    // Run the main function
    console.log("Starting main function with LinkedIn search");
    const jobs = await searchLinkedInJobs({
      stagehand,
      page: stagehand.page,
      context: stagehand.context,
      params,
    });

    // Close the browser when finished
    if (stagehand) {
      await stagehand.close();
    }

    // Return the results
    return {
      success: true,
      jobs,
    };
  } catch (error) {
    console.error("Error running Stagehand:", error);

    // Ensure the browser is closed on error
    if (stagehand) {
      try {
        await stagehand.close();
      } catch (closeError) {
        console.error("Error closing Stagehand:", closeError);
      }
    }

    // Return the error
    return {
      success: false,
      jobs: [],
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

// Get the current configuration for client-side use
export async function getConfig() {
  return {
    environment: stagehandEnv.environment,
    useMock: stagehandEnv.useMock,
    ollamaHost: ollamaConfig.host,
    ollamaPort: ollamaConfig.port,
    ollamaModel: ollamaConfig.modelName,
    hasAwsCredentials: awsConfig.enabled,
    awsRegion: awsConfig.region,
  };
}
