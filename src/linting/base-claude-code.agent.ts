import { query, type SDKMessage, type Options } from '@anthropic-ai/claude-code';
import { logger } from '../logger.js';

export interface ClaudeCodeAgentConfig {
  apiKey?: string;
  model?: string;
  maxTurns?: number;
}

/**
 * Base class for Claude Code SDK agents
 * Provides common functionality for code-aware AI agents
 */
export abstract class BaseClaudeCodeAgent {
  protected config: ClaudeCodeAgentConfig;
  protected abortController: AbortController;

  constructor(config: ClaudeCodeAgentConfig) {
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      model: config.model || 'claude-3-opus-20240229',
      maxTurns: config.maxTurns || 3
    };
    this.abortController = new AbortController();
  }

  /**
   * Execute a Claude Code query with the given prompt
   */
  protected async executeQuery(prompt: string): Promise<SDKMessage[]> {
    const messages: SDKMessage[] = [];
    
    try {
      const options: Options = {
        maxTurns: this.config.maxTurns,
        model: this.config.model,
        customSystemPrompt: this.getSystemPrompt()
      };

      // Set API key as environment variable for Claude Code SDK
      if (this.config.apiKey) {
        process.env.ANTHROPIC_API_KEY = this.config.apiKey;
      }

      for await (const message of query({ 
        prompt, 
        abortController: this.abortController,
        options 
      })) {
        messages.push(message);
        
        // Log progress
        if (message.type === 'assistant' && message.message.content) {
          const contentStr = message.message.content
            .filter(c => c.type === 'text')
            .map(c => (c as any).text)
            .join(' ');
          
          logger.debug('Claude Code response', { 
            content: contentStr.substring(0, 100) + '...' 
          });
        }
      }
      
      return messages;
    } catch (error) {
      logger.error('Claude Code query failed', { error, prompt });
      throw error;
    }
  }

  /**
   * Parse JSON response from Claude Code messages
   */
  protected parseJsonResponse<T>(messages: SDKMessage[]): T | null {
    for (const message of messages) {
      if (message.type === 'assistant' && message.message.content) {
        const textContent = message.message.content
          .filter(c => c.type === 'text')
          .map(c => (c as any).text)
          .join('\n');

        try {
          // Try to extract JSON from the response
          const jsonMatch = textContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T;
          }
        } catch (error) {
          logger.error('Failed to parse JSON response', { error });
        }
      }
    }
    return null;
  }

  /**
   * Get the system prompt for this agent
   * Override in subclasses to provide agent-specific prompts
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Abort any ongoing queries
   */
  public abort(): void {
    this.abortController.abort();
  }
}