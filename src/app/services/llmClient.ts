/**
 * Lightweight LLM client for our AI Navigator
 * No longer depends on Stagehand's LLMClient interface
 */

import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
} from 'openai/resources';

export interface LLMResponse<T = string> {
  data: T;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMOptions {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  schema?: any;
}

export class LLMClient {
  private client: OpenAI;
  private modelName: string;
  private logger?: (message: string, data?: any) => void;

  constructor(options: {
    modelName: string;
    client: OpenAI;
    logger?: (message: string, data?: any) => void;
  }) {
    this.client = options.client;
    this.modelName = options.modelName;
    this.logger = options.logger;
  }

  async createCompletion<T = string>(options: LLMOptions): Promise<LLMResponse<T>> {
    if (this.logger) {
      this.logger('LLM Request', {
        model: this.modelName,
        messages: options.messages,
        temperature: options.temperature,
        expectsJSON: options.responseFormat === 'json',
      });
    }

    // Handle response format for JSON schema
    let responseFormat = undefined;
    if (options.responseFormat === 'json') {
      responseFormat = {
        type: 'json_object' as const,
      };
    }

    try {
      const response = (await this.client.chat.completions.create({
        model: this.modelName,
        messages: options.messages,
        response_format: responseFormat,
        stream: false,
        temperature: options.temperature || 0.7,
      } as ChatCompletionCreateParams)) as ChatCompletion;

      if (this.logger) {
        this.logger('LLM Response', {
          model: this.modelName,
          usage: response.usage,
          responseLength: response.choices?.[0]?.message?.content?.length || 0,
          responseSample: response.choices?.[0]?.message?.content?.substring(0, 500),
        });
      }

      if (!response.choices || !response.choices.length || !response.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI API');
      }

      const content = response.choices[0].message.content || '';

      // Handle JSON response format
      if (options.responseFormat === 'json') {
        let parsedData;
        try {
          parsedData = JSON.parse(content);
        } catch (e) {
          console.error('Failed to parse JSON response:', content);
          throw new Error('Invalid JSON in response');
        }

        return {
          data: parsedData as T,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens ?? 0,
            completion_tokens: response.usage?.completion_tokens ?? 0,
            total_tokens: response.usage?.total_tokens ?? 0,
          },
        };
      }

      // Return text response
      return {
        data: content as T,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens ?? 0,
          completion_tokens: response.usage?.completion_tokens ?? 0,
          total_tokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
      if (this.logger) {
        this.logger('LLM Error', { error });
      }
      throw error;
    }
  }
}