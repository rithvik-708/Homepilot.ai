import { Message } from '@aws-sdk/client-bedrock-runtime';
import { AgentProvider } from './AgentProvider.js';
import { MCP_TOOLS } from '../../schemas/tools.js';

export class NIMProvider implements AgentProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor() {
    const base = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    this.baseUrl = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    this.model = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.2-90b-vision-instruct';
    
    if (!process.env.NVIDIA_NIM_API_KEY) {
      throw new Error('NVIDIA_NIM_API_KEY is required when AI_PROVIDER=nim');
    }
    this.apiKey = process.env.NVIDIA_NIM_API_KEY;
  }

  private getNIMTools() {
    return MCP_TOOLS.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  public async invoke(messages: Message[]): Promise<Message | undefined> {
    const formattedMessages: any[] = [];

    for (const m of messages) {
      let role = m.role === 'user' ? 'user' : 'assistant';

      if (typeof m.content === 'string') {
        formattedMessages.push({ role, content: m.content });
      } else if (Array.isArray(m.content)) {
        const toolResultBlocks = m.content.filter((c: any) => c.toolResult);
        if (toolResultBlocks.length > 0) {
          // OpenAI expects each tool result as a separate message with role "tool"
          for (const block of toolResultBlocks) {
            const tr = block.toolResult;
            if (!tr) continue;
            let resContent = '';
            if (Array.isArray(tr.content) && tr.content.length > 0) {
              resContent = tr.content[0].text || JSON.stringify(tr.content[0].json);
            } else if (typeof tr.content === 'string') {
              resContent = tr.content;
            } else {
              resContent = JSON.stringify(tr.content);
            }

            formattedMessages.push({
              role: 'tool',
              tool_call_id: tr.toolUseId,
              content: resContent || "success"
            });
          }
        } else {
          // Normal message or tool use
          const texts = m.content.filter(c => c.text).map(c => c.text);
          let contentStr = texts.join('\n');
          
          const toolUses = m.content.filter(c => c.toolUse);
          let tool_calls: any[] | undefined = undefined;
          
          if (toolUses.length > 0) {
            tool_calls = toolUses.map(c => ({
              id: c.toolUse!.toolUseId,
              type: 'function',
              function: {
                name: c.toolUse!.name,
                arguments: typeof c.toolUse!.input === 'string' ? c.toolUse!.input : JSON.stringify(c.toolUse!.input)
              }
            }));
          }

          const msgObj: any = { role };
          // OpenAI API accepts empty content if tool_calls is provided
          if (contentStr || !tool_calls) {
            msgObj.content = contentStr;
          }
          if (tool_calls) {
            msgObj.tool_calls = tool_calls;
          }
          
          formattedMessages.push(msgObj);
        }
      }
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        tools: this.getNIMTools(),
        temperature: 0.4,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
        let errText = '';
        try { errText = await response.text(); } catch(e){}
        throw new Error(`NVIDIA NIM connection failed: ${response.status} ${response.statusText} ${errText}`);
    }

    const data = (await response.json()) as any;
    const msg = data.choices?.[0]?.message;

    if (!msg) return undefined;

    const contentBlocks: any[] = [];
    if (msg.content) {
      contentBlocks.push({ text: msg.content });
    }
    
    if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        let inputObj = {};
        try {
          inputObj = JSON.parse(tc.function.arguments);
        } catch (e) {
          console.warn("Failed to parse tool arguments from NIM", tc.function.arguments);
        }
        contentBlocks.push({
          toolUse: {
            toolUseId: tc.id || `call_${Math.random().toString(36).slice(2, 9)}`,
            name: tc.function.name,
            input: inputObj,
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
