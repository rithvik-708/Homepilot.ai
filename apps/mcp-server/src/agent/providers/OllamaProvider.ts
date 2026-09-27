import { Message } from '@aws-sdk/client-bedrock-runtime';
import { MCP_TOOLS } from '../../schemas/tools.js';

export class OllamaProvider {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/api/chat',
    model: string = process.env.OLLAMA_MODEL || 'llama3.1'
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  private getOllamaTools() {
    return MCP_TOOLS.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  public async invoke(messages: any[]): Promise<Message | undefined> {
    const formattedMessages = messages.map((m) => {
      let content = '';
      if (typeof m.content === 'string') {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        content = m.content
          .map((c: any) => {
            if (c.text) return c.text;
            if (c.toolResult) return JSON.stringify(c.toolResult.content);
            if (c.toolUse) return `[Call Tool: ${c.toolUse.name}]`;
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }

      return {
        role: m.role || 'user',
        content,
      };
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        tools: this.getOllamaTools(),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama connection failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const msg = data.message;

    // Map Ollama tool_calls response to Bedrock Message format
    const contentBlocks: any[] = [];
    if (msg?.content) {
      contentBlocks.push({ text: msg.content });
    }
    if (msg?.tool_calls && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        contentBlocks.push({
          toolUse: {
            toolUseId: `call_${Math.random().toString(36).slice(2, 9)}`,
            name: tc.function.name,
            input: tc.function.arguments,
          },
        });
      }
    }

    return {
      role: 'assistant',
      content: contentBlocks,
    };
  }
}
