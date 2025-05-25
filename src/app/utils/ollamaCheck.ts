/**
 * Utilities for checking Ollama connectivity and providing helpful error messages
 */

export interface OllamaCheckResult {
  isAvailable: boolean;
  error?: string;
  suggestion?: string;
  details?: {
    host: string;
    port: number;
    model: string;
  };
}

export async function checkOllamaConnection(
  host: string,
  port: number,
  model: string
): Promise<OllamaCheckResult> {
  const baseUrl = `http://${host}:${port}`;

  try {
    // First check if Ollama is running
    const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!tagsResponse.ok) {
      return {
        isAvailable: false,
        error: 'Ollama server responded but returned an error',
        suggestion: `Ensure Ollama is properly installed and running at ${baseUrl}`,
        details: { host, port, model },
      };
    }

    const tags = await tagsResponse.json();
    const availableModels = tags.models?.map((m: any) => m.name) || [];

    // Check if the required model is available
    const modelExists = availableModels.some(
      (m: string) => m === model || m.startsWith(`${model}:`)
    );

    if (!modelExists) {
      return {
        isAvailable: false,
        error: `Model '${model}' not found in Ollama`,
        suggestion: `Pull the model with: ollama pull ${model}\n\nAvailable models: ${availableModels.join(', ') || 'none'}`,
        details: { host, port, model },
      };
    }

    // Test the model with a simple completion
    const testResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'test' }],
        temperature: 0.1,
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!testResponse.ok) {
      return {
        isAvailable: false,
        error: 'Ollama model test failed',
        suggestion: `Model '${model}' exists but failed to respond. Try restarting Ollama.`,
        details: { host, port, model },
      };
    }

    return {
      isAvailable: true,
      details: { host, port, model },
    };
  } catch (error) {
    // Handle different error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isAvailable: false,
          error: 'Connection timeout',
          suggestion: `Ollama at ${baseUrl} is not responding. Check if:\n1. Ollama is running: ollama serve\n2. The host/port are correct in .env.local`,
          details: { host, port, model },
        };
      }

      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        return {
          isAvailable: false,
          error: 'Cannot connect to Ollama',
          suggestion: `Ollama is not running at ${baseUrl}.\n\nTo fix:\n1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh\n2. Start Ollama: ollama serve\n3. Pull the model: ollama pull ${model}`,
          details: { host, port, model },
        };
      }
    }

    return {
      isAvailable: false,
      error: 'Unknown error checking Ollama',
      suggestion: 'Check the console for more details',
      details: { host, port, model },
    };
  }
}

export function formatOllamaError(result: OllamaCheckResult): string {
  if (result.isAvailable) return '';

  let message = `❌ Ollama Error: ${result.error}\n\n`;

  if (result.suggestion) {
    message += `💡 How to fix:\n${result.suggestion}\n\n`;
  }

  if (result.details) {
    message += `📋 Configuration:\n`;
    message += `Host: ${result.details.host}\n`;
    message += `Port: ${result.details.port}\n`;
    message += `Model: ${result.details.model}\n`;
  }

  return message;
}
