/**
 * Custom LLMClient implementation for Ollama
 * Based on Stagehand's LLMClient interface
 */

import { AvailableModel, CreateChatCompletionOptions, LLMClient } from '@browserbasehq/stagehand';
import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionChunk,
} from 'openai/resources';
import { Stream } from 'openai/streaming';

/**
 * This client adapts the OpenAI client to work with Stagehand's LLMClient interface
 * specifically for connecting to Ollama
 */
interface OllamaClientOptions {
  modelName: string;
  client: OpenAI;
  logger?: (message: string, data?: any) => void;
}

export class OllamaClient extends LLMClient {
  public type = 'openai' as const;
  private client: OpenAI;
  private customLogger?: (message: string, data?: any) => void;

  constructor({ modelName, client, logger }: OllamaClientOptions) {
    super(modelName as AvailableModel);
    this.client = client;
    this.modelName = modelName as AvailableModel;
    this.customLogger = logger;
  }

  async createChatCompletion<T = ChatCompletion>({
    options,
    retries = 3,
    logger,
  }: CreateChatCompletionOptions): Promise<T> {
    if (!options) {
      throw new Error('Options must be provided for chat completion');
    }

    const { requestId, ...optionsWithoutRequestId } = options;

    // Log to file if custom logger provided
    if (this.customLogger) {
      this.customLogger('LLM Request', {
        model: this.modelName,
        messages: options.messages,
        temperature: options.temperature,
        response_model: !!options.response_model,
      });
    }

    logger({
      category: 'openai',
      message: 'creating chat completion',
      level: 1,
      auxiliary: {
        options: {
          value: JSON.stringify({
            ...optionsWithoutRequestId,
            requestId,
          }),
          type: 'object',
        },
        modelName: {
          value: this.modelName,
          type: 'string',
        },
      },
    });

    // Handle response format for schema
    let responseFormat = undefined;
    if (options.response_model) {
      responseFormat = {
        type: 'json_object' as const,
      };
    }

    // Remove unsupported options
    const { response_model, ...openaiOptions } = {
      ...optionsWithoutRequestId,
      model: this.modelName,
    };

    try {
      // Make the request to the OpenAI client
      const response = (await this.client.chat.completions.create({
        ...openaiOptions,
        model: this.modelName,
        response_format: responseFormat,
        stream: false,
        temperature: options.temperature || 0.7,
      } as ChatCompletionCreateParams)) as ChatCompletion;

      // Log response to file if custom logger provided
      if (this.customLogger) {
        this.customLogger('LLM Response', {
          model: this.modelName,
          usage: response.usage,
          responseLength: response.choices?.[0]?.message?.content?.length || 0,
          // Only log first 500 chars of response to avoid huge logs
          responseSample: response.choices?.[0]?.message?.content?.substring(0, 500),
        });
      }

      logger({
        category: 'openai',
        message: 'response',
        level: 1,
        auxiliary: {
          response: {
            value: JSON.stringify(response),
            type: 'object',
          },
          requestId: {
            value: requestId || '',
            type: 'string',
          },
        },
      });

      if (options.response_model) {
        // Check if response and choices exist
        if (!response || !response.choices || !response.choices.length) {
          throw new Error('Invalid response structure from OpenAI API');
        }

        const extractedData = response.choices[0]?.message?.content;
        if (!extractedData) {
          throw new Error('No content in response');
        }

        let parsedData;
        try {
          parsedData = JSON.parse(extractedData);
        } catch (e) {
          console.error('Failed to parse JSON response:', extractedData);
          throw new Error('Invalid JSON in response');
        }

        // Return model data response
        return {
          data: parsedData,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            completion_tokens: response.usage?.completion_tokens ?? 0,
            total_tokens: response.usage?.total_tokens ?? 0,
          },
        } as T;
      }

      // Return text response
      if (!response.choices || !response.choices.length || !response.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI API');
      }

      return {
        data: response.choices[0].message.content || '',
        usage: {
          prompt_tokens: response.usage?.prompt_tokens ?? 0,
          completion_tokens: response.usage?.completion_tokens ?? 0,
          total_tokens: response.usage?.total_tokens ?? 0,
        },
      } as T;
    } catch (error) {
      console.error('Error in OpenAI API call:', error);

      if (retries > 0) {
        console.log(`Retrying... (${retries} retries left)`);
        return this.createChatCompletion({
          options,
          logger,
          retries: retries - 1,
        });
      }

      throw error;
    }
  }
}
